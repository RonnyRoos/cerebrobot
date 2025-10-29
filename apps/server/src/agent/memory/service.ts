/**
 * Memory Service
 *
 * Business logic layer for memory operations including capacity management,
 * duplicate detection, and stats aggregation.
 */

import type { Logger } from 'pino';
import type { PrismaClient } from '@prisma/client';
import type { BaseStore } from '@cerebrobot/chat-shared';
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
   * Check if adding a new memory would exceed capacity
   *
   * @param namespace - Memory namespace
   * @returns True if within capacity, false if at limit
   */
  async canAddMemory(namespace: string[]): Promise<boolean> {
    const capacity = await this.checkCapacity(namespace);
    return !capacity.atCapacity;
  }
}
