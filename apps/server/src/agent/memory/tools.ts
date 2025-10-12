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
  buildUserNamespace,
} from '@cerebrobot/chat-shared';
import { generateEmbedding, type MemoryConfig } from './index.js';
import type { Logger } from 'pino';

/**
 * Create upsertMemory tool for LLM
 *
 * Allows the LLM to store or update memories about the user.
 * Uses config.configurable.userId for user identification.
 */
export function createUpsertMemoryTool(store: BaseStore, config: MemoryConfig, logger: Logger) {
  return tool(
    async (input, runnableConfig) => {
      try {
        // Log raw input for debugging
        logger.info({ input, userId: runnableConfig?.configurable?.userId }, 'upsertMemory called');

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

        const namespace = buildUserNamespace(userId);
        const memoryKey = key ?? randomUUID();
        const memoryId = randomUUID();

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

        // Store memory
        await store.put(namespace, memoryKey, {
          id: memoryId,
          namespace,
          key: memoryKey,
          content,
          metadata,
          embedding,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        logger.info(
          { memoryId, namespace, key: memoryKey, contentLength: content.length },
          'Memory stored successfully',
        );

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
        'Store or update a memory about the user for future conversations. Use this to remember important user preferences, facts, or context that should be recalled later. The memory will be automatically retrieved in relevant future conversations. Required parameters: content (string, 1-8192 chars). Optional: metadata (object), key (string for updates).',
      schema: UpsertMemoryInputSchema,
    },
  );
}
