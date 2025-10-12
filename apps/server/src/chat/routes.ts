import type { FastifyInstance, FastifyReply } from 'fastify';
import type { RawData, WebSocket } from 'ws';
import type { Logger } from 'pino';
import { randomUUID } from 'node:crypto';
import {
  ChatRequestSchema,
  ChatResponseSchema,
  ClientMessageSchema,
  type ClientMessage,
  type ChatStreamCancelledEvent,
  WS_CLOSE_CODES,
  WS_CLOSE_CODE_DESCRIPTIONS,
} from '@cerebrobot/chat-shared';
import type { ChatAgent, ChatInvocationContext, AgentStreamEvent } from './chat-agent.js';
import type { ThreadManager } from '../thread-manager/thread-manager.js';
import { ConnectionManager } from './connection-manager.js';

const MAX_MESSAGE_BYTES = 1_048_576;

interface RegisterChatRouteOptions {
  readonly threadManager: ThreadManager;
  readonly getAgent: (agentId?: string) => Promise<ChatAgent>;
  readonly connectionManager: ConnectionManager;
  readonly logger?: Logger;
}

export function registerChatRoutes(app: FastifyInstance, options: RegisterChatRouteOptions): void {
  app.post('/api/chat', async (request, reply) => {
    const parseResult = ChatRequestSchema.safeParse(request.body);

    if (!parseResult.success) {
      options.logger?.warn(
        {
          route: '/api/chat',
          issues: parseResult.error.issues,
        },
        'invalid chat payload received',
      );
      return reply.status(400).send({
        error: 'Invalid chat request payload',
        details: parseResult.error.issues,
      });
    }

    const correlationId = randomUUID();
    const context: ChatInvocationContext = {
      threadId: parseResult.data.threadId,
      userId: parseResult.data.userId,
      message: parseResult.data.message,
      correlationId,
    };

    options.logger?.info(
      {
        correlationId,
        threadId: parseResult.data.threadId,
      },
      'chat request received (buffered)',
    );

    // Load thread metadata to get agentId
    const thread = await options.threadManager.getThread(parseResult.data.threadId);
    if (!thread) {
      options.logger?.warn({ threadId: parseResult.data.threadId }, 'Thread not found');
      return reply.status(404).send({
        error: 'Thread not found',
        details: `No thread exists with ID ${parseResult.data.threadId}`,
      });
    }

    // Lazy load agent on-demand using thread's agentId
    const agent = await options.getAgent(thread.agentId);

    return handleBufferedResponse(reply, agent, context, options.logger);
  });

  app.get('/api/chat/ws', { websocket: true }, (socket: WebSocket, request) => {
    // Extract threadId from query parameters
    const queryParams = new URL(request.url ?? '', 'http://localhost').searchParams;
    const threadId = queryParams.get('threadId');

    if (!threadId) {
      options.logger?.warn({ url: request.url }, 'WebSocket connection missing threadId');
      socket.close(WS_CLOSE_CODES.POLICY_VIOLATION, 'Missing threadId query parameter');
      return;
    }

    const connectionId = randomUUID();

    // Register connection with ConnectionManager
    options.connectionManager.register(connectionId, threadId, socket);

    options.logger?.info({ connectionId, threadId }, 'websocket_connection_established_persistent');

    /**
     * Handle cancellation request
     */
    const handleCancellation = (connectionId: string, requestId: string) => {
      const cancelled = options.connectionManager.abort(connectionId, requestId);

      if (cancelled) {
        // Send cancellation acknowledgment directly
        const cancelledEvent: ChatStreamCancelledEvent = {
          type: 'cancelled',
          requestId,
        };
        socket.send(JSON.stringify(cancelledEvent));
        options.logger?.info({ connectionId, requestId }, 'Request cancelled successfully');
      } else {
        // Race condition: request already completed or doesn't exist
        options.logger?.debug(
          { connectionId, requestId },
          'Cancellation requested but request already complete or not found',
        );
      }
    };

    /**
     * Handle incoming chat message
     */
    const handleChatMessage = async (connectionId: string, message: ClientMessage) => {
      if (message.type !== 'message') {
        return; // Only handle 'message' type here; 'cancel' handled separately
      }

      const { requestId, content, threadId: msgThreadId } = message;

      // Validate message threadId matches connection threadId
      if (msgThreadId !== threadId) {
        options.logger?.error(
          { connectionId, requestId, expectedThreadId: threadId, receivedThreadId: msgThreadId },
          'Thread ID mismatch',
        );
        socket.close(WS_CLOSE_CODES.POLICY_VIOLATION, 'Thread ID mismatch');
        return;
      }

      try {
        // Get thread metadata and validate
        const thread = await options.threadManager.getThread(threadId);
        if (!thread) {
          sendWebsocketError(
            socket,
            requestId,
            'Thread not found',
            false,
            WS_CLOSE_CODES.POLICY_VIOLATION,
          );
          return;
        }

        // Lazy load agent on-demand using thread's agentId
        const agent = await options.getAgent(thread.agentId);

        // TODO: Extract userId from somewhere (session, JWT, etc.)
        // For now, using a placeholder. This will be fixed in auth implementation.
        const userId = thread.userId ?? 'unknown-user';

        // Create AbortController for this request
        const abortController = new AbortController();

        // Register active request with ConnectionManager
        options.connectionManager.setActiveRequest(connectionId, requestId, abortController);

        const context: ChatInvocationContext = {
          threadId,
          userId,
          message: content,
          correlationId: randomUUID(), // Server-side correlation
          requestId, // Client-provided request ID
          signal: abortController.signal,
        };

        options.logger?.info(
          { connectionId, requestId, threadId, messageLength: content.length },
          'websocket_chat_message_processing',
        );

        try {
          for await (const event of agent.streamChat(context)) {
            // Check if aborted
            if (abortController.signal.aborted) {
              options.logger?.info({ connectionId, requestId }, 'Stream aborted');
              break;
            }

            if (event.type === 'error') {
              sendWebsocketError(
                socket,
                requestId,
                event.message,
                event.retryable,
                event.retryable ? WS_CLOSE_CODES.INTERNAL_ERROR : WS_CLOSE_CODES.NORMAL_CLOSURE,
              );
              options.logger?.error(
                { connectionId, requestId, retryable: event.retryable },
                'websocket_error',
              );
              return;
            }

            sendWebsocketEvent(socket, event, requestId, connectionId, options.logger);
          }

          options.logger?.info({ connectionId, requestId }, 'websocket_stream_completed');
        } catch (error) {
          // Check if error is due to abort
          if (error instanceof Error && error.name === 'AbortError') {
            options.logger?.info({ connectionId, requestId }, 'Stream cancelled by abort signal');
            // Don't send error event for cancellation - client already knows
            return;
          }

          throw error; // Re-throw other errors
        } finally {
          // Clear active request from ConnectionManager
          options.connectionManager.clearActiveRequest(connectionId);
        }
      } catch (error) {
        handleWebsocketError(socket, error, {
          logger: options.logger,
          connectionId,
          requestId,
        });
      }
    };

    /**
     * Message handler - routes based on message type
     */
    const handleMessage = async (rawData: RawData) => {
      try {
        const payload = normaliseRawData(rawData);
        const payloadSize = Buffer.byteLength(payload);

        if (payloadSize > MAX_MESSAGE_BYTES) {
          throw new PayloadTooLargeError(payloadSize);
        }

        let rawPayload: unknown;
        try {
          rawPayload = JSON.parse(payload);
        } catch (parseError) {
          throw new ChatValidationError(
            'Invalid message payload',
            parseError instanceof Error ? parseError.message : parseError,
          );
        }

        // Parse as ClientMessage (type: 'message' | 'cancel')
        const parseResult = ClientMessageSchema.safeParse(rawPayload);
        if (!parseResult.success) {
          throw new ChatValidationError(parseResult.error.message, parseResult.error.issues);
        }

        const clientMessage = parseResult.data;

        // Route based on message type
        if (clientMessage.type === 'message') {
          await handleChatMessage(connectionId, clientMessage);
        } else if (clientMessage.type === 'cancel') {
          handleCancellation(connectionId, clientMessage.requestId);
        }
      } catch (error) {
        handleWebsocketError(socket, error, {
          logger: options.logger,
          connectionId,
        });
      }
    };

    // Handle multiple messages over the persistent connection
    socket.on('message', (rawData: RawData) => {
      void handleMessage(rawData);
    });

    socket.on('error', (error: Error) => {
      options.logger?.error({ err: error, connectionId, threadId }, 'websocket_connection_error');
    });

    socket.on('close', (code: number, reasonBuffer: Buffer) => {
      const interpreted = WS_CLOSE_CODE_DESCRIPTIONS[code] ?? 'unknown';
      const reason =
        reasonBuffer instanceof Buffer && reasonBuffer.length > 0
          ? reasonBuffer.toString('utf8')
          : '';

      // Unregister connection from ConnectionManager
      options.connectionManager.unregister(connectionId);

      options.logger?.info(
        { connectionId, threadId, closeCode: code, closeReason: interpreted, closeMessage: reason },
        'websocket_connection_closed',
      );
    });
  });
}

