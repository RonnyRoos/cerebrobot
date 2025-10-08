/**
 * Memory Store Tests
 *
 * Unit tests for PostgresMemoryStore implementation with mocked Prisma and embeddings.
 */

import { describe, expect, it, vi, beforeEach, beforeAll, afterAll } from 'vitest';
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
          embedding: [0.1, 0.2, 0.3],
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
});

// Postgres Integration Tests
const dbUrl = process.env.DATABASE_URL;
const runDbTests = process.env.MEMORY_PG_TESTS === 'true';
const describeIfDb = dbUrl && runDbTests ? describe : describe.skip;

describeIfDb('PostgresMemoryStore Integration (Real Database)', () => {
  let realPrisma: PrismaClient;
  let realStore: PostgresMemoryStore;
  let config: MemoryConfig;
  let logger: pino.Logger;

  beforeAll(async () => {
    // Import real Prisma (not mocked)
    const { PrismaClient: RealPrismaClient } = await import('@prisma/client');
    realPrisma = new RealPrismaClient();

    config = {
      enabled: true,
      apiKey: 'test-key',
      embeddingEndpoint: 'http://test',
      embeddingModel: 'test-model',
      similarityThreshold: 0.7,
      contentMaxTokens: 2048,
      injectionBudget: 1000,
      retrievalTimeoutMs: 5000,
    };

    logger = pino({ level: 'silent' });

    // Mock generateEmbedding to return deterministic vectors
    vi.mocked(generateEmbedding).mockImplementation(async (text: string) => {
      // Create deterministic embeddings based on text content
      const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const embedding = Array.from({ length: 384 }, (_, i) => Math.sin(hash + i) / 10);
      return embedding;
    });

    realStore = new PostgresMemoryStore(realPrisma, config, logger);
  });

  afterAll(async () => {
    await realPrisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await realPrisma.$executeRaw`DELETE FROM memories WHERE namespace[1] = 'test'`;
  });

  it('persists memory to Postgres and retrieves it', async () => {
    const namespace = ['test', 'user-integration-1'];
    const key = 'test-memory-1';
    const memory: MemoryEntry = {
      id: '00000000-0000-0000-0000-000000000001',
      namespace,
      key,
      content: 'User loves pizza',
      metadata: { source: 'integration-test' },
      embedding: [], // Will be generated
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await realStore.put(namespace, key, memory);

    const retrieved = await realStore.get(namespace, key);

    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(memory.id);
    expect(retrieved?.content).toBe('User loves pizza');
    expect(retrieved?.metadata).toEqual({ source: 'integration-test' });
    expect(retrieved?.embedding).toHaveLength(384);
  });

  it('updates existing memory on conflict', async () => {
    const namespace = ['test', 'user-integration-2'];
    const key = 'test-memory-2';

    // Insert initial memory
    const memory1: MemoryEntry = {
      id: '00000000-0000-0000-0000-000000000002',
      namespace,
      key,
      content: 'User is vegetarian',
      embedding: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await realStore.put(namespace, key, memory1);

    // Update with new content
    const memory2: MemoryEntry = {
      id: '00000000-0000-0000-0000-000000000002',
      namespace,
      key,
      content: 'User is vegan',
      embedding: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await realStore.put(namespace, key, memory2);

    const retrieved = await realStore.get(namespace, key);

    expect(retrieved?.content).toBe('User is vegan');
  });

  it('performs pgvector semantic search with similarity threshold', async () => {
    const namespace = ['test', 'user-integration-3'];

    // Insert multiple memories with deterministic embeddings
    const memories: MemoryEntry[] = [
      {
        id: '00000000-0000-0000-0000-000000000003',
        namespace,
        key: 'memory-1',
        content: 'User loves Italian food like pizza and pasta',
        embedding: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '00000000-0000-0000-0000-000000000004',
        namespace,
        key: 'memory-2',
        content: 'User enjoys Mexican cuisine',
        embedding: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '00000000-0000-0000-0000-000000000005',
        namespace,
        key: 'memory-3',
        content: 'User works as a software engineer',
        embedding: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    for (const memory of memories) {
      await realStore.put(namespace, memory.key, memory);
    }

    // Search with query similar to first memory
    const results = await realStore.search(namespace, 'What Italian food does the user like?', {
      threshold: 0.5,
    });

    expect(results.length).toBeGreaterThan(0);

    // Results should be ordered by similarity
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].similarity).toBeGreaterThanOrEqual(results[i + 1].similarity);
    }

    // All results should meet threshold
    results.forEach((result) => {
      expect(result.similarity).toBeGreaterThanOrEqual(0.5);
    });
  });

  it('enforces namespace isolation between users', async () => {
    const user1Namespace = ['test', 'user-isolation-1'];
    const user2Namespace = ['test', 'user-isolation-2'];
    const key = 'shared-key';

    // Create memory for user 1
    const user1Memory: MemoryEntry = {
      id: '00000000-0000-0000-0000-000000000006',
      namespace: user1Namespace,
      key,
      content: 'User 1 data',
      embedding: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await realStore.put(user1Namespace, key, user1Memory);

    // Create memory for user 2
    const user2Memory: MemoryEntry = {
      id: '00000000-0000-0000-0000-000000000007',
      namespace: user2Namespace,
      key,
      content: 'User 2 data',
      embedding: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await realStore.put(user2Namespace, key, user2Memory);

    // Verify each user can only access their own data
    const user1Retrieved = await realStore.get(user1Namespace, key);
    const user2Retrieved = await realStore.get(user2Namespace, key);

    expect(user1Retrieved?.content).toBe('User 1 data');
    expect(user2Retrieved?.content).toBe('User 2 data');

    // Verify search isolation
    const user1Search = await realStore.search(user1Namespace, 'data', { threshold: 0.5 });
    const user2Search = await realStore.search(user2Namespace, 'data', { threshold: 0.5 });

    expect(user1Search.some((m) => m.content === 'User 2 data')).toBe(false);
    expect(user2Search.some((m) => m.content === 'User 1 data')).toBe(false);
  });

  it('deletes memory successfully', async () => {
    const namespace = ['test', 'user-integration-delete'];
    const key = 'deletable-memory';

    const memory: MemoryEntry = {
      id: '00000000-0000-0000-0000-000000000008',
      namespace,
      key,
      content: 'This will be deleted',
      embedding: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await realStore.put(namespace, key, memory);

    // Verify it exists
    let retrieved = await realStore.get(namespace, key);
    expect(retrieved).not.toBeNull();

    // Delete it
    await realStore.delete(namespace, key);

    // Verify it's gone
    retrieved = await realStore.get(namespace, key);
    expect(retrieved).toBeNull();
  });

  it('lists all keys in namespace', async () => {
    const namespace = ['test', 'user-integration-list'];

    const memories: MemoryEntry[] = [
      {
        id: '00000000-0000-0000-0000-000000000009',
        namespace,
        key: 'key-alpha',
        content: 'Content A',
        embedding: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '00000000-0000-0000-0000-00000000000a',
        namespace,
        key: 'key-beta',
        content: 'Content B',
        embedding: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '00000000-0000-0000-0000-00000000000b',
        namespace,
        key: 'key-gamma',
        content: 'Content C',
        embedding: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    for (const memory of memories) {
      await realStore.put(namespace, memory.key, memory);
    }

    const keys = await realStore.list(namespace);

    expect(keys).toHaveLength(3);
    expect(keys).toContain('key-alpha');
    expect(keys).toContain('key-beta');
    expect(keys).toContain('key-gamma');
  });
});
