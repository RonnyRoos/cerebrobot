/**
 * MemoryService Unit Tests
 *
 * Tests capacity checking logic with mocked store and config.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { BaseStore } from '@cerebrobot/chat-shared';
import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'pino';
import { MemoryService } from '../service.js';
import type { MemoryConfig } from '../../../config.js';

describe('MemoryService', () => {
  let service: MemoryService;
  let mockStore: BaseStore;
  let mockPrisma: PrismaClient;
  let mockLogger: Logger;
  let mockConfig: MemoryConfig;

  beforeEach(() => {
    // Mock BaseStore
    mockStore = {
      put: vi.fn(),
      get: vi.fn(),
      search: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    };

    // Mock Prisma
    mockPrisma = {} as PrismaClient;

    // Mock Logger
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    // Mock config with Phase 1 settings
    mockConfig = {
      maxPerUser: 1000,
      duplicateThreshold: 0.95,
      capacityWarnPercent: 0.8,
    };

    service = new MemoryService(mockStore, mockPrisma, mockConfig, mockLogger);
  });

  describe('checkCapacity', () => {
    it('should return capacity info with no memories', async () => {
      vi.mocked(mockStore.list).mockResolvedValue([]);

      const result = await service.checkCapacity(['memories', 'agent1', 'user1']);

      expect(result).toEqual({
        count: 0,
        maxMemories: 1000,
        capacityPercent: 0,
        warningThreshold: 0.8,
        showWarning: false,
        atCapacity: false,
      });
    });

    it('should return capacity info below warning threshold', async () => {
      // 500 memories = 50% capacity (below 80% warning)
      const keys = Array.from({ length: 500 }, (_, i) => `key${i}`);
      vi.mocked(mockStore.list).mockResolvedValue(keys);

      const result = await service.checkCapacity(['memories', 'agent1', 'user1']);

      expect(result).toEqual({
        count: 500,
        maxMemories: 1000,
        capacityPercent: 0.5,
        warningThreshold: 0.8,
        showWarning: false,
        atCapacity: false,
      });
    });

    it('should show warning at 80% capacity', async () => {
      // 800 memories = 80% capacity (at warning threshold)
      const keys = Array.from({ length: 800 }, (_, i) => `key${i}`);
      vi.mocked(mockStore.list).mockResolvedValue(keys);

      const result = await service.checkCapacity(['memories', 'agent1', 'user1']);

      expect(result).toEqual({
        count: 800,
        maxMemories: 1000,
        capacityPercent: 0.8,
        warningThreshold: 0.8,
        showWarning: true,
        atCapacity: false,
      });
    });

    it('should show warning above 80% capacity', async () => {
      // 900 memories = 90% capacity (above warning threshold)
      const keys = Array.from({ length: 900 }, (_, i) => `key${i}`);
      vi.mocked(mockStore.list).mockResolvedValue(keys);

      const result = await service.checkCapacity(['memories', 'agent1', 'user1']);

      expect(result).toEqual({
        count: 900,
        maxMemories: 1000,
        capacityPercent: 0.9,
        warningThreshold: 0.8,
        showWarning: true,
        atCapacity: false,
      });
    });

    it('should mark as at capacity when limit reached', async () => {
      // 1000 memories = 100% capacity (at limit)
      const keys = Array.from({ length: 1000 }, (_, i) => `key${i}`);
      vi.mocked(mockStore.list).mockResolvedValue(keys);

      const result = await service.checkCapacity(['memories', 'agent1', 'user1']);

      expect(result).toEqual({
        count: 1000,
        maxMemories: 1000,
        capacityPercent: 1.0,
        warningThreshold: 0.8,
        showWarning: true,
        atCapacity: true,
      });
    });

    it('should throw error if store.list fails', async () => {
      vi.mocked(mockStore.list).mockRejectedValue(new Error('Database error'));

      await expect(service.checkCapacity(['memories', 'agent1', 'user1'])).rejects.toThrow(
        'Failed to check memory capacity: Database error',
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Error),
          namespace: ['memories', 'agent1', 'user1'],
        }),
        'Failed to check memory capacity',
      );
    });
  });

  describe('canAddMemory', () => {
    it('should return true when below capacity', async () => {
      vi.mocked(mockStore.list).mockResolvedValue(Array.from({ length: 500 }, (_, i) => `key${i}`));

      const result = await service.canAddMemory(['memories', 'agent1', 'user1']);

      expect(result).toBe(true);
    });

    it('should return false when at capacity', async () => {
      vi.mocked(mockStore.list).mockResolvedValue(
        Array.from({ length: 1000 }, (_, i) => `key${i}`),
      );

      const result = await service.canAddMemory(['memories', 'agent1', 'user1']);

      expect(result).toBe(false);
    });

    it('should return false when over capacity', async () => {
      // Edge case: somehow went over limit
      vi.mocked(mockStore.list).mockResolvedValue(
        Array.from({ length: 1001 }, (_, i) => `key${i}`),
      );

      const result = await service.canAddMemory(['memories', 'agent1', 'user1']);

      expect(result).toBe(false);
    });
  });
});
