import type { FastifyInstance, FastifyReply } from 'fastify';
import type { RawData, WebSocket } from 'ws';
import type { Logger } from 'pino';
import { randomUUID } from 'node:crypto';
import { ChatRequestSchema, ChatResponseSchema } from '@cerebrobot/chat-shared';
import type { ChatAgent, ChatInvocationContext, AgentStreamEvent } from './chat-agent.js';
import type { ThreadManager } from '../thread-manager/thread-manager.js';

const MAX_MESSAGE_BYTES = 1_048_576;
const CLOSE_CODE_DESCRIPTIONS: Record<number, string> = {
  1000: 'normal_closure',
  1001: 'going_away',
  1006: 'abnormal_closure',
  1011: 'internal_error',
};

interface RegisterChatRouteOptions {
  readonly threadManager: ThreadManager;
  readonly getAgent: (agentId?: string) => Promise<ChatAgent>;
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

  app.get('/api/chat/ws', { websocket: true }, (socket: WebSocket) => {
    const connectionId = randomUUID();
    const correlationId = randomUUID();

    options.logger?.info(
      {
        connectionId,
        correlationId,
      },
      'websocket_connection_established',
    );

    const handleMessage = async (rawData: RawData) => {
      try {
        const payload = normaliseRawData(rawData);
        const payloadSize = Buffer.byteLength(payload);

        options.logger?.debug(
          {
            connectionId,
            correlationId,
            payloadSize,
          },
          'websocket_message_received',
        );

        if (payloadSize > MAX_MESSAGE_BYTES) {
          throw new PayloadTooLargeError(payloadSize);
        }

        let rawPayload: unknown;
        try {
          rawPayload = JSON.parse(payload);
        } catch (parseError) {
          throw new ChatValidationError(
            'Invalid chat request payload',
            parseError instanceof Error ? parseError.message : parseError,
          );
        }

        const parseResult = ChatRequestSchema.safeParse(rawPayload);
        if (!parseResult.success) {
          throw new ChatValidationError(parseResult.error.message, parseResult.error.issues);
        }

        options.logger?.info(
          {
            connectionId,
            correlationId,
            threadId: parseResult.data.threadId,
            userId: parseResult.data.userId,
            messageLength: parseResult.data.message.length,
          },
          'websocket_chat_request_validated',
        );

        const thread = await options.threadManager.getThread(parseResult.data.threadId);
        if (!thread) {
          throw new ThreadNotFoundError(parseResult.data.threadId);
        }

        const agent = await options.getAgent(thread.agentId);
        const context: ChatInvocationContext = {
          threadId: parseResult.data.threadId,
          userId: parseResult.data.userId,
          message: parseResult.data.message,
          correlationId,
        };

        try {
          for await (const event of agent.streamChat(context)) {
            if (event.type === 'error') {
              sendWebsocketError(
                socket,
                event.message,
                event.retryable,
                event.retryable ? 1011 : 1000,
              );

              options.logger?.error(
                {
                  correlationId,
                  connectionId,
                  retryable: event.retryable,
                },
                'websocket_error',
              );
              return;
            }

            sendWebsocketEvent(socket, event, correlationId, connectionId, options.logger);
          }
        } catch (error) {
          throw new AgentStreamFailureError(error);
        }

        options.logger?.info(
          {
            correlationId,
            connectionId,
          },
          'websocket_stream_completed',
        );

        if (socket.readyState === socket.OPEN) {
          socket.close(1000, 'Stream complete');
        }
      } catch (error) {
        handleWebsocketError(socket, error, {
          logger: options.logger,
          correlationId,
          connectionId,
        });
      }
    };

    socket.once('message', (rawData: RawData) => {
      void handleMessage(rawData);
    });

    socket.on('error', (error: Error) => {
      options.logger?.error(
        {
          err: error,
          connectionId,
          correlationId,
        },
        'websocket_connection_error',
      );
    });

    socket.on('close', (code: number, reasonBuffer: Buffer) => {
      const interpreted = CLOSE_CODE_DESCRIPTIONS[code] ?? 'unknown';
      const reason =
        reasonBuffer instanceof Buffer && reasonBuffer.length > 0
          ? reasonBuffer.toString('utf8')
          : '';

      options.logger?.info(
        {
          connectionId,
          correlationId,
          closeCode: code,
          closeReason: interpreted,
          closeMessage: reason,
        },
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
  correlationId: string,
  connectionId: string,
  logger?: Logger,
): void {
  switch (event.type) {
    case 'token':
      socket.send(
        JSON.stringify({
          type: 'token',
          value: event.value,
        }),
      );
      // Token events logged at debug level to reduce noise
      logger?.debug(
        {
          correlationId,
          connectionId,
        },
        'websocket_token_sent',
      );
      break;
    case 'final':
      socket.send(
        JSON.stringify({
          type: 'final',
          message: event.message,
          latencyMs: event.latencyMs,
          tokenUsage: event.tokenUsage,
        }),
      );
      logger?.info(
        {
          correlationId,
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
  readonly correlationId: string;
  readonly connectionId: string;
}

function handleWebsocketError(
  socket: WebSocket,
  error: unknown,
  context: WebsocketErrorContext,
): void {
  const { logger, correlationId, connectionId } = context;

  if (error instanceof PayloadTooLargeError) {
    logger?.warn(
      {
        correlationId,
        connectionId,
        payloadSize: error.payloadSize,
        maxSize: MAX_MESSAGE_BYTES,
      },
      'websocket_payload_too_large',
    );
    sendWebsocketError(socket, error.message, false, 1000);
    return;
  }

  if (error instanceof ChatValidationError) {
    logger?.warn(
      {
        correlationId,
        connectionId,
        issues: error.issues,
      },
      'websocket_validation_failed',
    );
    sendWebsocketError(socket, error.message, false, 1000);
    return;
  }

  if (error instanceof ThreadNotFoundError) {
    logger?.warn(
      {
        correlationId,
        connectionId,
        threadId: error.threadId,
      },
      'websocket_thread_not_found',
    );
    sendWebsocketError(socket, error.message, false, 1000);
    return;
  }

  if (error instanceof AgentStreamFailureError) {
    logger?.error(
      {
        correlationId,
        connectionId,
        err: error.cause,
      },
      'websocket_agent_stream_failed',
    );
    sendWebsocketError(socket, error.message, true, 1011);
    return;
  }

  const message = error instanceof Error ? error.message : 'Unexpected server error';
  logger?.error(
    {
      correlationId,
      connectionId,
      err: error,
    },
    'websocket_unexpected_error',
  );
  sendWebsocketError(socket, message, true, 1011);
}

function sendWebsocketError(
  socket: WebSocket,
  message: string,
  retryable: boolean,
  closeCode: number,
): void {
  if (socket.readyState === socket.OPEN) {
    socket.send(
      JSON.stringify({
        type: 'error',
        message,
        retryable,
      }),
    );
  }

  if (socket.readyState === socket.OPEN || socket.readyState === socket.CLOSING) {
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
