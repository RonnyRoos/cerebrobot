import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AIMessage } from '@langchain/core/messages';
import { LangGraphChatAgent } from '../langgraph-agent.js';
import type { AgentStreamEvent, ChatInvocationContext } from '../../chat/chat-agent.js';
import type { ServerConfig } from '../../config.js';

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

const baseConfig: ServerConfig = {
  systemPrompt: 'You are Cerebrobot.',
  personaTag: '',
  model: 'gpt-4o-mini',
  temperature: 0.1,
  hotpathLimit: 3,
  hotpathTokenBudget: 200,
  recentMessageFloor: 2,
  hotpathMarginPct: 0,
  port: 3000,
  persistence: { provider: 'memory' },
};

const createContext = (overrides: Partial<ChatInvocationContext> = {}): ChatInvocationContext => ({
  sessionId: 'session-1',
  userId: 'user-123', // REQUIRED: userId must be provided
  message: 'Hello?',
  correlationId: 'corr-1',
  config: baseConfig,
  ...overrides,
});

describe('LangGraphChatAgent', () => {
  beforeEach(() => {
    process.env.DEEPINFRA_API_KEY = 'test-key';
    chatInvokeHandlers.length = 0;
    summarizerInvokeHandlers.length = 0;
    vi.clearAllMocks();
  });

  it('streams chat events and emits a final assistant message', async () => {
    chatInvokeHandlers.push(async () => new AIMessage('Hello world'));

    const agent = new LangGraphChatAgent({ config: baseConfig });
    const iterator = agent.streamChat(createContext());

    const finalEvent = await lastEvent(iterator);

    assertFinalEvent(finalEvent);
    expect(finalEvent.message).toBe('Hello world');
    expect(finalEvent.latencyMs).toBeGreaterThanOrEqual(0);
    expect(finalEvent.tokenUsage).toBeDefined();
    expect(finalEvent.tokenUsage?.budget).toBe(baseConfig.hotpathTokenBudget);
  });

  it('produces buffered output via completeChat', async () => {
    chatInvokeHandlers.push(async () => new AIMessage('Buffered reply'));

    const agent = new LangGraphChatAgent({ config: baseConfig });

    const result = await agent.completeChat(createContext({ message: 'Buffered?' }));

    expect(result).toMatchObject({
      message: 'Buffered reply',
      latencyMs: expect.any(Number),
    });
  });

  it('summarizes when the hotpath limit is exceeded and persists summary', async () => {
    const configWithTightLimit: ServerConfig = {
      ...baseConfig,
      hotpathLimit: 1,
      recentMessageFloor: 1,
    };

    chatInvokeHandlers.push(async () => new AIMessage('first reply'));
    chatInvokeHandlers.push(async () => new AIMessage('second reply'));

    summarizerInvokeHandlers.push(async () => new AIMessage('summary of first turn'));

    const agent = new LangGraphChatAgent({ config: configWithTightLimit });

    await agent.completeChat(createContext({ message: 'First message' }));
    await agent.completeChat(createContext({ message: 'Second message' }));

    const state = await (
      agent as unknown as {
        graphContext: {
          graph: {
            getState: (config: { configurable: { thread_id: string } }) => Promise<{
              values: {
                summary?: string | null;
                summaryUpdatedAt?: string | null;
                messages?: unknown[];
              };
            }>;
          };
        };
      }
    ).graphContext.graph.getState({ configurable: { thread_id: 'session-1' } });

    expect(state.values.summary).toBe('summary of first turn');
    expect(state.values.summaryUpdatedAt).toBeDefined();
    expect(typeof state.values.summaryUpdatedAt).toBe('string');
    expect(Array.isArray(state.values.messages)).toBe(true);
    expect(summarizerInvokeHandlers.length).toBe(0);
    const usage = (state.values as { tokenUsage?: { budget: number; recentTokens: number } })
      .tokenUsage;
    expect(usage).toMatchObject({
      budget: configWithTightLimit.hotpathTokenBudget,
      recentTokens: expect.any(Number),
    });
  });

  it('summarizes when the token budget is exceeded even with ample message slots', async () => {
    const configWithTightBudget: ServerConfig = {
      ...baseConfig,
      hotpathLimit: 2,
      hotpathTokenBudget: 50,
      recentMessageFloor: 1,
      hotpathMarginPct: 0.1,
    };

    const longUserMessage = 'This is a very long message that should take many tokens.'.repeat(5);

    chatInvokeHandlers.push(
      async () => new AIMessage('Initial reply that will later be summarized.'),
    );
    chatInvokeHandlers.push(async () => new AIMessage('Most recent reply that should remain.'));
    summarizerInvokeHandlers.push(async () => new AIMessage('condensed history'));

    const agent = new LangGraphChatAgent({ config: configWithTightBudget });

    await agent.completeChat(createContext({ message: longUserMessage }));
    await agent.completeChat(createContext({ message: `${longUserMessage} second turn` }));

    const state = await (
      agent as unknown as {
        graphContext: {
          graph: {
            getState: (config: { configurable: { thread_id: string } }) => Promise<{
              values: {
                summary?: string | null;
                messages?: unknown[];
              };
            }>;
          };
        };
      }
    ).graphContext.graph.getState({ configurable: { thread_id: 'session-1' } });

    expect(state.values.summary).toBe('condensed history');
    expect((state.values.messages ?? []).length).toBeGreaterThan(0);
    expect(summarizerInvokeHandlers.length).toBe(0);
    const usage = (state.values as { tokenUsage?: { budget: number; recentTokens: number } })
      .tokenUsage;
    expect(usage).toMatchObject({
      budget: configWithTightBudget.hotpathTokenBudget,
      recentTokens: expect.any(Number),
    });
  });

  it('resets state for a session', async () => {
    chatInvokeHandlers.push(async () => new AIMessage('reply'));

    const agent = new LangGraphChatAgent({ config: baseConfig });
    await agent.completeChat(createContext());

    await agent.reset('session-1', 'user-123');

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
    ).graphContext.graph.getState({ configurable: { thread_id: 'session-1' } });

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
