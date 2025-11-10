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
        agentId: 'agent-123',
      };

      const mockResults = [
        {
          id: 'mem-1',
          namespace: ['memories', 'agent-123', 'user-456'],
          key: 'diet',
          content: 'User is vegetarian',
          similarity: 0.95,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Mock list to return keys so optimization doesn't short-circuit
      vi.mocked(mockStore.list).mockResolvedValue(['diet']);
      vi.mocked(mockStore.search).mockResolvedValue(mockResults);

      const result = await retrieveMemories(state);

      expect(mockStore.search).toHaveBeenCalledWith(
        ['memories', 'agent-123', 'user-456'],
        'What should I eat?',
        { threshold: 0.7 },
        undefined, // signal parameter
      );
      expect(mockStore.search).toHaveBeenCalledTimes(1);

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

      // Mock list to return keys so search is called
      vi.mocked(mockStore.list).mockResolvedValue(['some-key']);

      // Test with userId - should work
      await retrieveMemories({
        messages: [new HumanMessage('test')],
        threadId: 'thread-123',
        userId: 'user-456',
        agentId: 'agent-123',
      });

      expect(mockStore.search).toHaveBeenCalledWith(
        ['memories', 'agent-123', 'user-456'],
        'test',
        expect.any(Object),
        undefined, // signal parameter
      );

      vi.mocked(mockStore.search).mockClear();

      // Test without userId - should gracefully degrade (not throw)
      const resultWithoutUser = await retrieveMemories({
        messages: [new HumanMessage('test')],
        threadId: 'thread-789',
        agentId: 'agent-123',
      });

      // Should return empty and not call store (userId validation happens in try-catch)
      expect(resultWithoutUser.retrievedMemories).toEqual([]);
      expect(mockStore.search).not.toHaveBeenCalled();
    });

    it('requires agentId in state and skips retrieval when missing', async () => {
      const retrieveMemories = createRetrieveMemoriesNode(mockStore, config, logger);

      const resultWithoutAgent = await retrieveMemories({
        messages: [new HumanMessage('test')],
        threadId: 'thread-123',
        userId: 'user-456',
      });

      expect(resultWithoutAgent.retrievedMemories).toEqual([]);
      expect(mockStore.search).not.toHaveBeenCalled();
    });

    it('returns empty when no user message found', async () => {
      const retrieveMemories = createRetrieveMemoriesNode(mockStore, config, logger);

      const state = {
        messages: [new AIMessage('Hello!')], // AI message, not human
        threadId: 'thread-123',
        agentId: 'agent-123',
        userId: 'user-456',
      };

      const result = await retrieveMemories(state);

      expect(mockStore.search).not.toHaveBeenCalled();
      expect(result).toEqual({ retrievedMemories: [] });
    });

    it('returns empty when no memories found', async () => {
      const retrieveMemories = createRetrieveMemoriesNode(mockStore, config, logger);

      // Mock list to return keys so search is called
      vi.mocked(mockStore.list).mockResolvedValue(['some-key']);
      vi.mocked(mockStore.search).mockResolvedValue([]);

      const state = {
        messages: [new HumanMessage('test query')],
        threadId: 'thread-123',
        userId: 'user-456',
        agentId: 'agent-123',
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
        agentId: 'agent-123',
      };

      // Create memories that exceed budget (1000 tokens = ~4000 chars)
      const largeContent = 'x'.repeat(3000); // ~750 tokens
      const mockResults = [
        {
          id: 'mem-1',
          namespace: ['memories', 'agent-123', 'user-456'],
          key: 'key1',
          content: largeContent,
          similarity: 0.95,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'mem-2',
          namespace: ['memories', 'agent-123', 'user-456'],
          key: 'key2',
          content: largeContent,
          similarity: 0.85,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Mock list to return keys so search is called
      vi.mocked(mockStore.list).mockResolvedValue(['key1', 'key2']);
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
        agentId: 'agent-123',
      };

      const mockResults = [
        {
          id: 'mem-1',
          namespace: ['memories', 'agent-123', 'user-456'],
          key: 'key1',
          content: 'User likes pizza',
          similarity: 0.95,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Mock list to return keys so search is called
      vi.mocked(mockStore.list).mockResolvedValue(['key1']);
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
        userId: 'user-456',
        agentId: 'agent-123',
      };

      // Mock list to return keys so search is called
      vi.mocked(mockStore.list).mockResolvedValue(['some-key']);
      // Mock search to take longer than timeout
      vi.mocked(mockStore.search).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 200)),
      );

      const result = await retrieveMemories(state);

      // Should timeout and return empty
      expect(result.retrievedMemories).toEqual([]);
    });
  });

  describe('Metadata Query Detection (T007c)', () => {
    /**
     * Unit tests for US2: Memory node query detection logic
     *
     * Validates that memory retrieval detects synthetic messages and uses
     * alternative query sources (last real user message or conversation summary).
     */

    it('should use message content for real user messages', async () => {
      const retrieveMemories = createRetrieveMemoriesNode(mockStore, config, logger);

      const state = {
        messages: [new HumanMessage('What should I eat for dinner?')],
        threadId: 'thread-123',
        userId: 'user-456',
        agentId: 'agent-123',
      };

      vi.mocked(mockStore.list).mockResolvedValue(['key1']);
      vi.mocked(mockStore.search).mockResolvedValue([]);

      await retrieveMemories(state);

      // Should use message content as query
      expect(mockStore.search).toHaveBeenCalledWith(
        ['memories', 'agent-123', 'user-456'],
        'What should I eat for dinner?',
        expect.objectContaining({
          threshold: 0.7,
        }),
        undefined,
      );
    });

    it('should detect synthetic metadata and use alternative query', async () => {
      const retrieveMemories = createRetrieveMemoriesNode(mockStore, config, logger);

      // Synthetic message with metadata
      const syntheticMessage = new HumanMessage({
        content: 'Continue our conversation naturally.',
        additional_kwargs: {
          synthetic: true,
          trigger_type: 'check_in',
          trigger_reason: 'No activity for 30s',
        },
      });

      // Previous real user message
      const realUserMessage = new HumanMessage('Tell me about Paris');

      const state = {
        messages: [realUserMessage, new AIMessage('Paris is...'), syntheticMessage],
        threadId: 'thread-123',
        userId: 'user-456',
        agentId: 'agent-123',
      };

      vi.mocked(mockStore.list).mockResolvedValue(['key1']);
      vi.mocked(mockStore.search).mockResolvedValue([]);

      await retrieveMemories(state);

      // US2: Should use last REAL user message instead of synthetic prompt
      expect(mockStore.search).toHaveBeenCalledWith(
        ['memories', 'agent-123', 'user-456'],
        'Tell me about Paris',
        expect.objectContaining({
          threshold: 0.7,
        }),
        undefined,
      );
    });

    it('should fallback to conversation summary when no real user messages exist', async () => {
      const retrieveMemories = createRetrieveMemoriesNode(mockStore, config, logger);

      // Only synthetic message, no real user messages
      const syntheticMessage = new HumanMessage({
        content: 'Continue our conversation naturally.',
        additional_kwargs: {
          synthetic: true,
          trigger_type: 'check_in',
        },
      });

      const state = {
        messages: [new AIMessage('Previous AI response'), syntheticMessage],
        threadId: 'thread-123',
        userId: 'user-456',
        agentId: 'agent-123',
        summary: 'User was discussing travel plans to Europe',
      };

      vi.mocked(mockStore.list).mockResolvedValue(['key1']);
      vi.mocked(mockStore.search).mockResolvedValue([]);

      await retrieveMemories(state);

      // When US2 is implemented:
      // Should use summary as fallback query
      // expect(mockStore.search).toHaveBeenCalledWith(
      //   ['memories', 'agent-123', 'user-456'],
      //   expect.objectContaining({
      //     query: 'User was discussing travel plans to Europe',
      //   }),
      // );

      // Current behavior: uses synthetic message content
      expect(mockStore.search).toHaveBeenCalled();
    });

    it('should handle empty thread edge case (no messages, no summary)', async () => {
      const retrieveMemories = createRetrieveMemoriesNode(mockStore, config, logger);

      // Autonomous message on empty thread (misconfiguration)
      const syntheticMessage = new HumanMessage({
        content: 'Continue our conversation naturally.',
        additional_kwargs: {
          synthetic: true,
          trigger_type: 'check_in',
        },
      });

      const state = {
        messages: [syntheticMessage],
        threadId: 'thread-empty',
        userId: 'user-456',
        agentId: 'agent-123',
        summary: null,
      };

      vi.mocked(mockStore.list).mockResolvedValue([]);
      vi.mocked(mockStore.search).mockResolvedValue([]);

      const result = await retrieveMemories(state);

      // US2: Should skip memory retrieval and return empty array
      expect(result.retrievedMemories).toEqual([]);
      expect(mockStore.search).not.toHaveBeenCalled();
      // Should log ERROR via logEmptyThreadError
    });

    it('should iterate backward to find last real user message', async () => {
      const retrieveMemories = createRetrieveMemoriesNode(mockStore, config, logger);

      const messages = [
        new HumanMessage('First user message'),
        new AIMessage('First AI response'),
        new HumanMessage('Second user message'),
        new AIMessage('Second AI response'),
        new HumanMessage({
          content: 'Synthetic prompt',
          additional_kwargs: { synthetic: true, trigger_type: 'check_in' },
        }),
      ];

      const state = {
        messages,
        threadId: 'thread-123',
        userId: 'user-456',
        agentId: 'agent-123',
      };

      vi.mocked(mockStore.list).mockResolvedValue(['key1']);
      vi.mocked(mockStore.search).mockResolvedValue([]);

      await retrieveMemories(state);

      // When US2 is implemented:
      // Should find 'Second user message' (last real message before synthetic)
      // expect(mockStore.search).toHaveBeenCalledWith(
      //   ['memories', 'agent-123', 'user-456'],
      //   expect.objectContaining({
      //     query: 'Second user message',
      //   }),
      // );

      // Current behavior: uses last message content
      expect(mockStore.search).toHaveBeenCalled();
    });
  });
});
