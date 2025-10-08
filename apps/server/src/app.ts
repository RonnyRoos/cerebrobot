import fastify, { FastifyInstance } from 'fastify';
import pino, { type Logger } from 'pino';
import type { ChatAgent } from './chat/chat-agent.js';
import type { ServerConfig } from './config.js';
import type { SessionManager } from './session/session-manager.js';
import { registerSessionRoutes } from './session/routes.js';
import { registerChatRoutes } from './chat/routes.js';
import { registerUserRoutes } from './user/routes.js';

export interface BuildServerOptions {
  readonly sessionManager: SessionManager;
  readonly chatAgent: ChatAgent;
  readonly config: ServerConfig;
  readonly logger?: Logger;
}

export function buildServer(options: BuildServerOptions): FastifyInstance {
  const logger = options.logger ?? pino({ level: process.env.LOG_LEVEL ?? 'info' });
  const fastifyLogger = options.logger ? { level: options.logger.level ?? 'info' } : false;

  const app = fastify({
    logger: fastifyLogger,
  });

  registerSessionRoutes(app, options.sessionManager);
  registerUserRoutes(app, { logger });
  registerChatRoutes(app, {
    chatAgent: options.chatAgent,
    config: options.config,
    logger,
  });

  logger.info(
    {
      model: options.config.model,
      personaTag: options.config.personaTag,
      temperature: options.config.temperature,
      hotpathLimit: options.config.hotpathLimit,
    },
    'fastify server initialized',
  );

  return app;
}
