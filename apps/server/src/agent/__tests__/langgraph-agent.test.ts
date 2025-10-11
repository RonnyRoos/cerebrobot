import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AIMessage } from '@langchain/core/messages';
import { MemorySaver } from '@langchain/langgraph';
import { LangGraphChatAgent } from '../langgraph-agent.js';
import type { AgentStreamEvent, ChatInvocationContext } from '../../chat/chat-agent.js';
import type { AgentConfig } from '../../config/agent-config.js';

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

    const mockModel = {
      invoke: vi.fn(async (messages: unknown[], invokeOptions?: Record<string, unknown>) => {
        const handler = invokeHandlers.shift();
        if (!handler) {
          return new AIMessage('default response');
        }
        return handler({ messages, options: invokeOptions });
      }),
      stream: vi.fn(async function* () {
        // No-op placeholder; streamChat relies on LangGraph stream aggregation
      }),
      bindTools: vi.fn(function (this: unknown) {
        return this; // Return self to enable method chaining
      }),
    };

    return mockModel;
  }),
}));

const mockAgentConfig: AgentConfig = {
  id: '00000000-0000-0000-0000-000000000000',
  name: 'Test Agent',
  systemPrompt: 'You are Cerebrobot.',
  personaTag: 'test',
  llm: {
    model: 'gpt-4o-mini',
    temperature: 0.1,
    apiKey: 'test-key',
    apiBase: 'https://api.test.com/v1/openai',
  },
  memory: {
    hotPathLimit: 3,
    hotPathTokenBudget: 200,
    recentMessageFloor: 2,
    hotPathMarginPct: 0,
    embeddingModel: 'test-embedding-model',
    embeddingEndpoint: 'https://api.test.com/v1/openai',
    similarityThreshold: 0.7,
    maxTokens: 2048,
    injectionBudget: 1000,
    retrievalTimeoutMs: 5000,
  },
};

const createContext = (overrides: Partial<ChatInvocationContext> = {}): ChatInvocationContext => ({
  threadId: 'thread-1',
  userId: 'user-123', // REQUIRED: userId must be provided
  message: 'Hello?',
  correlationId: 'corr-1',
  ...overrides,
});

describe('LangGraphChatAgent', () => {
  let checkpointer: MemorySaver;

  beforeEach(() => {
    process.env.DEEPINFRA_API_KEY = 'test-key';
    chatInvokeHandlers.length = 0;
    summarizerInvokeHandlers.length = 0;
    checkpointer = new MemorySaver();
    vi.clearAllMocks();
  });

  it('streams chat events and emits a final assistant message', async () => {
    chatInvokeHandlers.push(async () => new AIMessage('Hello world'));

    const agent = new LangGraphChatAgent(mockAgentConfig, undefined, checkpointer);
    const iterator = agent.streamChat(createContext());

    const finalEvent = await lastEvent(iterator);

    assertFinalEvent(finalEvent);
    expect(finalEvent.message).toBe('Hello world');
    expect(finalEvent.latencyMs).toBeGreaterThanOrEqual(0);
    expect(finalEvent.tokenUsage).toBeDefined();
    expect(finalEvent.tokenUsage?.budget).toBe(mockAgentConfig.memory.hotPathTokenBudget);
  });

  it('produces buffered output via completeChat', async () => {
    chatInvokeHandlers.push(async () => new AIMessage('Buffered reply'));

    const agent = new LangGraphChatAgent(mockAgentConfig, undefined, checkpointer);

    const result = await agent.completeChat(createContext({ message: 'Buffered?' }));

    expect(result.message).toBe('Buffered reply');
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('resets state for a session', async () => {
    chatInvokeHandlers.push(async () => new AIMessage('reply'));

    const agent = new LangGraphChatAgent(mockAgentConfig, undefined, checkpointer);
    await agent.completeChat(createContext());

    await agent.reset('thread-1', 'user-123');

    const state = await (
      agent as unknown as {
        graphContext: {
          graph: {
            getState: (config: { configurable: { thread_id: string } }) => Promise<{
              values: { messages?: unknown[]; summary?: string | null };
            }>;
          };
        };
      }
    ).graphContext.graph.getState({ configurable: { thread_id: 'thread-1' } });

    expect(state.values.messages ?? []).toHaveLength(0);
    expect(state.values.summary).toBeNull();
  });
});

type FinalAgentEvent = Extract<AgentStreamEvent, { type: 'final' }>;

async function lastEvent(iterable: AsyncIterable<AgentStreamEvent>) {
  let finalEvent: AgentStreamEvent | undefined;
  for await (const event of iterable) {
    finalEvent = event;
  }
  if (!finalEvent) {
    throw new Error('No events emitted');
  }
  return finalEvent;
}

function assertFinalEvent(event: AgentStreamEvent): asserts event is FinalAgentEvent {
  if (event.type !== 'final') {
    throw new Error(`Expected final event, received ${event.type}`);
  }
}
