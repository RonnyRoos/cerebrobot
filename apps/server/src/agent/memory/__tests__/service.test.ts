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

  describe('findDuplicates', () => {
    it('should find no duplicates when threshold not met', async () => {
      // Mock search returns empty array when no results meet threshold
      vi.mocked(mockStore.search).mockResolvedValue([]);

      const result = await service.findDuplicates(
        ['memories', 'agent1', 'user1'],
        'User enjoys pizza',
      );

      expect(result).toEqual([]);
      expect(mockStore.search).toHaveBeenCalledWith(
        ['memories', 'agent1', 'user1'],
        'User enjoys pizza',
        { threshold: 0.95 },
      );
    });

    it('should find duplicates at exactly 0.95 threshold', async () => {
      const duplicateMemory = {
        id: 'mem-1',
        namespace: ['memories', 'agent1', 'user1'],
        key: 'key-1',
        content: 'User likes pizza',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        similarity: 0.95, // At threshold
      };

      vi.mocked(mockStore.search).mockResolvedValue([duplicateMemory]);

      const result = await service.findDuplicates(
        ['memories', 'agent1', 'user1'],
        'User likes pizza',
      );

      expect(result).toEqual([duplicateMemory]);
      expect(result.length).toBe(1);
      expect(result[0].similarity).toBe(0.95);
    });

    it('should find duplicates above 0.95 threshold', async () => {
      const duplicateMemories = [
        {
          id: 'mem-1',
          namespace: ['memories', 'agent1', 'user1'],
          key: 'key-1',
          content: 'User likes pizza',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          similarity: 0.99,
        },
        {
          id: 'mem-2',
          namespace: ['memories', 'agent1', 'user1'],
          key: 'key-2',
          content: 'User enjoys pizza',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          similarity: 0.96,
        },
      ];

      vi.mocked(mockStore.search).mockResolvedValue(duplicateMemories);

      const result = await service.findDuplicates(
        ['memories', 'agent1', 'user1'],
        'User likes pizza',
      );

      expect(result).toEqual(duplicateMemories);
      expect(result.length).toBe(2);
      expect(result[0].similarity).toBeGreaterThanOrEqual(0.95);
    });

    it('should use custom threshold when provided', async () => {
      const duplicateMemory = {
        id: 'mem-1',
        namespace: ['memories', 'agent1', 'user1'],
        key: 'key-1',
        content: 'User likes coffee',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        similarity: 0.85,
      };

      vi.mocked(mockStore.search).mockResolvedValue([duplicateMemory]);

      const result = await service.findDuplicates(
        ['memories', 'agent1', 'user1'],
        'User enjoys coffee',
        0.8, // Custom lower threshold
      );

      expect(result).toEqual([duplicateMemory]);
      expect(mockStore.search).toHaveBeenCalledWith(
        ['memories', 'agent1', 'user1'],
        'User enjoys coffee',
        { threshold: 0.8 },
      );
    });

    it('should throw error if store.search fails', async () => {
      vi.mocked(mockStore.search).mockRejectedValue(new Error('Search error'));

      await expect(
        service.findDuplicates(['memories', 'agent1', 'user1'], 'Test content'),
      ).rejects.toThrow('Failed to find duplicates: Search error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Error),
          namespace: ['memories', 'agent1', 'user1'],
        }),
        'Failed to find duplicates',
      );
    });

    it('should log duplicate findings appropriately', async () => {
      const duplicateMemories = [
        {
          id: 'mem-1',
          namespace: ['memories', 'agent1', 'user1'],
          key: 'key-1',
          content: 'User likes pizza',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          similarity: 0.99,
        },
      ];

      vi.mocked(mockStore.search).mockResolvedValue(duplicateMemories);

      await service.findDuplicates(['memories', 'agent1', 'user1'], 'User likes pizza');

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          namespace: ['memories', 'agent1', 'user1'],
          duplicatesFound: 1,
          topSimilarities: ['0.990'],
        }),
        'Duplicate memories found',
      );
    });
  });
});
