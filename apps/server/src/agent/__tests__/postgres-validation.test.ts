/**
 * Postgres Validation Tests
 *
 * Integration tests that validate Cerebrobot's Postgres-backed features:
 * - Memory storage and semantic search (pgvector)
 * - LangGraph conversation persistence (checkpointer)
 *
 * These tests require a running Postgres database and are excluded from
 * normal test runs to keep the development loop fast.
 *
 * To run these tests:
 *   POSTGRES_VALIDATION=true pnpm test
 *
 * Prerequisites:
 *   - PostgreSQL with pgvector extension enabled
 *   - DATABASE_URL environment variable set
 *   - LANGGRAPH_PG_URL environment variable set
 *   - All migrations applied (pnpm prisma:migrate)
 *
 * See docs/best-practices.md for our 3-tier testing philosophy.
 */

import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vitest';
import { AIMessage } from '@langchain/core/messages';
import { PrismaClient } from '@prisma/client';
import type { MemoryEntry } from '@cerebrobot/chat-shared';
import { PostgresMemoryStore } from '../memory/store.js';
import { generateEmbedding } from '../memory/embeddings.js';
import type { MemoryConfig } from '../memory/config.js';
import { LangGraphChatAgent } from '../langgraph-agent.js';
import { loadConfigFromEnv } from '../../config.js';
import type { ChatInvocationContext } from '../../chat/chat-agent.js';
import { createCheckpointSaver } from '../checkpointer.js';
import { PostgresCheckpointSaver } from '../postgres-checkpoint.js';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { Checkpoint, CheckpointMetadata } from '@langchain/langgraph-checkpoint';
import pino from 'pino';

// Mock embeddings service
vi.mock('../memory/embeddings.js', () => ({
  generateEmbedding: vi.fn(),
}));

// Mock ChatOpenAI for LangGraph tests
type InvokeHandler = (args: {
  messages: unknown[];
  options?: Record<string, unknown>;
}) => Promise<AIMessage>;

const chatInvokeHandlers: InvokeHandler[] = [];
const summarizerInvokeHandlers: InvokeHandler[] = [];

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn((options: { temperature?: number }) => {
    const isSummarizer = options.temperature === 0;
    const invokeHandlers = isSummarizer ? summarizerInvokeHandlers : chatInvokeHandlers;

    return {
      invoke: vi.fn(async (messages: unknown[], invokeOptions?: Record<string, unknown>) => {
        const handler = invokeHandlers.shift();
        if (!handler) {
          return new AIMessage('default response');
        }
        return handler({ messages, options: invokeOptions });
      }),
      stream: vi.fn(async function* () {
        // streamChat relies on LangGraph stream aggregation
      }),
    };
  }),
}));

// ============================================================================
// PostgresMemoryStore Integration Tests (6 tests)
// ============================================================================

