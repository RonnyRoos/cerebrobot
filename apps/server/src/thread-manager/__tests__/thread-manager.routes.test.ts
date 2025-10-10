import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import { buildServer } from '../../app.js';
import type { ChatAgent } from '../../chat/chat-agent.js';
import type { ServerConfig } from '../../config.js';
import type { ThreadManager } from '../thread-manager.js';

vi.mock('../../config/agent-loader.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../config/agent-loader.js')>();
  return {
    ...actual,
    loadAgentConfig: vi.fn(async () => ({
      id: 'my-agent',
      name: 'Test Agent',
      description: 'Test agent for unit tests',
      llm: {
        provider: 'openai-compatible',
        apiBase: 'https://api.test.com',
        apiKey: 'test-key',
        model: 'test-model',
        temperature: 0.7,
      },
      memory: {
        embeddingModel: 'test-embedding',
        similarityThreshold: 0.5,
        contentMaxTokens: 2048,
      },
      behavior: {
        systemPrompt: 'Test prompt',
        personaTag: 'test',
        hotpathLimit: 8,
        recentMessageFloor: 2,
        hotpathTokenBudget: 3000,
        hotpathMarginPct: 0.1,
      },
    })),
  };
});

describe('thread creation routes', () => {
  let threadManager: ThreadManager;
  let chatAgent: ChatAgent;
  let config: ServerConfig;

  beforeEach(() => {
    threadManager = {
      issueThread: vi.fn(),
      getThread: vi.fn(),
      resetThread: vi.fn(),
    };

    chatAgent = {
      async *streamChat() {
        yield { type: 'final', message: 'stub', latencyMs: 0 };
      },
      async completeChat() {
        return { message: 'stub', summary: undefined, latencyMs: 0 };
      },
    };

    config = {
      systemPrompt: 'Test prompt',
      personaTag: 'tester',
      model: 'test-model',
      temperature: 0.1,
      hotpathLimit: 8,
      recentMessageFloor: 2,
      hotpathTokenBudget: 3000,
      hotpathMarginPct: 0.1,
      port: 0,
      persistence: { provider: 'memory' },
    };
  });

  afterEach(async () => {
    vi.restoreAllMocks();
  });

  it('creates a new thread identifier', async () => {
    const threadId = 'thread-new-123';
    vi.mocked(threadManager.issueThread).mockResolvedValue(threadId);

    const mockCheckpointer = {} as BaseCheckpointSaver;
    const getAgent = async () => chatAgent;
    const app = buildServer({
      threadManager,
      getAgent,
      config,
      checkpointer: mockCheckpointer,
    });
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/api/thread',
      headers: { 'content-type': 'application/json' },
      payload: { agentId: 'my-agent' },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ threadId });
    expect(threadManager.issueThread).toHaveBeenCalledTimes(1);
    expect(threadManager.issueThread).toHaveBeenCalledWith('my-agent', undefined);
    expect(threadManager.resetThread).not.toHaveBeenCalled();

    await app.close();
  });

  it('resets provided previous thread before issuing a new one', async () => {
    const threadId = 'thread-new-456';
    vi.mocked(threadManager.issueThread).mockResolvedValue(threadId);

    const mockCheckpointer = {} as BaseCheckpointSaver;
    const getAgent = async () => chatAgent;
    const app = buildServer({
      threadManager,
      getAgent,
      config,
      checkpointer: mockCheckpointer,
    });
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/api/thread',
      headers: { 'content-type': 'application/json' },
      payload: {
        agentId: 'my-agent',
        previousThreadId: 'thread-old-999',
        userId: '550e8400-e29b-41d4-a716-446655440000',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ threadId });
    expect(threadManager.resetThread).toHaveBeenCalledTimes(1);
    expect(threadManager.resetThread).toHaveBeenCalledWith(
      'thread-old-999',
      '550e8400-e29b-41d4-a716-446655440000',
    );
    expect(threadManager.issueThread).toHaveBeenCalledTimes(1);
    expect(threadManager.issueThread).toHaveBeenCalledWith(
      'my-agent',
      '550e8400-e29b-41d4-a716-446655440000',
    );

    await app.close();
  });

  it('rejects invalid payloads', async () => {
    const mockCheckpointer = {} as BaseCheckpointSaver;
    const getAgent = async () => chatAgent;
    const app = buildServer({
      threadManager,
      getAgent,
      config,
      checkpointer: mockCheckpointer,
    });
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/api/thread',
      headers: { 'content-type': 'application/json' },
      payload: { previousThreadId: '' },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });
});
