import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import { buildServer } from '../../app.js';
import type { ChatAgent, AgentStreamEvent } from '../chat-agent.js';
import type { ThreadManager } from '../../thread-manager/thread-manager.js';

function createThreadManager(): ThreadManager {
  return {
    issueThread: vi.fn(async () => 'unused'),
    getThread: vi.fn(async (threadId: string) => ({
      id: threadId,
      agentId: 'my-agent',
      userId: 'test-user',
    })),
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

describe('Chat routes', () => {
  let threadManager: ThreadManager;

  beforeEach(() => {
    threadManager = createThreadManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers only the WebSocket streaming endpoint for chat streaming', async () => {
    const agent = createAgent();
    const mockCheckpointer = {} as BaseCheckpointSaver;
    const { server: app } = buildServer({
      threadManager,
      getAgent: async () => agent,
      checkpointer: mockCheckpointer,
    });
    await app.ready();

    try {
      expect(app.hasRoute({ method: 'GET', url: '/api/chat/ws' })).toBe(true);
      // Verify no dedicated SSE endpoint exists (SSE functionality was removed)
      expect(app.hasRoute({ method: 'GET', url: '/api/chat/sse' })).toBe(false);
    } finally {
      await app.close();
    }
  });

  it('falls back to buffered JSON for non-streaming requests and omits summaries', async () => {
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
    const { server: app } = buildServer({
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

    await app.close();
  });
});
