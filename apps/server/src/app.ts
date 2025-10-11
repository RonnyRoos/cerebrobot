import fastify, { FastifyInstance } from 'fastify';
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

  registerAgentRoutes(app);
  registerThreadCreationRoutes(app, options.threadManager);
  registerUserRoutes(app, { logger });
  registerChatRoutes(app, {
    threadManager: options.threadManager,
    getAgent: options.getAgent,
    logger,
  });

  // Initialize ThreadService with checkpointer and Prisma
  const prisma = new PrismaClient();
  const threadService = createThreadService({
    checkpointer: options.checkpointer,
    prisma,
    logger: logger.child({ component: 'thread-service' }),
  });
  registerThreadRoutes(app, threadService);

  logger.info('fastify server initialized');

  return app;
}
