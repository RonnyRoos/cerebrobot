/**
 * Memory Service
 *
 * Business logic layer for memory operations including capacity management,
 * duplicate detection, and stats aggregation.
 */

import type { Logger } from 'pino';
import type { PrismaClient } from '@prisma/client';
import type { BaseStore, MemoryEntry } from '@cerebrobot/chat-shared';
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
}
