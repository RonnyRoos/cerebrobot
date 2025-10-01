import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildServer } from '../../app.js';
import type { ChatAgent } from '../../chat/chat-agent.js';
import type { ServerConfig } from '../../config.js';
import type { SessionManager } from '../session-manager.js';

describe('session routes', () => {
  let sessionManager: SessionManager;
  let chatAgent: ChatAgent;
  let config: ServerConfig;

  beforeEach(() => {
    sessionManager = {
      issueSession: vi.fn(),
      resetSession: vi.fn(),
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
    };
  });

  afterEach(async () => {
    vi.restoreAllMocks();
  });

  it('creates a new session identifier', async () => {
    const sessionId = 'session-new-123';
    vi.mocked(sessionManager.issueSession).mockResolvedValue(sessionId);

    const app = buildServer({ sessionManager, chatAgent, config });
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/api/session',
      headers: { 'content-type': 'application/json' },
      payload: {},
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ sessionId });
    expect(sessionManager.issueSession).toHaveBeenCalledTimes(1);
    expect(sessionManager.resetSession).not.toHaveBeenCalled();

    await app.close();
  });

  it('resets provided previous session before issuing a new one', async () => {
    const sessionId = 'session-new-456';
    vi.mocked(sessionManager.issueSession).mockResolvedValue(sessionId);

    const app = buildServer({ sessionManager, chatAgent, config });
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/api/session',
      headers: { 'content-type': 'application/json' },
      payload: { previousSessionId: 'session-old-999' },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ sessionId });
    expect(sessionManager.resetSession).toHaveBeenCalledTimes(1);
    expect(sessionManager.resetSession).toHaveBeenCalledWith('session-old-999');
    expect(sessionManager.issueSession).toHaveBeenCalledTimes(1);

    await app.close();
  });

  it('rejects invalid payloads', async () => {
    const app = buildServer({ sessionManager, chatAgent, config });
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/api/session',
      headers: { 'content-type': 'application/json' },
      payload: { previousSessionId: '' },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });
});
