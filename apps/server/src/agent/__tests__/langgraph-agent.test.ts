import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatOpenAI } from '@langchain/openai';
import { LangGraphChatAgent } from '../langgraph-agent.js';
import type { AgentStreamEvent, ChatInvocationContext } from '../../chat/chat-agent.js';
import type { ServerConfig } from '../../config.js';
import type { InMemoryLangMem } from '../memory.js';

const streamMock = vi.fn();
const invokeMock = vi.fn();

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn(() => ({
    stream: streamMock,
    invoke: invokeMock,
  })),
}));

const baseConfig: ServerConfig = {
  systemPrompt: 'You are Cerebrobot.',
  personaTag: '',
  model: 'gpt-4o-mini',
  temperature: 0.1,
  hotpathLimit: 8,
  port: 3000,
};

const createContext = (overrides: Partial<ChatInvocationContext> = {}): ChatInvocationContext => ({
  sessionId: 'session-1',
  message: 'Hello?',
  correlationId: 'corr-1',
  config: baseConfig,
  ...overrides,
});

describe('LangGraphChatAgent', () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key';
    streamMock.mockReset();
    invokeMock.mockReset();
    vi.mocked(ChatOpenAI).mockClear();
  });

  it('streams incremental tokens and records the final assistant reply', async () => {
    const chunks = [{ content: 'Hello ' }, { content: 'world   ' }];

    streamMock.mockResolvedValue(
      (async function* () {
        for (const chunk of chunks) {
          yield chunk;
        }
      })(),
    );

    const agent = new LangGraphChatAgent({
      config: baseConfig,
      hotpathLimit: baseConfig.hotpathLimit,
    });
    const events: AgentStreamEvent[] = [];

    for await (const event of agent.streamChat(createContext())) {
      events.push(event);
    }

    expect(streamMock).toHaveBeenCalledTimes(1);
    expect(streamMock.mock.calls[0][1]).toEqual({ configurable: { thread_id: 'session-1' } });
    expect(invokeMock).not.toHaveBeenCalled();

    expect(events).toEqual([
      { type: 'token', value: 'Hello ' },
      { type: 'token', value: 'world   ' },
      {
        type: 'final',
        message: 'Hello world',
        latencyMs: expect.any(Number),
      },
    ]);

    const memory = (agent as unknown as { memory: InMemoryLangMem }).memory;
    const snapshot = memory.snapshot('session-1');
    expect(snapshot.messages.at(-1)?.content).toBe('Hello world');
  });

  it('collects a buffered response via invoke for completeChat', async () => {
    invokeMock.mockResolvedValue({ content: 'Buffered reply' });

    const agent = new LangGraphChatAgent({
      config: baseConfig,
      hotpathLimit: baseConfig.hotpathLimit,
    });

    const result = await agent.completeChat(createContext({ message: 'Buffered?' }));

    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(streamMock).not.toHaveBeenCalled();

    expect(result).toMatchObject({
      message: 'Buffered reply',
      latencyMs: expect.any(Number),
    });

    const memory = (agent as unknown as { memory: InMemoryLangMem }).memory;
    const snapshot = memory.snapshot('session-1');
    expect(snapshot.messages.at(-1)?.content).toBe('Buffered reply');
  });
});
