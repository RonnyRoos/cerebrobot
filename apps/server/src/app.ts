import fastify, { FastifyInstance } from 'fastify';
import websocket from '@fastify/websocket';
import pino, { type Logger } from 'pino';
import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import { PrismaClient } from '@prisma/client';
import type { ChatAgent } from './chat/chat-agent.js';
import type { ThreadManager } from './thread-manager/thread-manager.js';
import type { InfrastructureConfig } from './config.js';
import { registerThreadRoutes as registerThreadCreationRoutes } from './thread-manager/routes.js';
import { registerChatRoutes } from './chat/routes.js';
import { registerAgentRoutes } from './agent/routes.js';
import { registerUserRoutes } from './user/routes.js';
import { registerThreadRoutes } from './thread/routes.js';
import { registerMemoryRoutes } from './agent/memory/routes.js';
import { createThreadService } from './thread/service.js';
import { ConnectionManager } from './chat/connection-manager.js';
import { createMemoryStore } from './agent/memory/index.js';
import { MemoryService } from './agent/memory/service.js';
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

// Augment Fastify instance with eventQueue
declare module 'fastify' {
  interface FastifyInstance {
    eventQueue: EventQueue;
  }
}

export interface BuildServerOptions {
  readonly threadManager: ThreadManager;
  readonly getAgent: (agentId?: string) => Promise<ChatAgent>;
  readonly checkpointer: BaseCheckpointSaver;
  readonly infrastructureConfig: InfrastructureConfig;
  readonly logger?: Logger;
}

export function buildServer(options: BuildServerOptions): {
  server: FastifyInstance;
  eventQueue: EventQueue | null;
} {
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

    // Initialize Autonomy stores (spec 009)
    const { TimerStore } = await import('./autonomy/timers/TimerStore.js');
    const timerStore = new TimerStore(prisma);

    // Initialize PolicyGates if autonomy enabled (spec 009)
    let policyGates = null;
    if (process.env.AUTONOMY_ENABLED === 'true') {
      const { PolicyGates } = await import('./autonomy/session/PolicyGates.js');
      policyGates = new PolicyGates({
        maxConsecutive: parseInt(process.env.AUTONOMY_MAX_CONSECUTIVE ?? '3', 10),
        cooldownMs: parseInt(process.env.AUTONOMY_COOLDOWN_MS ?? '15000', 10),
      });
      logger.info('PolicyGates initialized');
    }

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
        // Increased timeout for autonomous messages with heavy memory retrieval
        // Autonomous messages can take >30s when loading many memories
        graphTimeoutMs: 60000, // 60 seconds
        debug: false,
      },
      logger.child({ component: 'session-processor' }),
      timerStore, // NEW (spec 009): TimerStore for clear-on-user-message
    );

    // Create EventQueue
    eventQueue = new EventQueue(parseInt(process.env.EVENT_QUEUE_PROCESS_INTERVAL_MS ?? '50', 10));

    // Attach eventQueue to fastify instance for access in index.ts (TimerWorker)
    fastifyInstance.decorate('eventQueue', eventQueue);

    // Initialize TimerWorker if autonomy enabled (spec 009)
    if (process.env.AUTONOMY_ENABLED === 'true') {
      const { TimerWorker } = await import('./autonomy/timers/TimerWorker.js');
      const timerWorker = new TimerWorker(
        timerStore,
        eventStore,
        eventQueue,
        {
          pollIntervalMs: parseInt(process.env.TIMER_POLL_INTERVAL_MS ?? '5000', 10),
          batchSize: 10,
        },
        logger.child({ component: 'timer-worker' }),
      );
      timerWorker.start();
      logger.info('TimerWorker started');
    }

    // Create EffectRunner with delivery handler + TimerStore + PolicyGates (spec 009)
    effectRunner = new EffectRunner(
      outboxStore,
      {
        pollIntervalMs: parseInt(process.env.EFFECT_POLL_INTERVAL_MS ?? '500', 10),
        batchSize: 100,
        debug: false,
      },
      logger.child({ component: 'effect-runner' }),
      timerStore, // NEW: TimerStore for schedule_timer effects
      policyGates ?? undefined, // NEW: PolicyGates for autonomous message limits
      async (sessionKey) => {
        // NEW: Metadata loader for PolicyGates enforcement
        // Loads autonomy metadata from checkpoint (consecutiveAutonomousMessages, lastAutonomousAt)
        try {
          const { threadId } = parseSessionKey(sessionKey);
          const tuple = await options.checkpointer.getTuple({
            configurable: { thread_id: threadId },
          });

          if (!tuple?.metadata) {
            return { consecutiveAutonomousMessages: 0, lastAutonomousAt: null };
          }

          const metadata = tuple.metadata as Record<string, unknown>;
          return {
            consecutiveAutonomousMessages: (metadata.consecutiveAutonomousMessages as number) ?? 0,
            lastAutonomousAt: metadata.lastAutonomousAt
              ? new Date(metadata.lastAutonomousAt as string)
              : null,
          };
        } catch (error) {
          logger.warn(
            { sessionKey, error: error instanceof Error ? error.message : String(error) },
            'Failed to load autonomy metadata',
          );
          return null;
        }
      },
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

        // Only handle send_message effects in delivery handler
        if (effect.type !== 'send_message') {
          logger.warn(
            { effectId: effect.id, type: effect.type },
            'Unexpected effect type in delivery handler',
          );
          return false;
        }

        // Type guard - payload is now known to be SendMessagePayload
        const payload = effect.payload as { content: string; requestId: string; isFinal?: boolean };
        const { content, requestId, isFinal } = payload;
        const socket = connection.socket;

        if (isFinal) {
          // This is the final effect - send completion event
          // Calculate latency from effect creation timestamp
          const latencyMs = Date.now() - new Date(effect.created_at).getTime();

          socket.send(
            JSON.stringify({
              type: 'final',
              requestId,
              message: content,
              latencyMs,
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

    // Initialize memory infrastructure (Phase 2: Foundational)
    const memoryStore = createMemoryStore(
      logger.child({ component: 'memory-store' }),
      undefined,
      prisma,
    );
    const memoryService = new MemoryService(
      memoryStore,
      prisma,
      options.infrastructureConfig.memory,
      logger.child({ component: 'memory-service' }),
    );
    registerMemoryRoutes(fastifyInstance, {
      logger: logger.child({ component: 'memory-routes' }),
      memoryService,
    });

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

  return { server: app, eventQueue };
}
