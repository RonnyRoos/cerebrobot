import fastify, { FastifyInstance } from 'fastify';
import websocket from '@fastify/websocket';
import pino, { type Logger } from 'pino';
import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import { PrismaClient } from '@prisma/client';
import type { ChatAgent } from './chat/chat-agent.js';
import type { ThreadManager } from './thread-manager/thread-manager.js';
import { registerThreadRoutes as registerThreadCreationRoutes } from './thread-manager/routes.js';
import { registerChatRoutes } from './chat/routes.js';
import { registerAgentRoutes } from './agent/routes.js';
import { registerUserRoutes } from './user/routes.js';
import { registerThreadRoutes } from './thread/routes.js';
import { createThreadService } from './thread/service.js';
import { ConnectionManager } from './chat/connection-manager.js';
import {
  EventStore,
  OutboxStore,
  EventQueue,
  SessionProcessor,
  EffectRunner,
  parseSessionKey,
  type Effect,
  type Event as ChatEvent,
} from './events/index.js';

export interface BuildServerOptions {
  readonly threadManager: ThreadManager;
  readonly getAgent: (agentId?: string) => Promise<ChatAgent>;
  readonly checkpointer: BaseCheckpointSaver;
  readonly logger?: Logger;
}

export function buildServer(options: BuildServerOptions): FastifyInstance {
  const logger = options.logger ?? pino({ level: process.env.LOG_LEVEL ?? 'info' });
  const fastifyLogger = options.logger ? { level: options.logger.level ?? 'info' } : false;

  const app = fastify({
    logger: fastifyLogger,
  });

  // Initialize PrismaClient as singleton for the application lifecycle
  const prisma = new PrismaClient();

  // Store references to background workers for cleanup
  let eventQueue: EventQueue | null = null;
  let effectRunner: EffectRunner | null = null;

  // Register WebSocket plugin first
  app.register(websocket, {
    options: {
      maxPayload: 1_048_576,
    },
  });

  // Register routes after WebSocket plugin to ensure proper plugin ordering
  app.register(async (fastifyInstance) => {
    // Create ConnectionManager for thread-persistent WebSocket connections
    const connectionManager = new ConnectionManager(
      logger.child({ component: 'connection-manager' }),
    );

    // Initialize Events & Effects architecture (spec 008)
    const eventStore = new EventStore(prisma);
    const outboxStore = new OutboxStore(prisma);

    // Note: SessionProcessor needs a ChatAgent instance, but we have a factory
    // We'll create a wrapper that lazy-loads the default agent
    const getDefaultAgent = async () => options.getAgent();
    const defaultAgent = await getDefaultAgent();

    // Create SessionProcessor with access to ConnectionManager for direct streaming
    const sessionProcessor = new SessionProcessor(
      defaultAgent,
      outboxStore,
      connectionManager,
      {
        graphTimeoutMs: 30000,
        debug: false,
      },
      logger.child({ component: 'session-processor' }),
    );

    // Create EventQueue
    eventQueue = new EventQueue(parseInt(process.env.EVENT_QUEUE_PROCESS_INTERVAL_MS ?? '50', 10));

    // Create EffectRunner with delivery handler
    effectRunner = new EffectRunner(
      outboxStore,
      {
        pollIntervalMs: parseInt(process.env.EFFECT_POLL_INTERVAL_MS ?? '500', 10),
        batchSize: 100,
        debug: false,
      },
      logger.child({ component: 'effect-runner' }),
    );

    // Start EventQueue with SessionProcessor
    eventQueue.start(async (event: ChatEvent) => {
      await sessionProcessor.processEvent(event);
    });

    // Start EffectRunner with delivery handler
    effectRunner.start(async (effect: Effect) => {
      logger.info(
        { effectId: effect.id, sessionKey: effect.session_key },
        '🔥🔥🔥 DELIVERY HANDLER IN APP.TS CALLED 🔥🔥🔥',
      );

      try {
        // Parse SESSION_KEY to get threadId
        const { threadId } = parseSessionKey(effect.session_key);
        logger.info({ effectId: effect.id, threadId }, '✅ Parsed threadId');

        // Find active WebSocket connection for this thread
        const connectionIds = connectionManager.getConnectionsByThread(threadId);
        logger.info(
          { threadId, connectionIds, connectionCount: connectionIds.length },
          '✅ Connection lookup result',
        );

        if (connectionIds.length === 0) {
          logger.info(
            { sessionKey: effect.session_key, threadId },
            '❌ No active WebSocket for effect delivery',
          );
          return false;
        }

        // Get the most recent connection (last in array)
        const connectionId = connectionIds[connectionIds.length - 1];
        const connection = connectionManager.get(connectionId);
        if (!connection) {
          logger.info({ connectionId }, '❌ Connection not found in manager');
          return false;
        }

        logger.info({ effectId: effect.id, connectionId }, '✅ Got connection, about to send');

        const { content, requestId, isFinal } = effect.payload;
        const socket = connection.socket;

        if (isFinal) {
          // This is the final effect - send completion event
          socket.send(
            JSON.stringify({
              type: 'final',
              requestId,
              message: content,
              latencyMs: 0, // TODO: Calculate from timestamps
              tokenUsage: undefined,
            }),
          );
          logger.info({ effectId: effect.id, requestId }, '✅ Final effect delivered');
        } else {
          // Regular token effect
          socket.send(
            JSON.stringify({
              type: 'token',
              requestId,
              value: content,
            }),
          );
        }

        logger.info(
          { effectId: effect.id, sessionKey: effect.session_key, contentLength: content.length },
          '✅ Effect delivered successfully',
        );
        return true;
      } catch (error) {
        logger.error(
          { effectId: effect.id, sessionKey: effect.session_key, error },
          '❌ Failed to deliver effect',
        );
        return false;
      }
    });

    registerAgentRoutes(fastifyInstance);
    registerThreadCreationRoutes(fastifyInstance, options.threadManager);
    registerUserRoutes(fastifyInstance, { logger });
    registerChatRoutes(fastifyInstance, {
      threadManager: options.threadManager,
      getAgent: options.getAgent,
      connectionManager,
      eventStore,
      eventQueue,
      effectRunner,
      logger,
    });

    // Initialize ThreadService with checkpointer and singleton Prisma instance
    const threadService = createThreadService({
      checkpointer: options.checkpointer,
      prisma,
      logger: logger.child({ component: 'thread-service' }),
    });
    registerThreadRoutes(fastifyInstance, threadService);
  });

  // Cleanup Prisma connection and stop background workers on server shutdown
  app.addHook('onClose', async () => {
    logger.info('Shutting down background workers');
    eventQueue?.stop();
    effectRunner?.stop();
    await prisma.$disconnect();
  });

  logger.info('fastify server initialized');

  return app;
}
