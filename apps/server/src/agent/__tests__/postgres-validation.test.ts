/**
 * Postgres Validation Tests
 *
 * Infrastructure tests that validate Cerebrobot's Postgres-backed features:
 * - Memory storage and semantic search (pgvector)
 * - LangGraph conversation persistence (checkpointer)
 *
 * These tests run by default to catch schema/migration issues early.
 * They use mocked embeddings (no external API calls) for determinism.
 *
 * Prerequisites:
 *   - PostgreSQL with pgvector extension enabled
 *   - DATABASE_URL environment variable set
 *   - LANGGRAPH_PG_URL environment variable set
 *   - All migrations applied (pnpm prisma:migrate)
 *
 * If you see connection errors, ensure:
 *   1. Docker Compose is running: `docker-compose up -d`
 *   2. Migrations are applied: `pnpm prisma:migrate`
 *   3. Environment variables are set (see .env.example)
 *
 * See docs/best-practices.md for our 3-tier testing philosophy.
 */

import { beforeAll, beforeEach, afterEach, afterAll, describe, expect, it, vi } from 'vitest';
import { AIMessage } from '@langchain/core/messages';
import { PrismaClient } from '@prisma/client';
import type { MemoryEntry } from '@cerebrobot/chat-shared';
import { PostgresMemoryStore } from '../memory/store.js';
import { generateEmbedding } from '../memory/embeddings.js';
import type { MemoryConfig } from '../memory/config.js';
import { EMBEDDING_DIMENSIONS } from '../memory/config.js';
import { LangGraphChatAgent } from '../langgraph-agent.js';
import { loadInfrastructureConfig } from '../../config.js';
import type { ChatInvocationContext } from '../../chat/chat-agent.js';
import type { AgentConfig } from '../../config/agent-config.js';
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockModel: any = {
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
      bindTools: vi.fn(() => mockModel), // Return self for chaining
    };

    return mockModel;
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
    // Verify prerequisites before running tests
    if (!process.env.DATABASE_URL) {
      throw new Error(
        '\n❌ DATABASE_URL not set!\n\n' +
          'These tests require a running PostgreSQL database.\n\n' +
          'Quick fix:\n' +
          '  1. Start the database: docker-compose up -d\n' +
          '  2. Apply migrations: pnpm prisma:migrate\n' +
          '  3. Ensure .env file exists with DATABASE_URL\n\n' +
          'See .env.example for configuration.\n',
      );
    }

    realPrisma = new PrismaClient();

    // Test database connection
    try {
      await realPrisma.$queryRaw`SELECT 1`;
    } catch (error) {
      await realPrisma.$disconnect();
      throw new Error(
        '\n❌ Cannot connect to PostgreSQL!\n\n' +
          `Database URL: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}\n\n` +
          'Quick fix:\n' +
          '  1. Check Docker is running: docker ps\n' +
          '  2. Start services: docker-compose up -d\n' +
          '  3. Verify connection: psql <DATABASE_URL>\n\n' +
          `Original error: ${error instanceof Error ? error.message : String(error)}\n`,
      );
    }

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
      const embedding = Array.from(
        { length: EMBEDDING_DIMENSIONS },
        (_, i) => Math.sin(hash + i) / 10,
      );
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
    const namespace = ['memories', 'agent-integration', 'user-integration-1'];
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
    expect(retrieved?.embedding).toHaveLength(EMBEDDING_DIMENSIONS);
  });

  it('updates existing memory on conflict', async () => {
    const namespace = ['memories', 'agent-integration', 'user-integration-2'];
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
    const namespace = ['memories', 'agent-integration', 'user-integration-3'];

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
    // Use very low threshold since our mock embeddings are hash-based and may not have high similarity
    const results = await realStore.search(namespace, 'What Italian food does the user like?', {
      threshold: 0.0, // Accept any results to verify search works
    });

    expect(results.length).toBeGreaterThan(0);

    // Results should be ordered by similarity
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].similarity).toBeGreaterThanOrEqual(results[i + 1].similarity);
    }

    // All results should be valid (similarity between -1 and 1)
    results.forEach((result) => {
      expect(result.similarity).toBeGreaterThanOrEqual(-1);
      expect(result.similarity).toBeLessThanOrEqual(1);
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
    const namespace = ['memories', 'agent-integration', 'user-integration-delete'];
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
    const namespace = ['memories', 'agent-integration', 'user-integration-list'];

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

const mockAgentConfig: AgentConfig = {
  id: '00000000-0000-0000-0000-000000000000',
  name: 'Test Agent',
  systemPrompt: 'You are Cerebrobot.',
  personaTag: 'tester',
  llm: {
    model: 'gpt-4o-mini',
    temperature: 0.2,
    apiKey: 'test-key',
    apiBase: 'https://api.test.com/v1/openai',
  },
  memory: {
    hotPathLimit: 4,
    hotPathTokenBudget: 1024,
    recentMessageFloor: 2,
    hotPathMarginPct: 0,
    embeddingModel: 'test-embedding-model',
    embeddingEndpoint: 'https://api.test.com/v1/openai',
    similarityThreshold: 0.7,
    maxTokens: 2048,
    injectionBudget: 1000,
    retrievalTimeoutMs: 5000,
  },
  autonomy: {
    enabled: false,
    evaluator: {
      model: 'deepseek/deepseek-chat',
      temperature: 0.3,
      maxTokens: 500,
      systemPrompt: 'Test evaluator',
    },
    limits: {
      maxFollowUpsPerSession: 3,
      minDelayMs: 10000,
      maxDelayMs: 3600000,
    },
    memoryContext: {
      recentMemoryCount: 10,
      includeRecentMessages: 5,
    },
  },
};

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

    // Verify LANGGRAPH_PG_URL is set
    if (!pgUrl) {
      throw new Error(
        '\n❌ LANGGRAPH_PG_URL not set!\n\n' +
          'These tests require LangGraph Postgres checkpointer.\n\n' +
          'Quick fix:\n' +
          '  1. Add to .env: LANGGRAPH_PG_URL=postgresql://...\n' +
          '  2. Can be same as DATABASE_URL\n' +
          '  3. See .env.example for format\n',
      );
    }

    process.env.DEEPINFRA_API_KEY = process.env.DEEPINFRA_API_KEY ?? 'test-key';
    prisma = new PrismaClient({ datasources: { db: { url: pgUrl } } });

    // Verify connection
    try {
      await prisma.$queryRawUnsafe('SELECT 1');
    } catch (error) {
      await prisma.$disconnect();
      throw new Error(
        '\n❌ Cannot connect to LangGraph database!\n\n' +
          `Database URL: ${pgUrl.replace(/:[^:@]+@/, ':****@')}\n\n` +
          'Quick fix:\n' +
          '  1. Verify LANGGRAPH_PG_URL in .env\n' +
          '  2. Check Docker is running: docker ps\n' +
          '  3. Start services: docker-compose up -d\n\n' +
          `Original error: ${error instanceof Error ? error.message : String(error)}\n`,
      );
    }
  });

  // Track test thread IDs for cleanup instead of wiping entire database
  const testThreadIds: string[] = [];

  beforeEach(async () => {
    chatInvokeHandlers.length = 0;
    summarizerInvokeHandlers.length = 0;
  });

  afterEach(async () => {
    // Clean up only the threads created during this test
    if (testThreadIds.length > 0) {
      await prisma.langGraphCheckpointWrite.deleteMany({
        where: { threadId: { in: testThreadIds } },
      });
      await prisma.langGraphCheckpoint.deleteMany({
        where: { threadId: { in: testThreadIds } },
      });
      testThreadIds.length = 0; // Clear the tracking array
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('persists conversation state across agent instances', async () => {
    const infraConfig = loadInfrastructureConfig({ ...baseEnv, LANGGRAPH_PG_URL: pgUrl });
    const sessionId = `test-session-${Date.now()}`;
    testThreadIds.push(sessionId); // Track for cleanup

    chatInvokeHandlers.push(async () => new AIMessage('Persisted reply'));

    const checkpointer = createCheckpointSaver(infraConfig);
    const agent = new LangGraphChatAgent(mockAgentConfig, undefined, checkpointer);
    await agent.completeChat(createInvocationContext(sessionId));

    const tuple = await checkpointer.getTuple({ configurable: { thread_id: sessionId } });
    expect(tuple).toBeDefined();
    expect(tuple?.checkpoint.channel_values).toBeDefined();

    const agentAfterRestart = new LangGraphChatAgent(mockAgentConfig, undefined, checkpointer);
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

  // NOTE: This test validates that database write errors are properly surfaced
  // Testing error propagation from putWrites when database connection fails
  it('surfaces errors when checkpoint writes fail mid-session', async () => {
    const failingClient = {
      langGraphCheckpointWrite: {
        upsert: vi.fn(async () => {
          throw new Error('simulated connection loss');
        }),
        findMany: vi.fn(async () => []),
        deleteMany: vi.fn(async () => undefined),
      },
      langGraphCheckpoint: {
        upsert: vi.fn(async () => undefined),
        // Mock findUnique to return a checkpoint (so putWrites proceeds to upsert)
        findUnique: vi.fn(async () => ({
          id: 'checkpoint-test',
          threadId: 'connection-loss',
          checkpointNamespace: '',
          checkpointId: 'checkpoint-test',
          parentCheckpointId: null,
          type: 'checkpoint' as const,
          checkpoint: Buffer.from('{}'),
          metadata: Buffer.from('{}'),
        })),
        findFirst: vi.fn(async () => null),
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

    // Verify that putWrites fails when database connection is lost
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
    ).rejects.toThrow();
  });
});

function createInvocationContext(threadId: string): ChatInvocationContext {
  return {
    threadId,
    userId: 'test-user-123',
    message: 'Hello persistence?',
    correlationId: `corr-${threadId}`,
  };
}

// ============================================================================
// Events & Effects Tables Validation (Task T026)
// ============================================================================

describe('Events & Effects Tables (Real Database)', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await prisma.$executeRaw`DELETE FROM effects WHERE session_key LIKE 'test-validation:%'`;
    await prisma.$executeRaw`DELETE FROM events WHERE session_key LIKE 'test-validation:%'`;
  });

  afterEach(async () => {
    // Clean up test data after each test to avoid contaminating other tests
    await prisma.$executeRaw`DELETE FROM effects WHERE session_key LIKE 'test-validation:%'`;
    await prisma.$executeRaw`DELETE FROM events WHERE session_key LIKE 'test-validation:%'`;
  });

  describe('events table', () => {
    it('should exist with correct structure', async () => {
      // Query table information from information_schema
      const tableInfo = await prisma.$queryRaw<Array<{ column_name: string; data_type: string }>>`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'events' 
        ORDER BY ordinal_position
      `;

      const columnNames = tableInfo.map((col) => col.column_name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('session_key');
      expect(columnNames).toContain('seq');
      expect(columnNames).toContain('type');
      expect(columnNames).toContain('payload');
      expect(columnNames).toContain('created_at');
    });

    it('should enforce unique constraint on (session_key, seq)', async () => {
      const sessionKey = 'test-validation:agent1:thread1';

      // Insert first event
      await prisma.$executeRaw`
        INSERT INTO events (id, session_key, seq, type, payload, created_at)
        VALUES (gen_random_uuid(), ${sessionKey}, 1, 'user_message', '{"text":"test"}', NOW())
      `;

      // Attempt to insert duplicate (same session_key + seq)
      await expect(
        prisma.$executeRaw`
          INSERT INTO events (id, session_key, seq, type, payload, created_at)
          VALUES (gen_random_uuid(), ${sessionKey}, 1, 'user_message', '{"text":"test2"}', NOW())
        `,
      ).rejects.toThrow(/already exists|unique constraint/i);
    });

    it('should allow same seq across different sessions', async () => {
      const session1 = 'test-validation:agent1:thread1';
      const session2 = 'test-validation:agent1:thread2';

      // Insert event with seq=1 in session1
      await prisma.$executeRaw`
        INSERT INTO events (id, session_key, seq, type, payload, created_at)
        VALUES (gen_random_uuid(), ${session1}, 1, 'user_message', '{"text":"test1"}', NOW())
      `;

      // Insert event with seq=1 in session2 (should succeed)
      await prisma.$executeRaw`
        INSERT INTO events (id, session_key, seq, type, payload, created_at)
        VALUES (gen_random_uuid(), ${session2}, 1, 'user_message', '{"text":"test2"}', NOW())
      `;

      const count = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM events 
        WHERE session_key IN (${session1}, ${session2})
      `;

      expect(Number(count[0].count)).toBe(2);
    });

    it('should have index on (session_key, seq)', async () => {
      // Query indexes from pg_indexes
      const indexes = await prisma.$queryRaw<Array<{ indexname: string; indexdef: string }>>`
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename = 'events' AND schemaname = 'public'
      `;

      const hasSessionSeqIndex = indexes.some(
        (idx) =>
          idx.indexdef.includes('session_key') &&
          idx.indexdef.includes('seq') &&
          (idx.indexdef.includes('UNIQUE') || idx.indexname.includes('session_key')),
      );

      expect(hasSessionSeqIndex).toBe(true);
    });
  });

  describe('effects table', () => {
    it('should exist with correct structure', async () => {
      const tableInfo = await prisma.$queryRaw<Array<{ column_name: string; data_type: string }>>`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'effects' 
        ORDER BY ordinal_position
      `;

      const columnNames = tableInfo.map((col) => col.column_name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('session_key');
      expect(columnNames).toContain('checkpoint_id');
      expect(columnNames).toContain('type');
      expect(columnNames).toContain('payload');
      expect(columnNames).toContain('dedupe_key');
      expect(columnNames).toContain('status');
      expect(columnNames).toContain('created_at');
      expect(columnNames).toContain('updated_at');
      expect(columnNames).toContain('attempt_count');
      expect(columnNames).toContain('last_attempt_at');
    });

    it('should enforce unique constraint on dedupe_key', async () => {
      const sessionKey = 'test-validation:agent1:thread1';
      const dedupeKey = 'test-dedupe-key-' + Date.now();

      // Insert first effect
      await prisma.$executeRaw`
        INSERT INTO effects (
          id, session_key, checkpoint_id, type, payload, dedupe_key, 
          status, created_at, updated_at, attempt_count
        ) VALUES (
          gen_random_uuid(), ${sessionKey}, 'checkpoint-1', 'send_message',
          '{"content":"test","requestId":"req1","isFinal":true}', ${dedupeKey},
          'pending', NOW(), NOW(), 0
        )
      `;

      // Attempt to insert duplicate dedupe_key
      await expect(
        prisma.$executeRaw`
          INSERT INTO effects (
            id, session_key, checkpoint_id, type, payload, dedupe_key,
            status, created_at, updated_at, attempt_count
          ) VALUES (
            gen_random_uuid(), ${sessionKey}, 'checkpoint-2', 'send_message',
            '{"content":"test2","requestId":"req2","isFinal":true}', ${dedupeKey},
            'pending', NOW(), NOW(), 0
          )
        `,
      ).rejects.toThrow(/already exists|unique constraint|duplicate key/i);
    });

    it('should have index on status and created_at', async () => {
      const indexes = await prisma.$queryRaw<Array<{ indexname: string; indexdef: string }>>`
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename = 'effects' AND schemaname = 'public'
      `;

      const hasStatusCreatedIndex = indexes.some(
        (idx) => idx.indexdef.includes('status') && idx.indexdef.includes('created_at'),
      );

      expect(hasStatusCreatedIndex).toBe(true);
    });

    it('should have index on session_key', async () => {
      const indexes = await prisma.$queryRaw<Array<{ indexname: string; indexdef: string }>>`
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename = 'effects' AND schemaname = 'public'
      `;

      const hasSessionKeyIndex = indexes.some((idx) => idx.indexdef.includes('session_key'));

      expect(hasSessionKeyIndex).toBe(true);
    });

    it('should support effect lifecycle state transitions', async () => {
      const sessionKey = 'test-validation:agent1:thread1';
      const dedupeKey = 'lifecycle-test-' + Date.now();

      // Insert pending effect
      const result = await prisma.$queryRaw<Array<{ id: string }>>`
        INSERT INTO effects (
          id, session_key, checkpoint_id, type, payload, dedupe_key,
          status, created_at, updated_at, attempt_count
        ) VALUES (
          gen_random_uuid(), ${sessionKey}, 'checkpoint-1', 'send_message',
          '{"content":"test","requestId":"req1","isFinal":true}', ${dedupeKey},
          'pending', NOW(), NOW(), 0
        )
        RETURNING id
      `;

      const effectId = result[0].id;

      // Update to executing
      await prisma.$executeRaw`
        UPDATE effects 
        SET status = 'executing', attempt_count = attempt_count + 1, last_attempt_at = NOW()
        WHERE id = ${effectId}::uuid
      `;

      // Update to completed
      await prisma.$executeRaw`
        UPDATE effects 
        SET status = 'completed', updated_at = NOW()
        WHERE id = ${effectId}::uuid
      `;

      // Verify final state
      const final = await prisma.$queryRaw<
        Array<{ status: string; attempt_count: number; last_attempt_at: Date | null }>
      >`
        SELECT status, attempt_count, last_attempt_at 
        FROM effects 
        WHERE id = ${effectId}::uuid
      `;

      expect(final[0].status).toBe('completed');
      expect(final[0].attempt_count).toBe(1);
      expect(final[0].last_attempt_at).toBeInstanceOf(Date);
    });
  });

  describe('integration', () => {
    it('should support complete event→effect flow', async () => {
      const sessionKey = 'test-validation:agent1:thread1';

      // Create event (user message)
      const eventResult = await prisma.$queryRaw<Array<{ id: string }>>`
        INSERT INTO events (id, session_key, seq, type, payload, created_at)
        VALUES (gen_random_uuid(), ${sessionKey}, 1, 'user_message', '{"text":"Hello"}', NOW())
        RETURNING id
      `;

      const eventId = eventResult[0].id;
      expect(eventId).toBeDefined();

      // Create corresponding effect (agent response)
      const dedupeKey = `${sessionKey}:checkpoint-1:0`;
      const effectResult = await prisma.$queryRaw<Array<{ id: string }>>`
        INSERT INTO effects (
          id, session_key, checkpoint_id, type, payload, dedupe_key,
          status, created_at, updated_at, attempt_count
        ) VALUES (
          gen_random_uuid(), ${sessionKey}, 'checkpoint-1', 'send_message',
          '{"content":"Hi there!","requestId":"req1","isFinal":true}', ${dedupeKey},
          'pending', NOW(), NOW(), 0
        )
        RETURNING id
      `;

      const effectId = effectResult[0].id;
      expect(effectId).toBeDefined();

      // Verify both exist and are linked by session_key
      const linked = await prisma.$queryRaw<
        Array<{ event_id: string; event_type: string; effect_id: string; effect_type: string }>
      >`
        SELECT 
          e.id as event_id, 
          e.type as event_type,
          ef.id as effect_id,
          ef.type as effect_type
        FROM events e
        JOIN effects ef ON e.session_key = ef.session_key
        WHERE e.id = ${eventId}::uuid AND ef.id = ${effectId}::uuid
      `;

      expect(linked.length).toBe(1);
      expect(linked[0].event_type).toBe('user_message');
      expect(linked[0].effect_type).toBe('send_message');
    });
  });

  describe('timers table', () => {
    it('should have required schema columns', async () => {
      const columns = await prisma.$queryRaw<Array<{ column_name: string; data_type: string }>>`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'timers' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `;

      const columnNames = columns.map((col) => col.column_name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('session_key');
      expect(columnNames).toContain('timer_id');
      expect(columnNames).toContain('fire_at_ms');
      expect(columnNames).toContain('payload');
      expect(columnNames).toContain('status');
      expect(columnNames).toContain('created_at');
      expect(columnNames).toContain('updated_at');
    });

    it('should enforce unique constraint on (session_key, timer_id)', async () => {
      const sessionKey = 'test-validation:agent1:thread1';
      const timerId = 'timer-unique-' + Date.now();

      // Insert first timer
      await prisma.$executeRaw`
        INSERT INTO timers (id, session_key, timer_id, fire_at_ms, status, created_at, updated_at)
        VALUES (gen_random_uuid(), ${sessionKey}, ${timerId}, 1000000000000, 'pending', NOW(), NOW())
      `;

      // Attempt duplicate insert (should fail)
      await expect(async () => {
        await prisma.$executeRaw`
          INSERT INTO timers (id, session_key, timer_id, fire_at_ms, status, created_at, updated_at)
          VALUES (gen_random_uuid(), ${sessionKey}, ${timerId}, 2000000000000, 'pending', NOW(), NOW())
        `;
      }).rejects.toThrow(/already exists/i);
    });

    it('should support upsert pattern for timer updates', async () => {
      const sessionKey = 'test-validation:agent1:thread1';
      const timerId = 'timer-upsert-' + Date.now();
      const fireAt1 = 1000000000000;
      const fireAt2 = 2000000000000;

      // First insert
      await prisma.$executeRaw`
        INSERT INTO timers (id, session_key, timer_id, fire_at_ms, status, created_at, updated_at)
        VALUES (gen_random_uuid(), ${sessionKey}, ${timerId}, ${fireAt1}, 'pending', NOW(), NOW())
        ON CONFLICT (session_key, timer_id) DO UPDATE SET 
          fire_at_ms = EXCLUDED.fire_at_ms,
          updated_at = NOW()
      `;

      // Upsert (should update fire_at_ms)
      await prisma.$executeRaw`
        INSERT INTO timers (id, session_key, timer_id, fire_at_ms, status, created_at, updated_at)
        VALUES (gen_random_uuid(), ${sessionKey}, ${timerId}, ${fireAt2}, 'pending', NOW(), NOW())
        ON CONFLICT (session_key, timer_id) DO UPDATE SET 
          fire_at_ms = EXCLUDED.fire_at_ms,
          updated_at = NOW()
      `;

      // Verify updated fire_at_ms
      const result = await prisma.$queryRaw<Array<{ fire_at_ms: string }>>`
        SELECT fire_at_ms FROM timers 
        WHERE session_key = ${sessionKey} AND timer_id = ${timerId}
      `;

      expect(result.length).toBe(1);
      expect(Number(result[0].fire_at_ms)).toBe(fireAt2);
    });

    it('should have required indexes for efficient polling', async () => {
      const indexes = await prisma.$queryRaw<Array<{ indexname: string; indexdef: string }>>`
        SELECT indexname, indexdef
        FROM pg_indexes 
        WHERE tablename = 'timers' AND schemaname = 'public'
      `;

      // Should have composite index on (status, fire_at_ms) for TimerWorker polling
      const hasStatusFireAtIndex = indexes.some(
        (idx) => idx.indexdef.includes('status') && idx.indexdef.includes('fire_at_ms'),
      );
      expect(hasStatusFireAtIndex).toBe(true);

      // Should have session_key index for session-specific queries
      const hasSessionKeyIndex = indexes.some((idx) => idx.indexdef.includes('session_key'));
      expect(hasSessionKeyIndex).toBe(true);
    });
  });
});
