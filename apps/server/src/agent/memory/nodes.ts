/**
 * Memory Graph Nodes
 *
 * LangGraph nodes for memory retrieval and storage operations.
 */

import { SystemMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import type { BaseStore, UpsertMemoryInput } from '@cerebrobot/chat-shared';
import { buildUserNamespace } from '@cerebrobot/chat-shared';
import type { MemoryConfig } from './config.js';
import type { Logger } from 'pino';
import { randomUUID } from 'node:crypto';
import { generateEmbedding } from './embeddings.js';

interface MemoryState {
  messages: BaseMessage[];
  userId?: string;
  sessionId: string;
  retrievedMemories?: Array<{
    id: string;
    content: string;
    similarity: number;
  }>;
  memoryOperations?: UpsertMemoryInput[];
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
        const error = new Error('userId is required for memory retrieval but was not found in state');
        logger.error(
          { sessionId: state.sessionId, error: error.message },
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

/**
 * Store memory node - runs after LLM call
 *
 * Processes upsertMemory tool calls from LLM response and stores memories.
 */
export function createStoreMemoryNode(store: BaseStore, config: MemoryConfig, logger: Logger) {
  return async (state: MemoryState): Promise<Partial<MemoryState>> => {
    try {
      // Find the latest AI message with tool calls
      const messages = state.messages;
      const lastMessage = messages[messages.length - 1];

      if (!lastMessage || !(lastMessage instanceof AIMessage)) {
        logger.debug('No AI message found for memory storage');
        return {};
      }

      const toolCalls = (lastMessage as { tool_calls?: unknown[] }).tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        logger.debug('No tool calls found in AI message');
        return {};
      }

      // Filter for upsertMemory tool calls
      const memoryToolCalls = toolCalls.filter(
        (call: unknown) =>
          typeof call === 'object' &&
          call !== null &&
          'name' in call &&
          call.name === 'upsertMemory',
      );

      if (memoryToolCalls.length === 0) {
        logger.debug('No upsertMemory tool calls found');
        return {};
      }

      // Get userId - REQUIRED (no fallback to sessionId to avoid namespace mismatches)
      if (!state.userId) {
        const error = new Error('userId is required for memory storage but was not found in state');
        logger.error(
          { sessionId: state.sessionId, error: error.message },
          'CRITICAL: No userId in state - cannot store memories',
        );
        throw error;
      }
      const namespace = buildUserNamespace(state.userId);

      const operations: UpsertMemoryInput[] = [];
      const toolMessages: ToolMessage[] = [];

      // Process each tool call
      for (const toolCall of memoryToolCalls) {
        const toolCallWithId = toolCall as { id?: string; args?: unknown };
        
        try {
          if (typeof toolCall !== 'object' || toolCall === null || !('args' in toolCall)) {
            continue;
          }

          const args = toolCall.args as UpsertMemoryInput;
          operations.push(args);

          // Log what we received
          logger.info({ args }, 'Processing memory tool call with args');

          // Handle both 'content' and 'memory' keys (LLM might use either)
          const content = (args as any).content || (args as any).memory;
          if (!content) {
            logger.warn({ args }, 'No content or memory field in tool call args');
            if (toolCallWithId.id) {
              toolMessages.push(
                new ToolMessage({
                  content: 'Error: No content provided',
                  tool_call_id: toolCallWithId.id,
                })
              );
            }
            continue;
          }

          // Actually store the memory here since we have access to state.userId/sessionId
          const memoryId = randomUUID();
          const memoryKey = args.key ?? randomUUID();
          
          // Generate embedding and store
          const embedding = await generateEmbedding(content, config);
          
          if (!embedding) {
            logger.error({ namespace, content: content.substring(0, 100) }, 'Failed to generate embedding for memory');
            if (toolCallWithId.id) {
              toolMessages.push(
                new ToolMessage({
                  content: 'Error: Failed to generate embedding',
                  tool_call_id: toolCallWithId.id,
                })
              );
            }
            continue;
          }

          await store.put(namespace, memoryKey, {
            id: memoryId,
            namespace,
            key: memoryKey,
            content, // Use the content we extracted
            metadata: args.metadata,
            embedding,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          logger.info(
            {
              memoryId,
              namespace,
              key: memoryKey,
              contentPreview: content.substring(0, 100),
              hasMetadata: !!args.metadata,
            },
            'Memory stored successfully from tool call',
          );
          
          // Add success ToolMessage so LLM knows the tool executed
          if (toolCallWithId.id) {
            toolMessages.push(
              new ToolMessage({
                content: `Memory stored successfully`,
                tool_call_id: toolCallWithId.id,
              })
            );
          }
        } catch (error) {
          logger.error({ error, toolCall }, 'Failed to process memory tool call');
          if (toolCallWithId.id) {
            toolMessages.push(
              new ToolMessage({
                content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                tool_call_id: toolCallWithId.id,
              })
            );
          }
        }
      }

      // Return ToolMessages so they're added to state
      return {
        messages: toolMessages,
        memoryOperations: operations,
      };
    } catch (error) {
      logger.error({ error }, 'Memory storage node failed');
      return {};
    }
  };
}
