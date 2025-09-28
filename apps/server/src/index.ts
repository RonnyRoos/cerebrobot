import { config as loadEnv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pino from 'pino';
import { buildServer } from './app.js';
import { loadConfigFromEnv } from './config.js';
import { createLangGraphChatAgent } from './agent/langgraph-agent.js';
import { createSessionManager } from './session/session-manager.js';

export async function bootstrap(): Promise<void> {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const envCandidates = [
    resolve(currentDir, '../../../.env'), // repository root
    resolve(currentDir, '../../.env'), // apps/.env
    resolve(currentDir, '../.env'), // apps/server/.env
  ];

  for (const envPath of envCandidates) {
    loadEnv({ path: envPath, override: true });
  }

  const config = loadConfigFromEnv();
  const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });

  const chatAgent = createLangGraphChatAgent(config, logger.child({ component: 'chat-agent' }));
  const sessionManager = createSessionManager({
    chatAgent,
    logger: logger.child({ component: 'session-manager' }),
  });

  const server = buildServer({
    sessionManager,
    chatAgent,
    config,
    logger: logger.child({ component: 'fastify' }),
  });

  const port = config.port;
  const host = process.env.HOST ?? '0.0.0.0';

  const shutdown = async (signal: NodeJS.Signals) => {
    logger.info({ signal }, 'received shutdown signal');
    try {
      await server.close();
      logger.info('server closed gracefully');
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, 'error during shutdown');
      process.exit(1);
    }
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  try {
    await server.listen({ port, host });
    logger.info({ port, host }, 'server listening');
  } catch (error) {
    logger.error({ err: error }, 'failed to start server');
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  bootstrap().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Unhandled bootstrap error', error);
    process.exit(1);
  });
}
