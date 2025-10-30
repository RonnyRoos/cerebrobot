import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createUpsertMemoryTool } from '../tools.js';
import type { MemoryConfig } from '../config.js';
import type { BaseStore } from '@cerebrobot/chat-shared';
import pino from 'pino';

vi.mock('../index.js', () => ({
  generateEmbedding: vi.fn(async () => [0.1, 0.2, 0.3]),
}));

describe('createUpsertMemoryTool', () => {
  let store: BaseStore;
  let config: MemoryConfig;
  let logger: pino.Logger;

  beforeEach(() => {
    store = {
      put: vi.fn(),
      get: vi.fn(),
      search: vi.fn(async () => []), // Return no duplicates by default
      delete: vi.fn(),
      list: vi.fn(),
    };

    config = {
      enabled: true,
      apiKey: 'test-api-key',
      embeddingEndpoint: 'https://example.com/embed',
      embeddingModel: 'test-model',
      similarityThreshold: 0.7,
      contentMaxTokens: 2048,
      injectionBudget: 1000,
      retrievalTimeoutMs: 5000,
    };

    logger = pino({ level: 'silent' });
  });

  it('stores memory entries under agent-aware namespaces', async () => {
    const tool = createUpsertMemoryTool(store, config, logger);

    const result = await tool.invoke(
      { content: 'User prefers sardine pizza' },
      {
        configurable: {
          userId: 'user-123',
          agentId: 'agent-456',
        },
      },
    );

    expect(result.success).toBe(true);
    expect(store.put).toHaveBeenCalledTimes(1);

    const [namespace] = vi.mocked(store.put).mock.calls[0];
    expect(namespace).toEqual(['memories', 'agent-456', 'user-123']);
  });

  it('rejects calls when agentId is missing', async () => {
    const tool = createUpsertMemoryTool(store, config, logger);

    const result = await tool.invoke(
      { content: 'User prefers sardine pizza' },
      {
        configurable: {
          userId: 'user-123',
        },
      },
    );

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/agentId/);
    expect(store.put).not.toHaveBeenCalled();
  });
});
