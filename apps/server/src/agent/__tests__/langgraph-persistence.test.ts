import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vitest';
import { AIMessage } from '@langchain/core/messages';
import { PrismaClient } from '@prisma/client';
import { LangGraphChatAgent } from '../langgraph-agent.js';
import { loadConfigFromEnv } from '../../config.js';
import type { ChatInvocationContext } from '../../chat/chat-agent.js';
import { createCheckpointSaver } from '../checkpointer.js';
import { PostgresCheckpointSaver } from '../postgres-checkpoint.js';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { Checkpoint } from '@langchain/langgraph-checkpoint';

const pgUrl = process.env.LANGGRAPH_PG_URL;
const runPgTests = process.env.LANGGRAPH_PG_TESTS === 'true';
const describeIfPg = pgUrl && runPgTests ? describe : describe.skip;

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

describeIfPg('LangGraph Postgres persistence', () => {
  let prisma: PrismaClient;
  let skipReason: string | null = null;

  beforeAll(async () => {
    process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? 'test-key';
    prisma = new PrismaClient({ datasources: { db: { url: pgUrl! } } });
    try {
      await prisma.$queryRawUnsafe('SELECT 1');
    } catch (error) {
      skipReason = `Postgres not reachable at ${pgUrl}: ${(error as Error).message}`;
      await prisma.$disconnect();
    }
  });

  beforeEach(async () => {
    if (skipReason) {
      return;
    }
    chatInvokeHandlers.length = 0;
    summarizerInvokeHandlers.length = 0;
    await prisma.langGraphCheckpointWrite.deleteMany();
    await prisma.langGraphCheckpoint.deleteMany();
  });

  afterAll(async () => {
    if (!skipReason) {
      await prisma.$disconnect();
    }
  });

  it('persists conversation state across agent instances', async () => {
    if (skipReason) {
      return;
    }
    const config = loadConfigFromEnv({ ...baseEnv, LANGGRAPH_PG_URL: pgUrl! });
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
    if (skipReason) {
      return;
    }
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

    await saver.put(
      { configurable: { thread_id: 'connection-loss', checkpoint_ns: '' } },
      checkpoint,
      {},
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
    message: 'Hello persistence?',
    correlationId: `corr-${sessionId}`,
    config,
  };
}
