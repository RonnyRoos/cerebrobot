/**
 * Unit tests for memory event emission in upsertMemory tool
 *
 * Tests verify that memory.created events are properly broadcasted
 * via ConnectionManager when memories are stored.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createUpsertMemoryTool } from '../tools.js';
import { MemoryCreatedEventSchema } from '@cerebrobot/chat-shared';
import type { MemoryConfig } from '../config.js';
import type { BaseStore } from '@cerebrobot/chat-shared';
import type { ConnectionManager } from '../../../chat/connection-manager.js';
import pino from 'pino';

// Mock the embedding generation
vi.mock('../index.js', () => ({
  generateEmbedding: vi.fn(async () => new Array(384).fill(0.1)), // 384-dimensional embedding
}));

describe('Memory Event Emission', () => {
  let store: BaseStore;
  let config: MemoryConfig;
  let logger: pino.Logger;
  let mockConnectionManager: Partial<ConnectionManager>;

  beforeEach(() => {
    // Mock store
    store = {
      put: vi.fn(async () => {}),
      get: vi.fn(),
      search: vi.fn(async () => []), // Return no duplicates by default
      delete: vi.fn(),
      list: vi.fn(),
    };

    // Test config
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

    // Silent logger for tests
    logger = pino({ level: 'silent' });

    // Mock ConnectionManager with spy
    mockConnectionManager = {
      broadcastMemoryEvent: vi.fn(),
    };
  });

  it('emits memory.created event when connectionManager and threadId are present', async () => {
    const tool = createUpsertMemoryTool(
      store,
      config,
      logger,
      mockConnectionManager as ConnectionManager,
    );

    const threadId = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID

    const result = await tool.invoke(
      { content: 'User prefers sardine pizza' },
      {
        configurable: {
          userId: 'user-123',
          agentId: 'agent-456',
          thread_id: threadId,
        },
      },
    );

    // Tool should succeed
    expect(result.success).toBe(true);

    // ConnectionManager should have been called
    expect(mockConnectionManager.broadcastMemoryEvent).toHaveBeenCalledTimes(1);

    // Verify event structure
    const broadcastCall = vi.mocked(mockConnectionManager.broadcastMemoryEvent!).mock.calls[0];
    const [broadcastThreadId, event] = broadcastCall;

    expect(broadcastThreadId).toBe(threadId);
    expect(event).toHaveProperty('type', 'memory.created');
    expect(event).toHaveProperty('threadId', threadId);
    expect(event).toHaveProperty('timestamp');
    expect(event).toHaveProperty('memory');

    // Verify event matches schema
    const parseResult = MemoryCreatedEventSchema.safeParse(event);
    expect(parseResult.success).toBe(true);

    if (parseResult.success) {
      expect(parseResult.data.memory.content).toBe('User prefers sardine pizza');
      expect(parseResult.data.memory.namespace).toEqual(['memories', 'agent-456', 'user-123']);
    }
  });

  it('does not emit event when connectionManager is undefined', async () => {
    const threadId = '550e8400-e29b-41d4-a716-446655440003'; // Valid UUID

    const tool = createUpsertMemoryTool(
      store,
      config,
      logger,
      undefined, // No ConnectionManager
    );

    const result = await tool.invoke(
      { content: 'User prefers sardine pizza' },
      {
        configurable: {
          userId: 'user-123',
          agentId: 'agent-456',
          thread_id: threadId,
        },
      },
    );

    // Tool should still succeed
    expect(result.success).toBe(true);

    // No broadcast should occur
    expect(mockConnectionManager.broadcastMemoryEvent).not.toHaveBeenCalled();
  });

  it('does not emit event when threadId is missing', async () => {
    const tool = createUpsertMemoryTool(
      store,
      config,
      logger,
      mockConnectionManager as ConnectionManager,
    );

    const result = await tool.invoke(
      { content: 'User prefers sardine pizza' },
      {
        configurable: {
          userId: 'user-123',
          agentId: 'agent-456',
          // No thread_id
        },
      },
    );

    // Tool should still succeed
    expect(result.success).toBe(true);

    // No broadcast should occur without threadId
    expect(mockConnectionManager.broadcastMemoryEvent).not.toHaveBeenCalled();
  });

  it('does not fail tool execution when broadcast throws error', async () => {
    // Mock broadcast to throw
    mockConnectionManager.broadcastMemoryEvent = vi.fn(() => {
      throw new Error('Broadcast failed');
    });

    const threadId = '550e8400-e29b-41d4-a716-446655440001'; // Valid UUID

    const tool = createUpsertMemoryTool(
      store,
      config,
      logger,
      mockConnectionManager as ConnectionManager,
    );

    const result = await tool.invoke(
      { content: 'User prefers sardine pizza' },
      {
        configurable: {
          userId: 'user-123',
          agentId: 'agent-456',
          thread_id: threadId,
        },
      },
    );

    // Tool should still succeed despite broadcast failure
    expect(result.success).toBe(true);

    // Broadcast was attempted
    expect(mockConnectionManager.broadcastMemoryEvent).toHaveBeenCalledTimes(1);

    // Memory was still stored
    expect(store.put).toHaveBeenCalledTimes(1);
  });

  it('includes correct memory metadata in event', async () => {
    const threadId = '550e8400-e29b-41d4-a716-446655440002'; // Valid UUID

    const tool = createUpsertMemoryTool(
      store,
      config,
      logger,
      mockConnectionManager as ConnectionManager,
    );

    await tool.invoke(
      {
        content: 'User prefers sardine pizza',
        key: 'pizza-preference',
      },
      {
        configurable: {
          userId: 'user-123',
          agentId: 'agent-456',
          thread_id: threadId,
        },
      },
    );

    const broadcastCall = vi.mocked(mockConnectionManager.broadcastMemoryEvent!).mock.calls[0];
    const [, event] = broadcastCall;

    const parseResult = MemoryCreatedEventSchema.safeParse(event);
    expect(parseResult.success).toBe(true);

    if (parseResult.success) {
      const { memory } = parseResult.data;

      // Verify memory fields
      expect(memory.key).toBe('pizza-preference');
      expect(memory.content).toBe('User prefers sardine pizza');
      expect(memory.namespace).toEqual(['memories', 'agent-456', 'user-123']);
      expect(memory.embedding).toHaveLength(384);
      expect(memory.embedding![0]).toBe(0.1);

      // Verify timestamps are recent
      const now = Date.now();
      const createdAt = new Date(memory.createdAt).getTime();
      expect(Math.abs(now - createdAt)).toBeLessThan(1000); // Within 1 second
    }
  });
});
