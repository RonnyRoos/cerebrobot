import type { FastifyInstance, FastifyReply } from 'fastify';
import type { Logger } from 'pino';
import { randomUUID } from 'node:crypto';
import { ChatRequestSchema, ChatResponseSchema } from '@cerebrobot/chat-shared';
import type { ChatAgent, ChatInvocationContext, AgentStreamEvent } from './chat-agent.js';
import type { ServerConfig } from '../config.js';

interface RegisterChatRouteOptions {
  readonly chatAgent: ChatAgent;
  readonly config: ServerConfig;
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
      sessionId: parseResult.data.sessionId,
      message: parseResult.data.message,
      correlationId,
      config: options.config,
    };

    options.logger?.info(
      {
        correlationId,
        sessionId: parseResult.data.sessionId,
        accept: request.headers.accept,
      },
      'incoming chat request',
    );

    const wantsSSE = String(request.headers.accept || '')
      .split(',')
      .some((value) => value.includes('text/event-stream'));

    if (wantsSSE) {
      return handleSseResponse(reply, options.chatAgent, context, options.logger);
    }

    return handleBufferedResponse(reply, options.chatAgent, context, options.logger);
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
      sessionId: context.sessionId,
      correlationId: context.correlationId,
      message: result.message,
      latencyMs: result.latencyMs,
      streamed: false,
      metadata,
    });

    logger?.info(
      {
        sessionId: context.sessionId,
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

async function handleSseResponse(
  reply: FastifyReply,
  agent: ChatAgent,
  context: ChatInvocationContext,
  logger?: Logger,
) {
  reply.hijack();
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  try {
    for await (const event of agent.streamChat(context)) {
      writeSseEvent(reply.raw, event);
    }

    logger?.info(
      {
        sessionId: context.sessionId,
        correlationId: context.correlationId,
        streamed: true,
      },
      'chat response stream completed',
    );
  } catch (error) {
    writeSseEvent(reply.raw, {
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      retryable: false,
    });
    logger?.error({ err: error, correlationId: context.correlationId }, 'chat streaming failed');
  } finally {
    reply.raw.end();
  }
}

function writeSseEvent(response: FastifyReply['raw'], event: AgentStreamEvent): void {
  const payload = createSsePayload(event);
  response.write(`event: ${event.type}\ndata: ${JSON.stringify(payload)}\n\n`);
  if (typeof (response as unknown as { flush?: () => void }).flush === 'function') {
    (response as unknown as { flush: () => void }).flush();
  }
}

function createSsePayload(event: AgentStreamEvent) {
  switch (event.type) {
    case 'token':
      return { value: event.value };
    case 'final':
      return {
        message: event.message,
        latencyMs: event.latencyMs,
        tokenUsage: event.tokenUsage,
      };
    case 'error':
      return {
        message: event.message,
        retryable: event.retryable,
      };
    default:
      return event;
  }
}

function appLogError(reply: FastifyReply, error: unknown): void {
  reply.log.error({ err: error }, 'chat agent failure');
}