async function handleBufferedResponse(
  reply: FastifyReply,
  agent: ChatAgent,
  context: ChatInvocationContext,
  logger?: Logger,
) {
  try {
    const result = await agent.completeChat(context);
    const metadata = result.tokenUsage ? { tokenUsage: result.tokenUsage } : undefined;
    const response = ChatResponseSchema.parse({
      threadId: context.threadId,
      correlationId: context.correlationId,
      message: result.message,
      latencyMs: result.latencyMs,
      streamed: false,
      metadata,
    });

    logger?.info(
      {
        threadId: context.threadId,
        correlationId: context.correlationId,
        streamed: false,
        latencyMs: response.latencyMs,
        tokenUsage: result.tokenUsage,
      },
      'chat response sent (buffered)',
    );

    return reply.status(200).send(response);
  } catch (error) {
    appLogError(reply, error);
    return reply.status(502).send({
      error: 'Chat agent failed to produce a response',
    });
  }
}

function appLogError(reply: FastifyReply, error: unknown): void {
  reply.log.error({ err: error }, 'chat agent failure');
}

function sendWebsocketEvent(
  socket: WebSocket,
  event: AgentStreamEvent,
  requestId: string,
  connectionId: string,
  logger?: Logger,
): void {
  switch (event.type) {
    case 'token':
      socket.send(
        JSON.stringify({
          type: 'token',
          requestId,
          value: event.value,
        }),
      );
      // Token events logged at debug level to reduce noise
      logger?.debug(
        {
          requestId,
          connectionId,
        },
        'websocket_token_sent',
      );
      break;
    case 'final':
      socket.send(
        JSON.stringify({
          type: 'final',
          requestId,
          message: event.message,
          latencyMs: event.latencyMs,
          tokenUsage: event.tokenUsage,
        }),
      );
      logger?.info(
        {
          requestId,
          connectionId,
          latencyMs: event.latencyMs,
          messageLength: event.message.length,
          tokenUsage: event.tokenUsage,
        },
        'websocket_final_sent',
      );
      break;
    case 'error':
      // Error events are handled elsewhere
      break;
  }
}

