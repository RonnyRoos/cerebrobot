/**
 * Memory Graph Nodes
 *
 * LangGraph nodes for memory retrieval and storage operations.
 */

import { SystemMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import type { BaseStore } from '@cerebrobot/chat-shared';
import { buildUserNamespace } from '@cerebrobot/chat-shared';
import type { MemoryConfig } from './config.js';
import type { Logger } from 'pino';

interface MemoryState {
  messages: BaseMessage[];
  userId?: string;
  threadId: string;
  retrievedMemories?: Array<{
    id: string;
    content: string;
    similarity: number;
  }>;
}

/**
 * Retrieve memories node - runs before LLM call
 *
 * Searches for relevant memories based on latest user message and injects them into context.
 */
export function createRetrieveMemoriesNode(store: BaseStore, config: MemoryConfig, logger: Logger) {
  return async (state: MemoryState): Promise<Partial<MemoryState>> => {
    try {
      // Extract userId - REQUIRED (no fallback to sessionId to avoid namespace mismatches)
      if (!state.userId) {
        const error = new Error(
          'userId is required for memory retrieval but was not found in state',
        );
        logger.error(
          { threadId: state.threadId, error: error.message },
          'CRITICAL: No userId in state - memory operations impossible',
        );
        throw error;
      }
      const namespace = buildUserNamespace(state.userId);

      // Get the latest user message for query
      const messages = state.messages;
      const lastMessage = messages[messages.length - 1];

      if (!lastMessage || lastMessage._getType() !== 'human') {
        logger.debug('No user message found for memory retrieval');
        return {};
      }

      const query =
        typeof lastMessage.content === 'string' ? lastMessage.content : String(lastMessage.content);

      // Search for relevant memories
      const searchResults = await Promise.race([
        store.search(namespace, query, {
          threshold: config.similarityThreshold,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Memory retrieval timeout')),
            config.retrievalTimeoutMs,
          ),
        ),
      ]);

      if (!searchResults || searchResults.length === 0) {
        logger.debug({ namespace, query }, 'No relevant memories found');
        return { retrievedMemories: [] };
      }

      // Apply token budget - select memories that fit
      const CHARS_PER_TOKEN = 4;
      let totalTokens = 0;
      const selectedMemories = [];

      for (const memory of searchResults) {
        const tokens = Math.ceil(memory.content.length / CHARS_PER_TOKEN);

        if (totalTokens + tokens > config.injectionBudget) {
          logger.debug(
            { totalTokens, budget: config.injectionBudget },
            'Memory injection budget reached',
          );
          break;
        }

        selectedMemories.push({
          id: memory.id,
          content: memory.content,
          similarity: memory.similarity,
        });
        totalTokens += tokens;
      }

      if (selectedMemories.length === 0) {
        logger.debug('No memories fit within injection budget');
        return { retrievedMemories: [] };
      }

      // Format memories as system message
      const memoryContent = selectedMemories
        .map(
          (m, i) =>
            `Memory ${i + 1} (relevance: ${(m.similarity * 100).toFixed(0)}%):\n${m.content}`,
        )
        .join('\n\n');

      const systemMessage = new SystemMessage(
        `Relevant information from past conversations:\n\n${memoryContent}\n\n---\n\nUse this information to provide more personalized and context-aware responses.`,
      );

      logger.info(
        {
          namespace,
          query: query.substring(0, 100),
          memoriesFound: searchResults.length,
          memoriesInjected: selectedMemories.length,
          tokensUsed: totalTokens,
        },
        'Memories retrieved and injected',
      );

      return {
        retrievedMemories: selectedMemories,
        messages: [systemMessage],
      };
    } catch (error) {
      // Graceful degradation - log error but don't block conversation
      logger.error(
        {
          error,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
        },
        'Memory retrieval failed, continuing without memories',
      );
      return { retrievedMemories: [] };
    }
  };
}
