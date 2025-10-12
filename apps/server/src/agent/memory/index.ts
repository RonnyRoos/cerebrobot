/**
 * Memory Module Entry Point
 *
 * Provides factory function for creating memory store instances.
 */

import { PrismaClient } from '@prisma/client';
import type { BaseStore } from '@cerebrobot/chat-shared';
import { loadMemoryConfig, type MemoryConfig } from './config.js';
import { PostgresMemoryStore } from './store.js';
import type { Logger } from 'pino';

/**
 * No-op store implementation for when memory is disabled
 */
class NoOpStore implements BaseStore {
  async put(): Promise<void> {
    // No-op
  }

  async get(): Promise<null> {
    return null;
  }

  async search(): Promise<[]> {
    return [];
  }

  async delete(): Promise<void> {
    // No-op
  }

  async list(): Promise<[]> {
    return [];
  }
}

/**
 * Create a memory store instance
 *
 * @param logger - Pino logger instance
 * @param configOverride - Optional agent-specific memory config (overrides env vars)
 * @param prisma - Prisma client instance (optional, will create new if not provided)
 * @returns BaseStore implementation (no-op if memory disabled)
 */
export function createMemoryStore(
  logger: Logger,
  configOverride?: Partial<MemoryConfig>,
  prisma?: PrismaClient,
): BaseStore {
  // Load base config from env, then apply agent-specific overrides
  let config: MemoryConfig;
  try {
    config = loadMemoryConfig();
    if (configOverride) {
      config = { ...config, ...configOverride };
    }
  } catch (error) {
    // If env config fails and we have a full override, use it
    if (configOverride && isFullMemoryConfig(configOverride)) {
      config = configOverride as MemoryConfig;
    } else {
      logger.warn({ error }, 'Memory system disabled due to configuration error');
      return new NoOpStore();
    }
  }

  if (!config.enabled) {
    logger.info('Memory system disabled via configuration');
    return new NoOpStore();
  }

  const prismaClient = prisma ?? new PrismaClient();
  logger.info(
    {
      embeddingModel: config.embeddingModel,
      similarityThreshold: config.similarityThreshold,
      contentMaxTokens: config.contentMaxTokens,
    },
    'Memory system initialized',
  );

  return new PostgresMemoryStore(prismaClient, config, logger);
}

/**
 * Check if config override contains all required fields
 */
function isFullMemoryConfig(config: Partial<MemoryConfig>): boolean {
  return !!(config.apiKey && config.embeddingEndpoint && config.embeddingModel);
}

// Re-export public interfaces and utilities
export { loadMemoryConfig, type MemoryConfig } from './config.js';
export { generateEmbedding } from './embeddings.js';
export { PostgresMemoryStore } from './store.js';
export type { BaseStore } from '@cerebrobot/chat-shared';