describe('PostgresMemoryStore Integration (Real Database)', () => {
  let realPrisma: PrismaClient;
  let realStore: PostgresMemoryStore;
  let config: MemoryConfig;
  let logger: pino.Logger;

  beforeAll(async () => {
    realPrisma = new PrismaClient();

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

// ============================================================================
// LangGraph Persistence Integration Tests (2 tests)
// ============================================================================

const baseEnv = {
  FASTIFY_PORT: '3030',
  LANGGRAPH_SYSTEM_PROMPT: 'You are Cerebrobot.',
  LANGGRAPH_PERSONA_TAG: 'tester',
  LANGCHAIN_MODEL: 'gpt-4o-mini',
  LANGCHAIN_TEMPERATURE: '0.2',
  LANGMEM_HOTPATH_LIMIT: '4',
  LANGMEM_HOTPATH_TOKEN_BUDGET: '1024',
  LANGMEM_RECENT_MESSAGE_FLOOR: '2',
  LANGMEM_HOTPATH_MARGIN_PCT: '0',
};

describe('LangGraph Postgres persistence', () => {
  let prisma: PrismaClient;
  let pgUrl: string;

  beforeAll(async () => {
    pgUrl = process.env.LANGGRAPH_PG_URL ?? '';
    process.env.DEEPINFRA_API_KEY = process.env.DEEPINFRA_API_KEY ?? 'test-key';
    prisma = new PrismaClient({ datasources: { db: { url: pgUrl } } });

    // Verify connection
    await prisma.$queryRawUnsafe('SELECT 1');
  });

  beforeEach(async () => {
    chatInvokeHandlers.length = 0;
    summarizerInvokeHandlers.length = 0;
    await prisma.langGraphCheckpointWrite.deleteMany();
    await prisma.langGraphCheckpoint.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('persists conversation state across agent instances', async () => {
    const config = loadConfigFromEnv({ ...baseEnv, LANGGRAPH_PG_URL: pgUrl });
    const sessionId = `session-${Date.now()}`;

    chatInvokeHandlers.push(async () => new AIMessage('Persisted reply'));

    const agent = new LangGraphChatAgent({ config });
    await agent.completeChat(createInvocationContext(sessionId, config));

    const checkpointer = createCheckpointSaver(config);
    const tuple = await checkpointer.getTuple({ configurable: { thread_id: sessionId } });
    expect(tuple).toBeDefined();
    expect(tuple?.checkpoint.channel_values).toBeDefined();

    const agentAfterRestart = new LangGraphChatAgent({ config });
    const state = await (
      agentAfterRestart as unknown as {
        graphContext: {
          graph: {
            getState: (config: RunnableConfig) => Promise<{ values: { messages?: unknown[] } }>;
          };
        };
      }
    ).graphContext.graph.getState({ configurable: { thread_id: sessionId } });

    const messages = state.values.messages as unknown[] | undefined;
    expect(messages).toBeDefined();
    expect(messages?.length ?? 0).toBeGreaterThan(0);
  });

  it('surfaces errors when checkpoint writes fail mid-session', async () => {
    const failingClient = {
      langGraphCheckpoint: {
        upsert: vi.fn(async () => undefined),
        findUnique: vi.fn(async () => null),
        findFirst: vi.fn(async () => null),
        findMany: vi.fn(async () => []),
        deleteMany: vi.fn(async () => undefined),
      },
      langGraphCheckpointWrite: {
        upsert: vi.fn(async () => {
          throw new Error('simulated connection loss');
        }),
        findMany: vi.fn(async () => []),
        deleteMany: vi.fn(async () => undefined),
      },
    } as unknown as PrismaClient;

    const saver = new PostgresCheckpointSaver(
      { url: 'postgresql://example', schema: undefined },
      { createClient: () => failingClient },
    );

    const checkpoint: Checkpoint = {
      v: 4,
      id: 'checkpoint-test',
      ts: new Date().toISOString(),
      channel_values: {},
      channel_versions: {},
      versions_seen: {},
    };

    const metadata: CheckpointMetadata = {
      source: 'input',
      step: 0,
      parents: {},
    };

    await saver.put(
      { configurable: { thread_id: 'connection-loss', checkpoint_ns: '' } },
      checkpoint,
      metadata,
      {},
    );

    await expect(
      saver.putWrites(
        {
          configurable: {
            thread_id: 'connection-loss',
            checkpoint_ns: '',
            checkpoint_id: 'checkpoint-test',
          },
        },
        [['TASKS', { foo: 'bar' }]],
        'task-1',
      ),
    ).rejects.toThrow('simulated connection loss');
  });
});

function createInvocationContext(
  sessionId: string,
  config: ReturnType<typeof loadConfigFromEnv>,
): ChatInvocationContext {
  return {
    sessionId,
    userId: 'test-user-123',
    message: 'Hello persistence?',
    correlationId: `corr-${sessionId}`,
    config,
  };
}
