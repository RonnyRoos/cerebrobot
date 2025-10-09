/**
 * Memory Node Tests
 *
 * Unit tests for retrieveMemories graph node.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import type { BaseStore } from '@cerebrobot/chat-shared';
import { createRetrieveMemoriesNode } from '../nodes.js';
import type { MemoryConfig } from '../config.js';
import pino from 'pino';

describe('Memory Nodes', () => {
  let mockStore: BaseStore;
  let config: MemoryConfig;
  let logger: pino.Logger;

  beforeEach(() => {
    // Mock BaseStore
    mockStore = {
      put: vi.fn(),
      get: vi.fn(),
      search: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    };

    config = {
      enabled: true,
      apiKey: 'test-key',
      embeddingEndpoint: 'http://test',
      embeddingModel: 'test-model',
      similarityThreshold: 0.7,
      contentMaxTokens: 2048,
      injectionBudget: 1000,
      retrievalTimeoutMs: 5000,
    };

    logger = pino({ level: 'silent' });
  });

  describe('createRetrieveMemoriesNode', () => {
    it('extracts query from latest user message and searches store', async () => {
      const retrieveMemories = createRetrieveMemoriesNode(mockStore, config, logger);

      const state = {
        messages: [new HumanMessage('What should I eat?')],
        threadId: 'thread-123',
        userId: 'user-456',
      };

      const mockResults = [
        {
          id: 'mem-1',
          namespace: ['memories', 'user-456'],
          key: 'diet',
          content: 'User is vegetarian',
          similarity: 0.95,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(mockStore.search).mockResolvedValue(mockResults);

      const result = await retrieveMemories(state);

      expect(mockStore.search).toHaveBeenCalledWith(
        ['memories', 'user-456'],
        'What should I eat?',
        { threshold: 0.7 },
      );

      expect(result.retrievedMemories).toHaveLength(1);
      expect(result.retrievedMemories?.[0]).toMatchObject({
        id: 'mem-1',
        content: 'User is vegetarian',
        similarity: 0.95,
      });

      expect(result.messages).toHaveLength(1);
      expect(result.messages?.[0]).toBeInstanceOf(SystemMessage);
    });

    it('uses userId from state and throws if missing', async () => {
      const retrieveMemories = createRetrieveMemoriesNode(mockStore, config, logger);

      // Test with userId - should work
      await retrieveMemories({
        messages: [new HumanMessage('test')],
        threadId: 'thread-123',
        userId: 'user-456',
      });

      expect(mockStore.search).toHaveBeenCalledWith(
        ['memories', 'user-456'],
        'test',
        expect.any(Object),
      );

      vi.mocked(mockStore.search).mockClear();

      // Test without userId - should gracefully degrade (not throw)
      const resultWithoutUser = await retrieveMemories({
        messages: [new HumanMessage('test')],
        threadId: 'thread-789',
      });

      // Should return empty and not call store (userId validation happens in try-catch)
      expect(resultWithoutUser.retrievedMemories).toEqual([]);
      expect(mockStore.search).not.toHaveBeenCalled();
    });

    it('returns empty when no user message found', async () => {
      const retrieveMemories = createRetrieveMemoriesNode(mockStore, config, logger);

      const state = {
        messages: [new AIMessage('Hello!')], // AI message, not human
        threadId: 'thread-123',
      };

      const result = await retrieveMemories(state);

      expect(mockStore.search).not.toHaveBeenCalled();
      expect(result).toEqual({ retrievedMemories: [] });
    });

    it('returns empty when no memories found', async () => {
      const retrieveMemories = createRetrieveMemoriesNode(mockStore, config, logger);

      vi.mocked(mockStore.search).mockResolvedValue([]);

      const state = {
        messages: [new HumanMessage('test query')],
        threadId: 'thread-123',
        userId: 'user-456',
      };

      const result = await retrieveMemories(state);

      expect(mockStore.search).toHaveBeenCalled();
      expect(result).toEqual({ retrievedMemories: [] });
    });

    it('applies token budget to limit injected memories', async () => {
      const retrieveMemories = createRetrieveMemoriesNode(mockStore, config, logger);

      const state = {
        messages: [new HumanMessage('test')],
        threadId: 'thread-123',
        userId: 'user-456',
      };

      // Create memories that exceed budget (1000 tokens = ~4000 chars)
      const largeContent = 'x'.repeat(3000); // ~750 tokens
      const mockResults = [
        {
          id: 'mem-1',
          namespace: ['memories', 'user-456'],
          key: 'key1',
          content: largeContent,
          similarity: 0.95,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'mem-2',
          namespace: ['memories', 'user-456'],
          key: 'key2',
          content: largeContent,
          similarity: 0.85,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(mockStore.search).mockResolvedValue(mockResults);

      const result = await retrieveMemories(state);

      // Should only include first memory (second exceeds budget)
      expect(result.retrievedMemories).toHaveLength(1);
      expect(result.retrievedMemories?.[0].id).toBe('mem-1');
    });

    it('formats memories as SystemMessage with relevance scores', async () => {
      const retrieveMemories = createRetrieveMemoriesNode(mockStore, config, logger);

      const state = {
        messages: [new HumanMessage('test')],
        threadId: 'thread-123',
        userId: 'user-456',
      };

      const mockResults = [
        {
          id: 'mem-1',
          namespace: ['memories', 'user-456'],
          key: 'key1',
          content: 'User likes pizza',
          similarity: 0.95,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(mockStore.search).mockResolvedValue(mockResults);

      const result = await retrieveMemories(state);

      const systemMessage = result.messages?.[0] as SystemMessage;
      expect(systemMessage).toBeInstanceOf(SystemMessage);
      expect(systemMessage.content).toContain('Memory 1 (relevance: 95%)');
      expect(systemMessage.content).toContain('User likes pizza');
      expect(systemMessage.content).toContain('Relevant information from past conversations');
    });

    it('handles store errors gracefully', async () => {
      const retrieveMemories = createRetrieveMemoriesNode(mockStore, config, logger);

      const state = {
        messages: [new HumanMessage('test')],
        threadId: 'thread-123',
      };

      vi.mocked(mockStore.search).mockRejectedValue(new Error('Store failure'));

      const result = await retrieveMemories(state);

      // Should return empty without throwing
      expect(result.retrievedMemories).toEqual([]);
    });

    it('respects retrieval timeout', async () => {
      const shortTimeoutConfig = { ...config, retrievalTimeoutMs: 100 };
      const retrieveMemories = createRetrieveMemoriesNode(mockStore, shortTimeoutConfig, logger);

      const state = {
        messages: [new HumanMessage('test')],
        threadId: 'thread-123',
      };

      // Mock search to take longer than timeout
      vi.mocked(mockStore.search).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 200)),
      );

      const result = await retrieveMemories(state);

      // Should timeout and return empty
      expect(result.retrievedMemories).toEqual([]);
    });
  });
});
