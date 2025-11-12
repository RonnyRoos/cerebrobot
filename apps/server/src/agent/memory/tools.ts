/**
 * Memory Tools
 *
 * LLM-accessible tools for memory operations.
 */

import { tool } from '@langchain/core/tools';
import { randomUUID } from 'node:crypto';
import type { BaseStore } from '@cerebrobot/chat-shared';
import {
  UpsertMemoryInputSchema,
  validateMemoryContent,
  buildAgentMemoryNamespace,
} from '@cerebrobot/chat-shared';
import { generateEmbedding, type MemoryConfig } from './index.js';
import type { Logger } from 'pino';
import type { ConnectionManager } from '../../chat/connection-manager.js';
import type { MemoryCreatedEvent } from '@cerebrobot/chat-shared';

/**
 * Create upsertMemory tool for LLM
 *
 * Allows the LLM to store or update memories about the user.
 * Uses config.configurable.userId for user identification.
 */
export function createUpsertMemoryTool(
  store: BaseStore,
  config: MemoryConfig,
  logger: Logger,
  connectionManager?: ConnectionManager,
) {
  return tool(
    async (input, runnableConfig) => {
      try {
        // Log raw input for debugging
        logger.info(
          {
            input,
            userId: runnableConfig?.configurable?.userId,
            agentId: runnableConfig?.configurable?.agentId,
          },
          'upsertMemory called',
        );

        // Validate and parse input
        const parseResult = UpsertMemoryInputSchema.safeParse(input);
        if (!parseResult.success) {
          logger.warn(
            { errors: parseResult.error, input },
            'Invalid upsertMemory input - validation failed',
          );
          return {
            success: false,
            memoryId: '',
            message: `Invalid input format: ${parseResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
          };
        }

        const { content, metadata, key } = parseResult.data;

        // Validate content size
        try {
          validateMemoryContent(content, config.contentMaxTokens);
        } catch (error) {
          logger.warn(
            { error, content: content.substring(0, 100) },
            'Memory content validation failed',
          );
          return {
            success: false,
            memoryId: '',
            message: error instanceof Error ? error.message : 'Content validation failed',
          };
        }

        // Get user identifier from config.configurable (passed at graph invocation)
        const userId = runnableConfig?.configurable?.userId as string | undefined;
        const agentId = runnableConfig?.configurable?.agentId as string | undefined;
        if (!userId) {
          const errorMsg =
            'CRITICAL: userId not found in config.configurable - memory operations require userId';
          logger.error({ config: runnableConfig }, errorMsg);
          return {
            success: false,
            memoryId: '',
            message: errorMsg,
          };
        }

        if (!agentId) {
          const errorMsg =
            'CRITICAL: agentId not found in config.configurable - memory operations require agentId';
          logger.error({ config: runnableConfig }, errorMsg);
          return {
            success: false,
            memoryId: '',
            message: errorMsg,
          };
        }

        const namespace = buildAgentMemoryNamespace(agentId, userId);
        const memoryKey = key ?? randomUUID();
        const memoryId = randomUUID();

        // Check for duplicate memories before generating expensive embedding (T071)
        // Use 0.95 similarity threshold to detect near-duplicates
        const DUPLICATE_THRESHOLD = 0.95;
        const duplicateCheckStart = Date.now();
        const duplicates = await store.search(namespace, content, {
          threshold: DUPLICATE_THRESHOLD,
        });
        const duplicateCheckMs = Date.now() - duplicateCheckStart;

        if (duplicateCheckMs > 2000) {
          logger.warn(
            { duplicateCheckMs, agentId, userId },
            `🐌 SLOW DUPLICATE CHECK: ${duplicateCheckMs}ms (threshold: 2000ms)`,
          );
        }

        if (duplicates.length > 0) {
          const topDuplicate = duplicates[0];
          logger.warn(
            {
              agentId,
              userId,
              content: content.substring(0, 100),
              duplicateCount: duplicates.length,
              topSimilarity: topDuplicate.similarity,
              duplicateId: topDuplicate.id,
            },
            'Duplicate memory detected - preventing LLM storage',
          );
          return {
            success: false,
            memoryId: '',
            message: `This information is already stored in memory (${(topDuplicate.similarity * 100).toFixed(0)}% similarity). No need to store it again.`,
          };
        }

        // Generate embedding
        const embedding = await generateEmbedding(content, config, logger);

        if (!embedding) {
          logger.error('Failed to generate embedding for memory');
          return {
            success: false,
            memoryId: '',
            message: 'Failed to generate embedding',
          };
        }

        // Store memory (pass signal from runnableConfig)
        await store.put(
          namespace,
          memoryKey,
          {
            id: memoryId,
            namespace,
            key: memoryKey,
            content,
            metadata,
            embedding,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          runnableConfig?.signal,
        );

        logger.info(
          {
            memoryId,
            namespace,
            key: memoryKey,
            contentLength: content.length,
            agentId,
            userId,
          },
          'Memory stored successfully',
        );

        // Emit memory.created event if ConnectionManager is available
        if (connectionManager) {
          const threadId = runnableConfig?.configurable?.thread_id as string | undefined;

          if (threadId) {
            const event: MemoryCreatedEvent = {
              type: 'memory.created',
              memory: {
                id: memoryId,
                namespace,
                key: memoryKey,
                content,
                metadata,
                embedding,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              threadId,
              timestamp: new Date().toISOString(),
            };

            try {
              connectionManager.broadcastMemoryEvent(threadId, event);
              logger.debug(
                { memoryId, threadId, eventType: 'memory.created' },
                'Memory creation event broadcasted',
              );
            } catch (broadcastError) {
              // Log but don't fail the tool execution if broadcast fails
              logger.warn(
                { broadcastError, memoryId, threadId },
                'Failed to broadcast memory.created event',
              );
            }
          } else {
            logger.warn(
              { memoryId },
              'threadId not found in config - skipping memory.created event broadcast',
            );
          }
        }

        return {
          success: true,
          memoryId,
          message: `Memory stored successfully with ID: ${memoryId}`,
        };
      } catch (error) {
        logger.error({ error }, 'Failed to store memory');
        return {
          success: false,
          memoryId: '',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
    {
      name: 'upsertMemory',
      description:
        'Store or update significant memories about the user for future conversations. Only use this for meaningful facts, preferences, goals, or important context that would be valuable across multiple conversations. Do NOT store trivial interactions, simple acknowledgments, or one-off requests. The memory will be automatically retrieved in relevant future conversations. Required: content (string, 1-8192 chars). Optional: metadata (object), key (string for updates).',
      schema: UpsertMemoryInputSchema,
    },
  );
}
