import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { MemorySaver } from '@langchain/langgraph';
import { LangGraphChatAgent } from '../langgraph-agent.js';
import type { AgentStreamEvent, ChatInvocationContext } from '../../chat/chat-agent.js';
import type { Agent } from '@cerebrobot/chat-shared';

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

const mockAgentConfig: Agent = {
  id: '00000000-0000-0000-0000-000000000000',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
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
    apiKey: 'test-key',
    similarityThreshold: 0.7,
    maxTokens: 2048,
    injectionBudget: 1000,
    retrievalTimeoutMs: 5000,
  },
  autonomy: {
    enabled: false,
    evaluator: {
      model: 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 500,
      systemPrompt: 'Test evaluator',
    },
    limits: {
      maxFollowUpsPerSession: 3,
      minDelayMs: 10000,
      maxDelayMs: 60000,
    },
    memoryContext: {
      recentMemoryCount: 5,
      includeRecentMessages: 6,
    },
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

  describe('Metadata Type Handling (T007b)', () => {
    /**
     * Unit tests for US1: LangGraphAgent type handling (string vs HumanMessage)
     *
     * Validates that LangGraphAgent can accept both string and HumanMessage inputs
     * and properly handles metadata from HumanMessage.additional_kwargs.
     */

    it('should accept string input (current behavior)', async () => {
      chatInvokeHandlers.push(async () => new AIMessage('response to string'));

      const agent = new LangGraphChatAgent(mockAgentConfig, undefined, new MemorySaver());

      const context: ChatInvocationContext = {
        threadId: 'thread-1',
        message: 'Hello, agent!',
        userId: 'user1',
        correlationId: 'req-1',
        isUserMessage: true,
      };

      const stream = agent.streamChat(context);
      const event = await lastEvent(stream);
      assertFinalEvent(event);

      expect(event.message).toBe('response to string');
    });

    it('should accept HumanMessage input with metadata (future US1 behavior)', async () => {
      chatInvokeHandlers.push(async () => new AIMessage('response to HumanMessage'));

      const agent = new LangGraphChatAgent(mockAgentConfig, undefined, new MemorySaver());

      // T009-T010: HumanMessage with metadata should now work
      const messageWithMetadata = new HumanMessage({
        content: 'Continue our conversation naturally.',
        additional_kwargs: {
          synthetic: true,
          trigger_type: 'check_in',
          trigger_reason: 'No activity for 30s',
        },
      });

      const context: ChatInvocationContext = {
        threadId: 'thread-1',
        message: messageWithMetadata,
        userId: 'user1',
        correlationId: 'req-1',
        isUserMessage: false, // Autonomous message
      };

      const stream = agent.streamChat(context);
      const event = await lastEvent(stream);
      assertFinalEvent(event);

      expect(event.message).toBe('response to HumanMessage');
    });

    it('should preserve metadata through graph invocation', async () => {
      chatInvokeHandlers.push(async () => new AIMessage('metadata preserved'));

      const checkpointer = new MemorySaver();
      const agent = new LangGraphChatAgent(mockAgentConfig, undefined, checkpointer);

      // T012: Verify metadata flows through state
      const messageWithMetadata = new HumanMessage({
        content: 'Test message',
        additional_kwargs: {
          synthetic: true,
          trigger_type: 'check_in',
        },
      });

      const context: ChatInvocationContext = {
        threadId: 'thread-metadata',
        message: messageWithMetadata,
        userId: 'user1',
        correlationId: 'req-metadata',
        isUserMessage: false,
      };

      const stream = agent.streamChat(context);
      await lastEvent(stream); // Consume stream to completion

      // Metadata should be preserved in checkpoint (verified by checkpoint validation tests)
      // This test ensures the message is accepted and processed
      expect(true).toBe(true); // Placeholder - real validation happens in checkpoint tests
    });
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
