import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import { buildServer } from '../../app.js';
import type { ChatAgent, AgentStreamEvent, ChatInvocationContext } from '../chat-agent.js';
import type { ServerConfig } from '../../config.js';
import type { ThreadManager } from '../../thread-manager/thread-manager.js';

function createServerConfig(): ServerConfig {
  return {
    systemPrompt: 'You are Cerebrobot.',
    personaTag: 'operator',
    model: 'gpt-4o-mini',
    temperature: 0.2,
    hotpathLimit: 16,
    hotpathTokenBudget: 3000,
    recentMessageFloor: 4,
    hotpathMarginPct: 0.1,
    port: 3000,
    persistence: { provider: 'memory' },
  };
}

function createThreadManager(): ThreadManager {
  return {
    issueThread: vi.fn(async () => 'unused'),
    getThread: vi.fn(async () => ({ id: 'test-thread', agentId: 'my-agent', userId: null })),
    resetThread: vi.fn(async () => undefined),
  };
}

function createAgent(overrides: Partial<ChatAgent> = {}): ChatAgent {
  const fallback = async () => ({
    message: 'fallback',
    summary: undefined,
    latencyMs: 0,
  });

  const stream = async function* (): AsyncGenerator<AgentStreamEvent> {
    yield { type: 'token', value: 'stub' };
  };

  return {
    streamChat: vi.fn(stream),
    completeChat: vi.fn(fallback),
    ...overrides,
  };
}

describe('POST /api/chat', () => {
  let config: ServerConfig;
  let threadManager: ThreadManager;

  beforeEach(() => {
    config = createServerConfig();
    threadManager = createThreadManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('streams tokens over SSE and redacts LangMem summaries', async () => {
    const events: AgentStreamEvent[] = [
      { type: 'token', value: 'Hello' },
      { type: 'token', value: ' world' },
      {
        type: 'final',
        message: 'Hello world',
        summary: 'summaries stay internal',
        latencyMs: 1500,
        tokenUsage: { recentTokens: 12, overflowTokens: 0, budget: 3000, utilisationPct: 0 },
      },
    ];

    const agent = createAgent({
      streamChat: vi.fn(async function* () {
        for (const event of events) {
          yield event;
        }
      }),
      completeChat: vi.fn(async () => ({
        message: 'Hello world',
        summary: undefined,
        latencyMs: 1500,
      })),
    });

    const mockCheckpointer = {} as BaseCheckpointSaver;
    const app = buildServer({
      config,
      threadManager,
      getAgent: async () => agent,
      checkpointer: mockCheckpointer,
    });
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/api/chat',
      headers: {
        accept: 'text/event-stream',
        'content-type': 'application/json',
      },
      payload: {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        threadId: 'thread-123',
        message: 'Hello?',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/event-stream');
    expect(response.payload).toContain('data: {"value":"Hello"}');
    expect(response.payload).not.toContain('summary');
    expect(response.payload).toContain('"tokenUsage"');

    expect(agent.streamChat).toHaveBeenCalledTimes(1);
    const invocation = vi.mocked(agent.streamChat).mock.calls[0][0] as ChatInvocationContext;
    expect(invocation.threadId).toBe('thread-123');
    expect(invocation.message).toBe('Hello?');
    expect(invocation.config).toEqual(config);

    await app.close();
  });

  it('falls back to buffered JSON when SSE is not requested and omits summaries', async () => {
    const agent = createAgent({
      streamChat: vi.fn(async function* () {
        // streaming should not occur in fallback mode
      }),
      completeChat: vi.fn(async () => ({
        message: 'Buffered response',
        summary: 'do not leak',
        latencyMs: 2200,
      })),
    });

    const mockCheckpointer = {} as BaseCheckpointSaver;
    const app = buildServer({
      config,
      threadManager,
      getAgent: async () => agent,
      checkpointer: mockCheckpointer,
    });
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/api/chat',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      payload: {
        userId: '550e8400-e29b-41d4-a716-446655440001',
        threadId: 'thread-321',
        message: 'Hi there',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    const body = response.json();
    expect(body).toMatchObject({
      threadId: 'thread-321',
      message: 'Buffered response',
      streamed: false,
      latencyMs: 2200,
    });
    expect(body).not.toHaveProperty('summary');
    expect(body.metadata?.tokenUsage).toBeUndefined();

    expect(agent.completeChat).toHaveBeenCalledTimes(1);
    const invocation = vi.mocked(agent.completeChat).mock.calls[0][0] as ChatInvocationContext;
    expect(invocation.config).toEqual(config);

    await app.close();
  });
});
