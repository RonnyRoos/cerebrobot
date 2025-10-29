/**
 * Memory Service
 *
 * Business logic layer for memory operations including capacity management,
 * duplicate detection, and stats aggregation.
 */

import type { Logger } from 'pino';
import type { PrismaClient } from '@prisma/client';
import type { BaseStore, MemoryEntry, MemorySearchResult } from '@cerebrobot/chat-shared';
import type { MemoryConfig as InfraMemoryConfig } from '../../config.js';

export interface MemoryCapacityCheck {
  /** Current number of memories */
  readonly count: number;

  /** Maximum allowed */
  readonly maxMemories: number;

  /** Percentage used (0-1) */
  readonly capacityPercent: number;

  /** Warning threshold (0-1) */
  readonly warningThreshold: number;

  /** Whether at or above warning threshold */
  readonly showWarning: boolean;

  /** Whether at capacity limit */
  readonly atCapacity: boolean;
}

export class MemoryService {
  constructor(
    private readonly store: BaseStore,
    private readonly prisma: PrismaClient,
    private readonly config: InfraMemoryConfig,
    private readonly logger: Logger,
  ) {}

  /**
   * Check memory capacity for a given namespace
   *
   * @param namespace - Memory namespace to check
   * @returns Capacity information
   */
  async checkCapacity(namespace: string[]): Promise<MemoryCapacityCheck> {
    try {
      // Get current count from store
      const keys = await this.store.list(namespace);
      const count = keys.length;

      const maxMemories = this.config.maxPerUser;
      const warningThreshold = this.config.capacityWarnPercent;
      const capacityPercent = count / maxMemories;

      const showWarning = capacityPercent >= warningThreshold;
      const atCapacity = count >= maxMemories;

      this.logger.debug(
        {
          namespace,
          count,
          maxMemories,
          capacityPercent,
          showWarning,
          atCapacity,
        },
        'Memory capacity check completed',
      );

      return {
        count,
        maxMemories,
        capacityPercent,
        warningThreshold,
        showWarning,
        atCapacity,
      };
    } catch (error) {
      this.logger.error({ error, namespace }, 'Failed to check memory capacity');
      throw new Error(
        `Failed to check memory capacity: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Check if a memory can be added without exceeding capacity
   *
   * @param namespace - Memory namespace
   * @returns True if memory can be added, false if at capacity
   */
  async canAddMemory(namespace: string[]): Promise<boolean> {
    const capacity = await this.checkCapacity(namespace);
    return !capacity.atCapacity;
  }

  /**
   * List memories in a namespace with pagination
   *
   * @param namespace - Memory namespace
   * @param offset - Pagination offset (default: 0)
   * @param limit - Page size (default: 20, max: 100)
   * @returns Paginated memory list with total count
   */
  async listMemories(
    namespace: string[],
    offset: number = 0,
    limit: number = 20,
  ): Promise<{ memories: MemoryEntry[]; total: number }> {
    try {
      // Count total memories in namespace using $queryRaw (namespace is text[] in Postgres)
      const countResult = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM memories
        WHERE namespace = ${namespace}
      `;
      const total = Number(countResult[0].count);

      // Query memories with pagination (newest first)
      const records = await this.prisma.$queryRaw<
        Array<{
          id: string;
          namespace: string[];
          key: string;
          content: string;
          metadata: unknown;
          created_at: Date;
          updated_at: Date;
        }>
      >`
        SELECT id, namespace, key, content, metadata, created_at, updated_at
        FROM memories
        WHERE namespace = ${namespace}
        ORDER BY created_at DESC
        LIMIT ${Math.min(limit, 100)}
        OFFSET ${offset}
      `;

      const memories: MemoryEntry[] = records.map((record) => ({
        id: record.id,
        namespace: record.namespace,
        key: record.key,
        content: record.content,
        metadata: (record.metadata as Record<string, unknown>) ?? undefined,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
        // Embedding is optional in MemoryEntry schema
      }));

      this.logger.debug(
        { namespace, offset, limit, total, returnedCount: memories.length },
        'Listed memories with pagination',
      );

      return { memories, total };
    } catch (error) {
      this.logger.error({ error, namespace, offset, limit }, 'Failed to list memories');
      throw new Error(
        `Failed to list memories: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Search memories by semantic similarity
   *
   * @param namespace - Memory namespace
   * @param query - Natural language search query
   * @param offset - Pagination offset (default: 0)
   * @param limit - Page size (default: 20, max: 100)
   * @param threshold - Minimum similarity threshold (default: 0.7)
   * @returns Search results with similarity scores
   */
  async searchMemories(
    namespace: string[],
    query: string,
    offset: number = 0,
    limit: number = 20,
    threshold: number = 0.7,
  ): Promise<{ results: MemorySearchResult[]; total: number }> {
    try {
      const effectiveLimit = Math.min(limit, 100);

      this.logger.debug(
        { namespace, query: query.substring(0, 100), offset, limit: effectiveLimit, threshold },
        'Searching memories with semantic similarity',
      );

      // Use store's search method (returns all results above threshold)
      const allResults = await this.store.search(namespace, query, {
        threshold,
      });

      const total = allResults.length;

      // Apply pagination to results
      const paginatedResults = allResults.slice(offset, offset + effectiveLimit);

      this.logger.info(
        {
          namespace,
          query: query.substring(0, 100),
          total,
          returnedCount: paginatedResults.length,
          offset,
          limit: effectiveLimit,
          topSimilarities: paginatedResults.slice(0, 3).map((r) => r.similarity.toFixed(3)),
        },
        'Memory search completed',
      );

      return { results: paginatedResults, total };
    } catch (error) {
      this.logger.error({ error, namespace, query, offset, limit }, 'Failed to search memories');
      throw new Error(
        `Failed to search memories: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Update an existing memory's content
   * Implementation: User Story 3 (T040)
   *
   * @param memoryId - UUID of the memory to update
   * @param newContent - New content text
   * @returns Updated memory entry
   */
  async updateMemory(memoryId: string, newContent: string): Promise<MemoryEntry> {
    try {
      this.logger.debug({ memoryId, contentLength: newContent.length }, 'Updating memory');

      // Fetch current memory from Prisma (to get namespace and validate existence)
      const existingMemory = await this.prisma.memory.findUnique({
        where: { id: memoryId },
      });

      if (!existingMemory) {
        this.logger.warn({ memoryId }, 'Memory not found for update');
        throw new Error(`Memory ${memoryId} not found`);
      }

      const namespace = existingMemory.namespace;
      const key = existingMemory.key;

      // Create updated memory entry with new content
      // The store will handle embedding regeneration and timestamp updates
      const updatedEntry: MemoryEntry = {
        id: existingMemory.id,
        namespace,
        key,
        content: newContent,
        createdAt: existingMemory.createdAt,
        updatedAt: new Date(),
        metadata: existingMemory.metadata
          ? (existingMemory.metadata as Record<string, unknown>)
          : undefined,
      };

      // Update in store (which handles embedding regeneration)
      await this.store.put(namespace, key, updatedEntry);

      // Fetch updated memory from store to get new embedding
      const result = await this.store.get(namespace, key);

      if (!result) {
        throw new Error('Failed to retrieve updated memory from store');
      }

      this.logger.info(
        { memoryId, namespace, key, contentLength: newContent.length },
        'Memory updated successfully',
      );

      return result;
    } catch (error) {
      this.logger.error({ error, memoryId }, 'Failed to update memory');
      throw new Error(
        `Failed to update memory: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Create a new memory manually
   * Implementation: User Story 4 (T059)
   *
   * @param namespace - Memory namespace ['memories', agentId, userId]
   * @param key - Unique key for the memory (UUID)
   * @param memoryEntry - Memory entry to create
   * @returns Created memory entry with embedding
   */
  async createMemory(
    namespace: string[],
    key: string,
    memoryEntry: MemoryEntry,
  ): Promise<MemoryEntry> {
    try {
      this.logger.debug(
        { namespace, key, contentLength: memoryEntry.content.length },
        'Creating new memory',
      );

      // Store memory (which handles embedding generation)
      await this.store.put(namespace, key, memoryEntry);

      // Retrieve created memory from store to get embedding
      const result = await this.store.get(namespace, key);

      if (!result) {
        throw new Error('Failed to retrieve created memory from store');
      }

      this.logger.info(
        { memoryId: memoryEntry.id, namespace, key, contentLength: memoryEntry.content.length },
        'Memory created successfully',
      );

      return result;
    } catch (error) {
      this.logger.error({ error, namespace, key }, 'Failed to create memory');
      throw new Error(
        `Failed to create memory: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Delete a memory
   * Implementation: User Story 3 (T041)
   *
   * @param memoryId - UUID of the memory to delete
   * @returns Success confirmation
   */
  async deleteMemory(memoryId: string): Promise<void> {
    try {
      this.logger.debug({ memoryId }, 'Deleting memory');

      // Fetch memory from Prisma to get namespace/key
      const existingMemory = await this.prisma.memory.findUnique({
        where: { id: memoryId },
      });

      if (!existingMemory) {
        this.logger.warn({ memoryId }, 'Memory not found for deletion');
        throw new Error(`Memory ${memoryId} not found`);
      }

      const namespace = existingMemory.namespace;
      const key = existingMemory.key;

      // Delete from store
      await this.store.delete(namespace, key);

      this.logger.info({ memoryId, namespace, key }, 'Memory deleted successfully');
    } catch (error) {
      this.logger.error({ error, memoryId }, 'Failed to delete memory');
      throw new Error(
        `Failed to delete memory: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Find duplicate memories based on semantic similarity
   * Implementation: User Story 5 (T069)
   *
   * @param namespace - Memory namespace to search within
   * @param content - Content to check for duplicates
   * @param threshold - Similarity threshold (default: config.duplicateThreshold = 0.95)
   * @returns Array of duplicate memories with similarity scores
   */
  async findDuplicates(
    namespace: string[],
    content: string,
    threshold?: number,
  ): Promise<MemorySearchResult[]> {
    const effectiveThreshold = threshold ?? this.config.duplicateThreshold;

    try {
      this.logger.debug(
        { namespace, contentLength: content.length, threshold: effectiveThreshold },
        'Checking for duplicate memories',
      );

      // Use store's semantic search with high similarity threshold
      const duplicates = await this.store.search(namespace, content, {
        threshold: effectiveThreshold,
      });

      this.logger.info(
        {
          namespace,
          contentLength: content.length,
          threshold: effectiveThreshold,
          duplicatesFound: duplicates.length,
          topSimilarities: duplicates.slice(0, 3).map((d) => d.similarity.toFixed(3)),
        },
        duplicates.length > 0 ? 'Duplicate memories found' : 'No duplicates found',
      );

      return duplicates;
    } catch (error) {
      this.logger.error({ error, namespace, content, threshold }, 'Failed to find duplicates');
      throw new Error(
        `Failed to find duplicates: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
