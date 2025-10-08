/**
 * Memory Tools
 *
 * LLM-accessible tools for memory operations.
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
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
export function createUpsertMemoryTool(
  store: BaseStore,
  config: MemoryConfig,
  logger: Logger,
) {
  return tool(
    async (input, runnableConfig) => {
      try {
        // Validate and parse input
        const parseResult = UpsertMemoryInputSchema.safeParse(input);
        if (!parseResult.success) {
          logger.warn({ errors: parseResult.error }, 'Invalid upsertMemory input');
          return {
            success: false,
            memoryId: '',
            message: 'Invalid input format',
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
        const userId = (runnableConfig as any)?.configurable?.userId;
        if (!userId) {
          const errorMsg = 'CRITICAL: userId not found in config.configurable - memory operations require userId';
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
        const embedding = await generateEmbedding(content, config);

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
        'Store or update a memory about the user for future conversations. Use this to remember important user preferences, facts, or context that should be recalled later. The memory will be automatically retrieved in relevant future conversations.',
      schema: UpsertMemoryInputSchema.extend({
        content: z
          .string()
          .describe(
            'The memory content to store. Should be a clear, concise statement about user preferences, facts, or context. Examples: "User is vegetarian", "User prefers dark mode", "User works as a software engineer"',
          ),
        metadata: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Optional metadata as key-value pairs (e.g., category, importance)'),
        key: z
          .string()
          .optional()
          .describe(
            'Optional unique key for the memory. If provided, will update existing memory with same key. If not provided, creates new memory with auto-generated key.',
          ),
      }),
    },
  );
}
