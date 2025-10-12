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

    registerAgentRoutes(fastifyInstance);
    registerThreadCreationRoutes(fastifyInstance, options.threadManager);
    registerUserRoutes(fastifyInstance, { logger });
    registerChatRoutes(fastifyInstance, {
      threadManager: options.threadManager,
      getAgent: options.getAgent,
      connectionManager,
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

  // Cleanup Prisma connection on server shutdown
  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });

  logger.info('fastify server initialized');

  return app;
}
