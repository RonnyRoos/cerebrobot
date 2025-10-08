/**
 * Memory Node Tests
 *
 * Unit tests for retrieveMemories and storeMemory graph nodes.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import type { BaseStore } from '@cerebrobot/chat-shared';
import { createRetrieveMemoriesNode, createStoreMemoryNode } from '../nodes.js';
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
        sessionId: 'session-123',
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
        sessionId: 'session-123',
        userId: 'user-456',
      });

      expect(mockStore.search).toHaveBeenCalledWith(
        ['memories', 'user-456'],
        'test',
        expect.any(Object),
      );

      vi.mocked(mockStore.search).mockClear();

      // Test without userId - should throw error (no fallback to sessionId)
      await expect(
        retrieveMemories({
          messages: [new HumanMessage('test')],
          sessionId: 'session-789',
        }),
      ).rejects.toThrow('userId is required for memory retrieval');

      expect(mockStore.search).not.toHaveBeenCalled();
    });

    it('returns empty when no user message found', async () => {
      const retrieveMemories = createRetrieveMemoriesNode(mockStore, config, logger);

      const state = {
        messages: [new AIMessage('Hello!')], // AI message, not human
        sessionId: 'session-123',
      };

      const result = await retrieveMemories(state);

      expect(mockStore.search).not.toHaveBeenCalled();
      expect(result).toEqual({});
    });

    it('returns empty when no memories found', async () => {
      const retrieveMemories = createRetrieveMemoriesNode(mockStore, config, logger);

      const state = {
        messages: [new HumanMessage('test query')],
        sessionId: 'session-123',
      };

      vi.mocked(mockStore.search).mockResolvedValue([]);

      const result = await retrieveMemories(state);

      expect(result.retrievedMemories).toEqual([]);
      expect(result.messages).toBeUndefined();
    });

    it('applies token budget to limit injected memories', async () => {
      const retrieveMemories = createRetrieveMemoriesNode(mockStore, config, logger);

      const state = {
        messages: [new HumanMessage('test')],
        sessionId: 'session-123',
      };

      // Create memories that exceed budget (1000 tokens = ~4000 chars)
      const largeContent = 'x'.repeat(3000); // ~750 tokens
      const mockResults = [
        {
          id: 'mem-1',
          namespace: ['memories', 'session-123'],
          key: 'key1',
          content: largeContent,
          similarity: 0.95,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'mem-2',
          namespace: ['memories', 'session-123'],
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
        sessionId: 'session-123',
      };

      const mockResults = [
        {
          id: 'mem-1',
          namespace: ['memories', 'session-123'],
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
        sessionId: 'session-123',
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
        sessionId: 'session-123',
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

  describe('createStoreMemoryNode', () => {
    it('extracts upsertMemory tool calls from AI message', async () => {
      const storeMemory = createStoreMemoryNode(mockStore, config, logger);

      const aiMessage = new AIMessage({
        content: 'I will remember that.',
        tool_calls: [
          {
            name: 'upsertMemory',
            args: {
              content: 'User is vegetarian',
              key: 'diet-preference',
            },
            id: 'call-123',
          },
        ],
      });

      const state = {
        messages: [aiMessage],
        sessionId: 'session-123',
        userId: 'user-456',
      };

      const result = await storeMemory(state);

      expect(result.memoryOperations).toHaveLength(1);
      expect(result.memoryOperations?.[0]).toMatchObject({
        content: 'User is vegetarian',
        key: 'diet-preference',
      });
    });

    it('handles multiple upsertMemory tool calls', async () => {
      const storeMemory = createStoreMemoryNode(mockStore, config, logger);

      const aiMessage = new AIMessage({
        content: 'Noted',
        tool_calls: [
          {
            name: 'upsertMemory',
            args: { content: 'User is vegetarian', key: 'diet' },
            id: 'call-1',
          },
          {
            name: 'upsertMemory',
            args: { content: 'User lives in NYC', key: 'location' },
            id: 'call-2',
          },
        ],
      });

      const state = {
        messages: [aiMessage],
        sessionId: 'session-123',
      };

      const result = await storeMemory(state);

      expect(result.memoryOperations).toHaveLength(2);
      expect(result.memoryOperations?.[0].content).toBe('User is vegetarian');
      expect(result.memoryOperations?.[1].content).toBe('User lives in NYC');
    });

    it('ignores non-upsertMemory tool calls', async () => {
      const storeMemory = createStoreMemoryNode(mockStore, config, logger);

      const aiMessage = new AIMessage({
        content: 'Response',
        tool_calls: [
          {
            name: 'otherTool',
            args: { data: 'something' },
            id: 'call-1',
          },
          {
            name: 'upsertMemory',
            args: { content: 'User likes pizza', key: 'food' },
            id: 'call-2',
          },
        ],
      });

      const state = {
        messages: [aiMessage],
        sessionId: 'session-123',
      };

      const result = await storeMemory(state);

      expect(result.memoryOperations).toHaveLength(1);
      expect(result.memoryOperations?.[0].content).toBe('User likes pizza');
    });

    it('returns empty when no AI message found', async () => {
      const storeMemory = createStoreMemoryNode(mockStore, config, logger);

      const state = {
        messages: [new HumanMessage('test')],
        sessionId: 'session-123',
      };

      const result = await storeMemory(state);

      expect(result).toEqual({});
    });

    it('returns empty when AI message has no tool calls', async () => {
      const storeMemory = createStoreMemoryNode(mockStore, config, logger);

      const state = {
        messages: [new AIMessage('Just a regular response')],
        sessionId: 'session-123',
      };

      const result = await storeMemory(state);

      expect(result).toEqual({});
    });

    it('handles malformed tool calls gracefully', async () => {
      const storeMemory = createStoreMemoryNode(mockStore, config, logger);

      const aiMessage = new AIMessage({
        content: 'Response',
      });

      // Manually add malformed tool_calls
      (aiMessage as { tool_calls?: unknown[] }).tool_calls = [
        null, // null call
        { name: 'upsertMemory' }, // missing args
        {
          name: 'upsertMemory',
          args: { content: 'Valid memory', key: 'valid' },
          id: 'call-1',
        },
      ];

      const state = {
        messages: [aiMessage],
        sessionId: 'session-123',
      };

      const result = await storeMemory(state);

      // Should only process the valid one
      expect(result.memoryOperations).toHaveLength(1);
      expect(result.memoryOperations?.[0].content).toBe('Valid memory');
    });

    it('logs operations for observability', async () => {
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
      } as unknown as pino.Logger;

      const storeMemory = createStoreMemoryNode(mockStore, config, mockLogger);

      const aiMessage = new AIMessage({
        content: 'Noted',
        tool_calls: [
          {
            name: 'upsertMemory',
            args: { content: 'Test memory content', key: 'test-key', metadata: { source: 'test' } },
            id: 'call-1',
          },
        ],
      });

      const state = {
        messages: [aiMessage],
        sessionId: 'session-123',
        userId: 'user-456',
      };

      await storeMemory(state);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          namespace: ['memories', 'user-456'],
          contentPreview: 'Test memory content',
          hasMetadata: true,
          hasKey: true,
        }),
        'Memory operation recorded from LLM tool call',
      );
    });
  });
});
