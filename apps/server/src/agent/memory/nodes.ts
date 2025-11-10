/**
 * Memory Graph Nodes
 *
 * LangGraph nodes for memory retrieval and storage operations.
 */

import { SystemMessage, isHumanMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { BaseStore, MessageMetadata } from '@cerebrobot/chat-shared';
import { buildAgentMemoryNamespace } from '@cerebrobot/chat-shared';
import type { MemoryConfig } from './config.js';
import type { Logger } from 'pino';
import { logMetadataDetection, logEmptyThreadError } from '../../lib/logger.js';

interface MemoryState {
  messages: BaseMessage[];
  userId?: string;
  agentId?: string;
  threadId: string;
  summary?: string | null;
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
  return async (
    state: MemoryState,
    runnableConfig?: RunnableConfig,
  ): Promise<Partial<MemoryState>> => {
    try {
      // Extract identifiers - REQUIRED (no fallback to sessionId to avoid namespace mismatches)
      if (!state.agentId) {
        const error = new Error(
          'agentId is required for memory retrieval but was not found in state',
        );
        logger.error(
          { threadId: state.threadId, error: error.message },
          'CRITICAL: No agentId in state - memory operations impossible',
        );
        throw error;
      }
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
      const namespace = buildAgentMemoryNamespace(state.agentId, state.userId);

      // Get the latest message in conversation history to determine query source
      const messages = state.messages;
      const lastMessage = messages[messages.length - 1];

      if (!lastMessage || lastMessage._getType() !== 'human') {
        logger.debug({ threadId: state.threadId }, 'No user message found for memory retrieval');
        return { retrievedMemories: [] };
      }

      // Determine query source for memory retrieval
      // Strategy: Prioritize real user context over autonomous prompts
      let query: string;
      let querySource: 'current_message' | 'last_real_user_message' | 'conversation_summary' =
        'current_message';

      // Detect if last message is autonomous (synthetic) using metadata
      // Why strict equality: metadata?.synthetic === true (not just truthy check)
      // - Handles undefined/null metadata gracefully
      // - Explicit true check avoids false positives from legacy data
      const metadata = lastMessage.additional_kwargs as MessageMetadata | undefined;
      const isSynthetic = metadata?.synthetic === true;

      if (isSynthetic) {
        // DEBUG: Log metadata detection for observability
        if (logger) {
          logMetadataDetection(logger, {
            operation: 'retrieve',
            threadId: state.threadId,
            metadata: metadata,
            context: {
              detected_synthetic: true,
              trigger_type: metadata?.trigger_type,
            },
          });
        }

        // Backward iteration: Find last REAL user message (non-synthetic)
        // Why: Autonomous prompts like "How's it going?" are low-signal for memory queries
        // Goal: Retrieve memories relevant to user's actual context
        // Approach: Walk backward through messages until finding non-synthetic HumanMessage
        let lastRealUserMessage: BaseMessage | null = null;
        for (let i = messages.length - 2; i >= 0; i--) {
          const msg = messages[i];
          if (isHumanMessage(msg)) {
            const msgMetadata = msg.additional_kwargs as MessageMetadata | undefined;
            // Strict check: Must be explicitly non-synthetic (not synthetic: false or undefined)
            if (msgMetadata?.synthetic !== true) {
              lastRealUserMessage = msg;
              break;
            }
          }
        }

        // Fallback chain for query source selection:
        // 1. Last real user message (preferred - highest context relevance)
        if (lastRealUserMessage) {
          query =
            typeof lastRealUserMessage.content === 'string'
              ? lastRealUserMessage.content
              : String(lastRealUserMessage.content);
          querySource = 'last_real_user_message';

          logger.debug(
            { threadId: state.threadId, querySource, queryPreview: query.substring(0, 50) },
            'Using last real user message for memory query (synthetic message detected)',
          );
          // 2. Conversation summary (fallback - broad context)
        } else if (state.summary && state.summary.trim().length > 0) {
          query = state.summary;
          querySource = 'conversation_summary';

          logger.debug(
            { threadId: state.threadId, querySource, summaryLength: query.length },
            'Using conversation summary for memory query (no real user messages found)',
          );
          // 3. Error case: Autonomous message on empty thread (should be rare)
        } else {
          // ERROR: Autonomous follow-up triggered before any real user interaction
          // This indicates timer fired prematurely or thread state is corrupted
          if (logger) {
            logEmptyThreadError(logger, {
              operation: 'retrieve',
              threadId: state.threadId,
              context: {
                message: 'Autonomous message on empty thread (no real messages, no summary)',
                trigger_type: metadata?.trigger_type,
              },
            });
          }

          logger.warn(
            { threadId: state.threadId, triggerType: metadata?.trigger_type },
            'Autonomous message on empty thread - no query source available, skipping memory retrieval',
          );
          return { retrievedMemories: [] };
        }
      } else {
        // Not synthetic - use current message content
        query =
          typeof lastMessage.content === 'string'
            ? lastMessage.content
            : String(lastMessage.content);
        querySource = 'current_message';
      }

      // T021: DEBUG log for query source selection
      logger.debug(
        {
          threadId: state.threadId,
          querySource,
          isSynthetic,
          queryLength: query.length,
          triggerType: metadata?.trigger_type,
        },
        'Memory query source selected',
      );

      // Check if aborted before expensive operation
      runnableConfig?.signal?.throwIfAborted();

      // OPTIMIZATION: Check if namespace has any memories before generating embeddings
      // This avoids expensive embedding API calls for new conversations with no memories
      const existingKeys = await store.list(namespace);
      if (existingKeys.length === 0) {
        logger.debug(
          { namespace, threadId: state.threadId },
          'No memories in namespace, skipping retrieval',
        );
        return { retrievedMemories: [] };
      }

      logger.debug(
        { namespace, memoryCount: existingKeys.length, query },
        'Searching memories for relevant context',
      );

      // Search for relevant memories
      const searchResults = await Promise.race([
        store.search(
          namespace,
          query,
          {
            threshold: config.similarityThreshold,
          },
          runnableConfig?.signal,
        ),
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
        logger.debug({ namespace }, 'No memories fit within injection budget');
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
          agentId: state.agentId,
          userId: state.userId,
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
      // Handle aborted requests gracefully (don't log as error)
      if (error instanceof Error && error.name === 'AbortError') {
        logger.debug({ threadId: state.threadId }, 'Memory retrieval aborted - request cancelled');
        return { retrievedMemories: [] };
      }

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