function normaliseRawData(rawData: RawData): string {
  if (typeof rawData === 'string') {
    return rawData;
  }

  if (Buffer.isBuffer(rawData)) {
    return rawData.toString('utf8');
  }

  // Array of Buffers
  if (Array.isArray(rawData)) {
    return Buffer.concat(rawData as unknown as Uint8Array[]).toString('utf8');
  }

  return '';
}

interface WebsocketErrorContext {
  readonly logger?: Logger;
  readonly connectionId: string;
  readonly requestId?: string; // Optional for thread-persistent connections
  readonly correlationId?: string; // Optional for backward compatibility
}

function handleWebsocketError(
  socket: WebSocket,
  error: unknown,
  context: WebsocketErrorContext,
): void {
  const { logger, connectionId, requestId, correlationId } = context;

  if (error instanceof PayloadTooLargeError) {
    logger?.warn(
      {
        correlationId,
        connectionId,
        requestId,
        payloadSize: error.payloadSize,
        maxSize: MAX_MESSAGE_BYTES,
      },
      'websocket_payload_too_large',
    );
    sendWebsocketError(socket, requestId, error.message, false, WS_CLOSE_CODES.NORMAL_CLOSURE);
    return;
  }

  if (error instanceof ChatValidationError) {
    logger?.warn(
      {
        correlationId,
        connectionId,
        requestId,
        issues: error.issues,
      },
      'websocket_validation_failed',
    );
    sendWebsocketError(socket, requestId, error.message, false, WS_CLOSE_CODES.NORMAL_CLOSURE);
    return;
  }

  if (error instanceof ThreadNotFoundError) {
    logger?.warn(
      {
        correlationId,
        connectionId,
        requestId,
        threadId: error.threadId,
      },
      'websocket_thread_not_found',
    );
    sendWebsocketError(socket, requestId, error.message, false, WS_CLOSE_CODES.NORMAL_CLOSURE);
    return;
  }

  if (error instanceof AgentStreamFailureError) {
    logger?.error(
      {
        correlationId,
        connectionId,
        requestId,
        err: error.cause,
      },
      'websocket_agent_stream_failed',
    );
    sendWebsocketError(socket, requestId, error.message, true, WS_CLOSE_CODES.INTERNAL_ERROR);
    return;
  }

  const message = error instanceof Error ? error.message : 'Unexpected server error';
  logger?.error(
    {
      correlationId,
      connectionId,
      requestId,
      err: error,
    },
    'websocket_unexpected_error',
  );
  sendWebsocketError(socket, requestId, message, true, WS_CLOSE_CODES.INTERNAL_ERROR);
}

function sendWebsocketError(
  socket: WebSocket,
  requestId: string | undefined,
  message: string,
  retryable: boolean,
  closeCode?: number,
): void {
  if (socket.readyState === socket.OPEN) {
    const errorEvent: Record<string, unknown> = {
      type: 'error',
      message,
      retryable,
    };

    // Include requestId if provided (thread-persistent connections)
    if (requestId) {
      errorEvent.requestId = requestId;
    }

    socket.send(JSON.stringify(errorEvent));
  }

  // Only close if closeCode provided (thread-persistent connections may not want to close)
  if (closeCode && (socket.readyState === socket.OPEN || socket.readyState === socket.CLOSING)) {
    socket.close(closeCode, retryable ? 'retryable_error' : 'non_retryable_error');
  }
}

class PayloadTooLargeError extends Error {
  constructor(readonly payloadSize: number) {
    super('Message exceeds maximum size of 1MB');
  }
}

class ChatValidationError extends Error {
  constructor(
    message: string,
    readonly issues?: unknown,
  ) {
    super(message);
  }
}

class ThreadNotFoundError extends Error {
  constructor(readonly threadId: string) {
    super(`Thread not found: ${threadId}`);
  }
}

class AgentStreamFailureError extends Error {
  constructor(readonly cause: unknown) {
    super(cause instanceof Error ? cause.message : 'Chat streaming failed');
  }
}
