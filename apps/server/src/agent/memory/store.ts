/**
 * Memory Store Implementation
 *
 * PostgreSQL-backed implementation of BaseStore interface using Prisma and pgvector.
 */

import { Prisma, PrismaClient } from '@prisma/client';
import type {
  BaseStore,
  MemoryEntry,
  MemorySearchResult,
  StoreSearchOptions,
} from '@cerebrobot/chat-shared';
import { generateEmbedding } from './embeddings.js';
import type { MemoryConfig } from './config.js';
import type { Logger } from 'pino';

export class PostgresMemoryStore implements BaseStore {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly config: MemoryConfig,
    private readonly logger: Logger,
  ) {}

  async put(namespace: string[], key: string, value: MemoryEntry): Promise<void> {
    try {
      const embedding = await generateEmbedding(value.content, this.config);

      if (!embedding) {
        this.logger.error(
          { namespace, key },
          'Failed to generate embedding for memory, skipping storage',
        );
        return;
      }

      // Use raw SQL for upsert with vector embedding
      const embeddingString = `[${embedding.join(',')}]`;
      await this.prisma.$executeRaw`
        INSERT INTO memories (id, namespace, key, content, metadata, embedding, created_at, updated_at)
        VALUES (
          ${value.id}::uuid,
          ${namespace}::text[],
          ${key},
          ${value.content},
          ${JSON.stringify(value.metadata ?? {})}::jsonb,
          ${embeddingString}::vector,
          NOW(),
          NOW()
        )
        ON CONFLICT (namespace, key) DO UPDATE SET
          content = EXCLUDED.content,
          metadata = EXCLUDED.metadata,
          embedding = EXCLUDED.embedding,
          updated_at = NOW()
      `;

      this.logger.info({ namespace, key, memoryId: value.id }, 'Memory stored successfully');
    } catch (error) {
      this.logger.error({ error, namespace, key }, 'Failed to store memory');
      // If embedding generation failed, skip storage gracefully
      if (error instanceof Error && error.message.includes('Embedding')) {
        return;
      }
      throw error;
    }
  }

  async get(namespace: string[], key: string): Promise<MemoryEntry | null> {
    try {
      const result = await this.prisma.$queryRaw<
        Array<{
          id: string;
          namespace: string[];
          key: string;
          content: string;
          metadata: unknown;
          embedding: number[];
          created_at: Date;
          updated_at: Date;
        }>
      >`
        SELECT id, namespace, key, content, metadata, embedding, created_at, updated_at
        FROM memories
        WHERE namespace = ${namespace} AND key = ${key}
      `;

      if (result.length === 0) {
        this.logger.debug({ namespace, key }, 'Memory not found');
        return null;
      }

      const memory = result[0];
      return {
        id: memory.id,
        namespace: memory.namespace,
        key: memory.key,
        content: memory.content,
        metadata: (memory.metadata as Record<string, unknown>) ?? undefined,
        embedding: memory.embedding,
        createdAt: memory.created_at,
        updatedAt: memory.updated_at,
      };
    } catch (error) {
      this.logger.error({ error, namespace, key }, 'Failed to retrieve memory');
      throw error;
    }
  }

  async search(
    namespace: string[],
    query: string,
    options?: StoreSearchOptions,
  ): Promise<MemorySearchResult[]> {
    const threshold = options?.threshold ?? this.config.similarityThreshold;
    const limit = options?.limit;

    try {
      this.logger.debug(
        { namespace, query: query.substring(0, 100) },
        'Generating query embedding for search',
      );

      const queryEmbedding = await generateEmbedding(query, this.config);

      if (!queryEmbedding) {
        this.logger.error({ namespace, query }, 'Failed to generate query embedding');
        return [];
      }

      this.logger.debug(
        { namespace, embeddingDimensions: queryEmbedding.length },
        'Query embedding generated successfully',
      );

      // pgvector cosine similarity search: <=> operator
      // Note: Prisma doesn't support pgvector operators in its query builder,
      // but $queryRaw with tagged templates supports mixing parameterized values with raw SQL
      const embeddingString = `[${queryEmbedding.join(',')}]`;

      this.logger.debug(
        {
          namespace,
          query: query.substring(0, 100),
          embeddingDimensions: queryEmbedding.length,
          threshold,
          limit,
        },
        'Executing memory search with parameters',
      );

      // Use $queryRaw with tagged template for proper parameterization
      // This ensures namespace array is correctly converted to PostgreSQL array format
      const results = await this.prisma.$queryRaw<
        Array<{
          id: string;
          namespace: string[];
          key: string;
          content: string;
          metadata: unknown;
          created_at: Date;
          updated_at: Date;
          similarity: number;
        }>
      >`
        SELECT 
          id,
          namespace,
          key,
          content,
          metadata,
          created_at,
          updated_at,
          1 - (embedding <=> ${embeddingString}::vector) AS similarity
        FROM memories
        WHERE namespace = ${namespace}::text[]
          AND 1 - (embedding <=> ${embeddingString}::vector) >= ${threshold}
        ORDER BY embedding <=> ${embeddingString}::vector
        ${limit ? Prisma.sql`LIMIT ${limit}` : Prisma.empty}
      `;

      this.logger.info(
        {
          namespace,
          query: query.substring(0, 100),
          resultCount: results.length,
          threshold,
          topSimilarities: results.slice(0, 3).map((r) => ({
            content: r.content.substring(0, 50),
            similarity: r.similarity.toFixed(3),
          })),
        },
        'Memory search completed',
      );

      return results.map((row) => ({
        id: row.id,
        namespace: row.namespace,
        key: row.key,
        content: row.content,
        metadata: (row.metadata as Record<string, unknown>) ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        similarity: row.similarity,
      }));
    } catch (error) {
      this.logger.error({ error, namespace, query }, 'Memory search failed');
      return [];
    }
  }

  async delete(namespace: string[], key: string): Promise<void> {
    try {
      await this.prisma.memory.delete({
        where: {
          namespace_key: {
            namespace,
            key,
          },
        },
      });

      this.logger.info({ namespace, key }, 'Memory deleted successfully');
    } catch (error) {
      this.logger.error({ error, namespace, key }, 'Failed to delete memory');
      throw error;
    }
  }

  async list(namespace: string[]): Promise<string[]> {
    try {
      const memories = await this.prisma.$queryRaw<Array<{ key: string }>>`
        SELECT key
        FROM memories
        WHERE namespace = ${namespace}
      `;

      this.logger.debug({ namespace, count: memories.length }, 'Listed memory keys');

      return memories.map((m) => m.key);
    } catch (error) {
      this.logger.error({ error, namespace }, 'Failed to list memories');
      throw error;
    }
  }
}
