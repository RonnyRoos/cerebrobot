import { config as loadEnv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pino from 'pino';
import { PrismaClient } from '@prisma/client';
import { buildServer } from './app.js';
import { loadInfrastructureConfig } from './config.js';
import { createAgentFactory } from './agent/agent-factory.js';
import { createThreadManager } from './thread-manager/thread-manager.js';
import { createCheckpointSaver } from './agent/checkpointer.js';
import { ConnectionManager } from './chat/connection-manager.js';

export async function bootstrap(): Promise<void> {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const envCandidates = [
    resolve(currentDir, '../../../.env'), // repository root
    resolve(currentDir, '../../.env'), // apps/.env
    resolve(currentDir, '../.env'), // apps/server/.env
  ];

  const originalEnvKeys = new Set(Object.keys(process.env));
  const fileDefinedKeys = new Set<string>();

  for (const envPath of envCandidates) {
    const result = loadEnv({ path: envPath, override: false });
    const parsed = result?.parsed;
    if (!parsed) {
      continue;
    }

    for (const [key, value] of Object.entries(parsed)) {
      if (originalEnvKeys.has(key) && !fileDefinedKeys.has(key)) {
        continue;
      }

      process.env[key] = value;
      fileDefinedKeys.add(key);
    }
  }

  const infrastructureConfig = loadInfrastructureConfig();
  const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });

  // Create shared Prisma client
  const prisma = new PrismaClient();

  // Create shared checkpointer instance (only needs persistence config)
  const checkpointer = createCheckpointSaver(infrastructureConfig);

  // Create ConnectionManager (needed by agent tools for WebSocket events)
  const connectionManager = new ConnectionManager(
    logger.child({ component: 'connection-manager' }),
  );

  // Create agent factory (lazy loading - agents loaded from database per Spec 011)
  const agentFactory = createAgentFactory({
    prisma,
    logger: logger.child({ component: 'agent-factory' }),
    checkpointer,
    connectionManager,
  });

  const threadManager = createThreadManager({
    prisma,
    getAgent: (agentId?: string) => agentFactory.getOrCreateAgent(agentId),
    logger: logger.child({ component: 'thread-manager' }),
  });

  const { server } = buildServer({
    threadManager,
    getAgent: (agentId?: string) => agentFactory.getOrCreateAgent(agentId),
    checkpointer,
    infrastructureConfig,
    connectionManager,
    logger: logger.child({ component: 'fastify' }),
  });

  const port = infrastructureConfig.port;
  const host = process.env.HOST ?? '0.0.0.0';

  const shutdown = async (signal: NodeJS.Signals) => {
    logger.info({ signal }, 'received shutdown signal');
    try {
      await server.close();
      await prisma.$disconnect();
      logger.info('server closed gracefully');
      process.exit(0);
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
        },
        'error during shutdown',
      );
      process.exit(1);
    }
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  try {
    await server.listen({ port, host });
    logger.info({ port, host }, 'server listening');
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      },
      'failed to start server',
    );
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
