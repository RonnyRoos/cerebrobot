/**
 * Memory Store Tests
 *
 * Unit tests for PostgresMemoryStore implementation with mocked Prisma and embeddings.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { MemoryEntry } from '@cerebrobot/chat-shared';

// Mock Prisma client
vi.mock('@prisma/client', () => {
  class PrismaClientMock {
    public readonly memory = {
      delete: vi.fn(),
    };

    public readonly $executeRaw = vi.fn();
    public readonly $queryRaw = vi.fn();
  }

  return {
    PrismaClient: PrismaClientMock,
    Prisma: {
      sql: (strings: TemplateStringsArray, ...values: unknown[]) => {
        // Return a mock SQL fragment
        return { raw: strings.join('?'), values };
      },
      empty: { raw: '', values: [] },
    },
  };
});

// Mock embeddings service
vi.mock('../embeddings.js', () => ({
  generateEmbedding: vi.fn(),
}));

import { PrismaClient } from '@prisma/client';
import { PostgresMemoryStore } from '../store.js';
import { generateEmbedding } from '../embeddings.js';
import type { MemoryConfig } from '../config.js';
import pino from 'pino';

describe('PostgresMemoryStore', () => {
  let store: PostgresMemoryStore;
  let prisma: PrismaClient;
  let config: MemoryConfig;
  let logger: pino.Logger;

  beforeEach(() => {
    prisma = new PrismaClient();
    config = {
      enabled: true,
      apiKey: 'test-api-key',
      embeddingEndpoint: 'http://test-endpoint',
      embeddingModel: 'test-model',
      similarityThreshold: 0.7,
      contentMaxTokens: 2048,
      injectionBudget: 1000,
      retrievalTimeoutMs: 5000,
    };
    logger = pino({ level: 'silent' }); // Silent logger for tests

    store = new PostgresMemoryStore(prisma, config, logger);

    // Reset mocks
    vi.clearAllMocks();
  });

  describe('put()', () => {
    it('creates a new memory with embedding', async () => {
      const namespace = ['memories', 'user-123'];
      const key = 'preference-diet';
      const value: MemoryEntry = {
        id: 'mem-1',
        namespace,
        key,
        content: 'User is vegetarian',
        metadata: { source: 'conversation' },
        embedding: [0.1, 0.2, 0.3],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockEmbedding = [0.1, 0.2, 0.3];
      vi.mocked(generateEmbedding).mockResolvedValue(mockEmbedding);

      await store.put(namespace, key, value);

      expect(generateEmbedding).toHaveBeenCalledWith(value.content, config);
      expect(prisma.$executeRaw).toHaveBeenCalled();

      const callArgs = vi.mocked(prisma.$executeRaw).mock.calls[0];
      const sqlTemplate = callArgs[0];
      const sqlParts = Array.isArray(sqlTemplate) ? sqlTemplate.join('') : sqlTemplate;
      expect(sqlParts).toContain('INSERT INTO memories');
      expect(callArgs).toContainEqual('mem-1');
      expect(callArgs).toContainEqual(namespace);
      expect(callArgs).toContainEqual(key);
      expect(callArgs).toContainEqual(value.content);
      expect(callArgs).toContainEqual('[0.1,0.2,0.3]');
    });

    it('updates existing memory on conflict (upsert)', async () => {
      const namespace = ['memories', 'user-123'];
      const key = 'preference-diet';
      const value: MemoryEntry = {
        id: 'mem-2',
        namespace,
        key,
        content: 'User is vegan now',
        metadata: { updated: true },
        embedding: [0.4, 0.5, 0.6],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(generateEmbedding).mockResolvedValue([0.4, 0.5, 0.6]);

      await store.put(namespace, key, value);

      const callArgs = vi.mocked(prisma.$executeRaw).mock.calls[0];
      const sqlTemplate = callArgs[0];
      const sqlParts = Array.isArray(sqlTemplate) ? sqlTemplate.join('') : sqlTemplate;
      expect(sqlParts).toContain('ON CONFLICT (namespace, key) DO UPDATE SET');
    });

    it('skips storage if embedding generation fails', async () => {
      const namespace = ['memories', 'user-123'];
      const key = 'test-key';
      const value: MemoryEntry = {
        id: 'mem-3',
        namespace,
        key,
        content: 'Test content',
        embedding: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(generateEmbedding).mockResolvedValue(null);

      await store.put(namespace, key, value);

      expect(prisma.$executeRaw).not.toHaveBeenCalled();
    });
  });

  describe('get()', () => {
    it('retrieves memory by namespace and key', async () => {
      const namespace = ['memories', 'user-123'];
      const key = 'preference-diet';
      const mockResult = [
        {
          id: 'mem-1',
          namespace,
          key,
          content: 'User is vegetarian',
          metadata: { source: 'conversation' },
          embedding: '[0.1,0.2,0.3]', // String format to match ::text cast
          created_at: new Date('2025-01-01'),
          updated_at: new Date('2025-01-01'),
        },
      ];

      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockResult);

      const result = await store.get(namespace, key);

      expect(prisma.$queryRaw).toHaveBeenCalled();
      const callArgs = vi.mocked(prisma.$queryRaw).mock.calls[0];
      const sqlTemplate = callArgs[0];
      const sqlParts = Array.isArray(sqlTemplate) ? sqlTemplate.join('') : sqlTemplate;
      expect(sqlParts).toContain('SELECT');
      expect(sqlParts).toContain('FROM memories');
      expect(callArgs).toContainEqual(namespace);
      expect(callArgs).toContainEqual(key);

      expect(result).toEqual({
        id: 'mem-1',
        namespace,
        key,
        content: 'User is vegetarian',
        metadata: { source: 'conversation' },
        embedding: [0.1, 0.2, 0.3],
        createdAt: mockResult[0].created_at,
        updatedAt: mockResult[0].updated_at,
      });
    });

    it('returns null when memory not found', async () => {
      const namespace = ['memories', 'user-456'];
      const key = 'nonexistent';

      vi.mocked(prisma.$queryRaw).mockResolvedValue([]);

      const result = await store.get(namespace, key);

      expect(result).toBeNull();
    });
  });

  describe('search()', () => {
    it('returns memories above similarity threshold', async () => {
      const namespace = ['memories', 'user-123'];
      const query = 'What are my dietary preferences?';
      const mockEmbedding = [0.15, 0.25, 0.35];
      const mockResults = [
        {
          id: 'mem-1',
          namespace,
          key: 'preference-diet',
          content: 'User is vegetarian',
          metadata: { source: 'conversation' },
          embedding: [0.1, 0.2, 0.3],
          created_at: new Date('2025-01-01'),
          updated_at: new Date('2025-01-01'),
          similarity: 0.95,
        },
        {
          id: 'mem-2',
          namespace,
          key: 'preference-allergen',
          content: 'User is allergic to peanuts',
          metadata: { source: 'conversation' },
          embedding: [0.2, 0.3, 0.4],
          created_at: new Date('2025-01-02'),
          updated_at: new Date('2025-01-02'),
          similarity: 0.75,
        },
      ];

      vi.mocked(generateEmbedding).mockResolvedValue(mockEmbedding);
      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockResults);

      const results = await store.search(namespace, query);

      expect(generateEmbedding).toHaveBeenCalledWith(query, config);
      expect(prisma.$queryRaw).toHaveBeenCalled();

      const callArgs = vi.mocked(prisma.$queryRaw).mock.calls[0];
      const sqlTemplate = callArgs[0];
      const sqlParts = Array.isArray(sqlTemplate) ? sqlTemplate.join('') : sqlTemplate;
      expect(sqlParts).toContain('1 - (embedding <=>');
      expect(sqlParts).toContain('ORDER BY embedding <=>');
      expect(callArgs).toContainEqual(namespace);
      expect(callArgs).toContainEqual(0.7); // threshold from config

      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({
        id: 'mem-1',
        content: 'User is vegetarian',
        similarity: 0.95,
      });
    });

    it('orders results by similarity score (highest first)', async () => {
      const namespace = ['memories', 'user-123'];
      const query = 'food preferences';
      const mockResults = [
        {
          id: 'mem-high',
          namespace,
          key: 'key1',
          content: 'High similarity',
          metadata: {},
          embedding: [0.1, 0.2],
          created_at: new Date(),
          updated_at: new Date(),
          similarity: 0.9,
        },
        {
          id: 'mem-low',
          namespace,
          key: 'key2',
          content: 'Lower similarity',
          metadata: {},
          embedding: [0.3, 0.4],
          created_at: new Date(),
          updated_at: new Date(),
          similarity: 0.72,
        },
      ];

      vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2]);
      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockResults);

      const results = await store.search(namespace, query);

      expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
      expect(results[0].id).toBe('mem-high');
    });

    it('respects custom threshold option', async () => {
      const namespace = ['memories', 'user-123'];
      const query = 'test query';
      const customThreshold = 0.85;

      vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2]);
      vi.mocked(prisma.$queryRaw).mockResolvedValue([]);

      await store.search(namespace, query, { threshold: customThreshold });

      const callArgs = vi.mocked(prisma.$queryRaw).mock.calls[0];
      expect(callArgs).toContainEqual(customThreshold);
    });

    it('returns empty array if embedding generation fails', async () => {
      const namespace = ['memories', 'user-123'];
      const query = 'test query';

      vi.mocked(generateEmbedding).mockResolvedValue(null);

      const results = await store.search(namespace, query);

      expect(results).toEqual([]);
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });
  });

  describe('delete()', () => {
    it('deletes memory by namespace and key', async () => {
      const namespace = ['memories', 'user-123'];
      const key = 'preference-diet';

      vi.mocked(prisma.memory.delete).mockResolvedValue(undefined as never);

      await store.delete(namespace, key);

      expect(prisma.memory.delete).toHaveBeenCalledWith({
        where: {
          namespace_key: {
            namespace,
            key,
          },
        },
      });
    });
  });

  describe('list()', () => {
    it('lists all keys in namespace', async () => {
      const namespace = ['memories', 'user-123'];
      const mockResults = [{ key: 'pref-diet' }, { key: 'pref-allergen' }, { key: 'pref-hobby' }];

      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockResults);

      const keys = await store.list(namespace);

      expect(prisma.$queryRaw).toHaveBeenCalled();
      const callArgs = vi.mocked(prisma.$queryRaw).mock.calls[0];
      const sqlTemplate = callArgs[0];
      const sqlParts = Array.isArray(sqlTemplate) ? sqlTemplate.join('') : sqlTemplate;
      expect(sqlParts).toContain('SELECT key');
      expect(sqlParts).toContain('FROM memories');
      expect(callArgs).toContainEqual(namespace);

      expect(keys).toEqual(['pref-diet', 'pref-allergen', 'pref-hobby']);
    });

    it('returns empty array for namespace with no memories', async () => {
      const namespace = ['memories', 'user-empty'];

      vi.mocked(prisma.$queryRaw).mockResolvedValue([]);

      const keys = await store.list(namespace);

      expect(keys).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    it('handles embedding generation failure gracefully', async () => {
      const namespace = ['memories', 'user-edge'];
      const key = 'failing-embedding';
      const memory: MemoryEntry = {
        id: crypto.randomUUID(),
        namespace,
        key,
        content: 'Test content',
        embedding: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(generateEmbedding).mockRejectedValueOnce(new Error('Embedding API timeout'));

      // Should not throw, but should skip storage
      await expect(store.put(namespace, key, memory)).resolves.toBeUndefined();

      // Verify no database write attempted
      expect(prisma.$executeRaw).not.toHaveBeenCalled();
    });

    it('returns empty array when no memories meet similarity threshold', async () => {
      const namespace = ['memories', 'user-threshold'];

      vi.mocked(generateEmbedding).mockResolvedValueOnce(new Array(1536).fill(0));
      vi.mocked(prisma.$queryRaw).mockResolvedValue([]);

      const results = await store.search(namespace, 'completely unrelated query', {
        threshold: 0.99,
      });

      expect(results).toEqual([]);
    });

    it('handles empty namespace gracefully', async () => {
      const namespace: string[] = [];
      const key = 'test-key';
      const memory: MemoryEntry = {
        id: crypto.randomUUID(),
        namespace,
        key,
        content: 'Test',
        embedding: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(generateEmbedding).mockResolvedValueOnce(new Array(1536).fill(0.1));

      await store.put(namespace, key, memory);

      // Verify database write was attempted with empty namespace
      expect(prisma.$executeRaw).toHaveBeenCalled();
      const callArgs = vi.mocked(prisma.$executeRaw).mock.calls[0];
      // In Prisma's tagged template: callArgs[0] is the template array,
      // callArgs[1] is memory.id, callArgs[2] is namespace
      expect(callArgs[2]).toEqual([]); // Empty namespace array
    });

    it('handles very long content within token limits', async () => {
      const namespace = ['memories', 'user-long'];
      const key = 'long-content';
      const longContent = 'word '.repeat(500); // ~2500 chars
      const memory: MemoryEntry = {
        id: crypto.randomUUID(),
        namespace,
        key,
        content: longContent.trim(),
        embedding: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(generateEmbedding).mockResolvedValueOnce(new Array(1536).fill(0.5));

      await store.put(namespace, key, memory);

      expect(generateEmbedding).toHaveBeenCalledWith(
        expect.stringContaining('word'),
        expect.objectContaining({
          contentMaxTokens: 2048,
        }),
      );
    });
  });
});
