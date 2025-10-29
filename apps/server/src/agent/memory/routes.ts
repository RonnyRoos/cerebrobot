/**
 * Memory API Routes
 *
 * REST endpoints for memory CRUD operations, search, and capacity management.
 */

import type { FastifyInstance } from 'fastify';
import type { Logger } from 'pino';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import {
  buildAgentMemoryNamespace,
  MemoryListResponseSchema,
  MemorySearchResponseSchema,
} from '@cerebrobot/chat-shared';
import type { MemoryService } from './service.js';
import type { ConnectionManager } from '../../chat/connection-manager.js';

interface MemoryRoutesOptions {
  readonly logger: Logger;
  readonly memoryService: MemoryService;
  readonly prisma: PrismaClient;
  readonly connectionManager?: ConnectionManager;
}

// Query parameter validation schemas
const GetMemoriesQuerySchema = z.object({
  threadId: z.string().uuid('Invalid threadId format'),
  offset: z.coerce.number().int().min(0).default(0).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
});

const SearchMemoriesQuerySchema = z.object({
  threadId: z.string().uuid('Invalid threadId format'),
  query: z.string().min(1).max(500, 'Search query too long'),
  offset: z.coerce.number().int().min(0).default(0).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  threshold: z.coerce.number().min(0).max(1).default(0.7).optional(),
});

// Request body validation schemas
const UpdateMemoryBodySchema = z.object({
  content: z.string().min(1, 'Content cannot be empty').max(2000, 'Content too long'),
});

const MemoryIdParamSchema = z.object({
  id: z.string().uuid('Invalid memory ID format'),
});

/**
 * Register memory API routes
 *
 * Endpoints:
 * - GET /api/memory - List memories (US1: T010)
 * - GET /api/memory/search - Search memories (US2: T028)
 * - GET /api/memory/stats - Get capacity stats (US5: T073)
 * - POST /api/memory - Create memory (US4: T059)
 * - PUT /api/memory/:id - Update memory (US3: T040)
 * - DELETE /api/memory/:id - Delete memory (US3: T041)
 */
export function registerMemoryRoutes(app: FastifyInstance, options: MemoryRoutesOptions): void {
  const { logger, memoryService, prisma, connectionManager } = options;

  /**
   * GET /api/memory
   *
   * List memories with pagination
   * Implementation: User Story 1 (T010)
   */
  app.get('/api/memory', async (request, reply) => {
    // Validate query parameters
    const queryParse = GetMemoriesQuerySchema.safeParse(request.query);

    if (!queryParse.success) {
      logger.warn({ errors: queryParse.error }, 'Invalid query parameters for GET /api/memory');
      return reply.status(400).send({
        error: 'Invalid query parameters',
        details: queryParse.error.issues,
      });
    }

    const { threadId, offset = 0, limit = 20 } = queryParse.data;

    try {
      // Look up thread to get agentId and userId
      const thread = await prisma.thread.findUnique({
        where: { id: threadId },
        select: { agentId: true, userId: true },
      });

      if (!thread) {
        logger.warn({ threadId }, 'Thread not found for GET /api/memory');
        return reply.status(404).send({
          error: 'Thread not found',
          message: `Thread ${threadId} does not exist`,
        });
      }

      if (!thread.userId) {
        logger.warn({ threadId }, 'Thread has no userId - cannot list memories');
        return reply.status(400).send({
          error: 'Invalid thread',
          message: 'Thread must have a userId to access memories',
        });
      }

      // Build memory namespace
      const namespace = buildAgentMemoryNamespace(thread.agentId, thread.userId);

      logger.debug(
        { threadId, agentId: thread.agentId, userId: thread.userId, namespace, offset, limit },
        'Fetching memories for thread',
      );

      // Fetch memories from service
      const result = await memoryService.listMemories(namespace, offset, limit);

      logger.info(
        { threadId, total: result.total, returned: result.memories.length, offset, limit },
        'Successfully fetched memories',
      );

      // Format and validate response
      const response = MemoryListResponseSchema.parse({
        memories: result.memories,
        total: result.total,
        offset,
        limit,
      });

      return reply.status(200).send(response);
    } catch (error) {
      logger.error({ error, threadId, offset, limit }, 'Failed to fetch memories');
      return reply.status(500).send({
        error: 'Failed to fetch memories',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/memory/search
   *
   * Search memories by semantic similarity
   * Implementation: User Story 2 (T028, T029, T031)
   */
  app.get('/api/memory/search', async (request, reply) => {
    // Validate query parameters
    const queryParse = SearchMemoriesQuerySchema.safeParse(request.query);

    if (!queryParse.success) {
      logger.warn(
        { errors: queryParse.error },
        'Invalid query parameters for GET /api/memory/search',
      );
      return reply.status(400).send({
        error: 'Invalid query parameters',
        details: queryParse.error.issues,
      });
    }

    const { threadId, query, offset = 0, limit = 20, threshold = 0.7 } = queryParse.data;

    try {
      // Look up thread to get agentId and userId
      const thread = await prisma.thread.findUnique({
        where: { id: threadId },
        select: { agentId: true, userId: true },
      });

      if (!thread) {
        logger.warn({ threadId }, 'Thread not found for GET /api/memory/search');
        return reply.status(404).send({
          error: 'Thread not found',
          message: `Thread ${threadId} does not exist`,
        });
      }

      if (!thread.userId) {
        logger.warn({ threadId }, 'Thread has no userId - cannot search memories');
        return reply.status(400).send({
          error: 'Invalid thread',
          message: 'Thread must have a userId to search memories',
        });
      }

      // Build memory namespace
      const namespace = buildAgentMemoryNamespace(thread.agentId, thread.userId);

      logger.debug(
        {
          threadId,
          agentId: thread.agentId,
          userId: thread.userId,
          namespace,
          query: query.substring(0, 100),
          offset,
          limit,
          threshold,
        },
        'Searching memories for thread',
      );

      // Search memories using service
      const result = await memoryService.searchMemories(namespace, query, offset, limit, threshold);

      logger.info(
        {
          threadId,
          query: query.substring(0, 100),
          total: result.total,
          returned: result.results.length,
          offset,
          limit,
          threshold,
          topSimilarities: result.results.slice(0, 3).map((r) => r.similarity.toFixed(3)),
        },
        'Memory search completed successfully',
      );

      // Format and validate response
      const response = MemorySearchResponseSchema.parse({
        results: result.results,
        query,
        total: result.total,
      });

      return reply.status(200).send(response);
    } catch (error) {
      logger.error(
        { error, threadId, query, offset, limit, threshold },
        'Failed to search memories',
      );
      return reply.status(500).send({
        error: 'Failed to search memories',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/memory/stats
   *
   * Get memory capacity statistics
   * Implementation: User Story 5 (T073)
   */
  app.get('/api/memory/stats', async (request, reply) => {
    logger.debug('GET /api/memory/stats - placeholder for US5 implementation');
    return reply.status(501).send({
      error: 'Not Implemented',
      message: 'Memory stats endpoint will be implemented in User Story 5 (T073)',
    });
  });

  /**
   * POST /api/memory
   *
   * Create a new memory manually
   * Implementation: User Story 4 (T059)
   */
  app.post('/api/memory', async (request, reply) => {
    logger.debug('POST /api/memory - placeholder for US4 implementation');
    return reply.status(501).send({
      error: 'Not Implemented',
      message: 'Memory creation endpoint will be implemented in User Story 4 (T059)',
    });
  });

  /**
   * PUT /api/memory/:id
   *
   * Update an existing memory
   * Implementation: User Story 3 (T040)
   */
  app.put<{
    Params: { id: string };
    Body: { content: string };
  }>('/api/memory/:id', async (request, reply) => {
    // Validate params
    const paramsValidation = MemoryIdParamSchema.safeParse(request.params);
    if (!paramsValidation.success) {
      return reply.status(400).send({
        error: 'Invalid memory ID',
        details: paramsValidation.error.issues,
      });
    }

    // Validate body
    const bodyValidation = UpdateMemoryBodySchema.safeParse(request.body);
    if (!bodyValidation.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: bodyValidation.error.issues,
      });
    }

    const { id: memoryId } = paramsValidation.data;
    const { content } = bodyValidation.data;

    try {
      logger.info({ memoryId, contentLength: content.length }, 'Updating memory');

      // Update memory via service
      const updatedMemory = await memoryService.updateMemory(memoryId, content);

      // Get threadId from memory namespace for event broadcast
      // Namespace format: ['memories', agentId, userId]
      // We need to query Thread table to find thread with matching agentId and userId
      const agentId = updatedMemory.namespace[1]; // Extract agentId from namespace
      const userId = updatedMemory.namespace[2]; // Extract userId from namespace

      logger.debug(
        { memoryId, namespace: updatedMemory.namespace, agentId, userId },
        'Extracting agentId/userId from namespace',
      );

      // Find thread for this memory (T046)
      const thread = await prisma.thread.findFirst({
        where: {
          agentId,
          userId,
        },
      });

      logger.debug(
        { memoryId, userId, agentId, threadFound: !!thread, threadId: thread?.id },
        'Thread lookup result',
      );

      // Emit memory.updated event if ConnectionManager and thread available (T046)
      if (connectionManager && thread) {
        try {
          const event = {
            type: 'memory.updated' as const,
            timestamp: new Date().toISOString(),
            memory: updatedMemory,
            threadId: thread.id,
          };
          logger.info(
            { memoryId, threadId: thread.id, eventType: event.type },
            'Broadcasting memory.updated event',
          );
          connectionManager.broadcastMemoryEvent(thread.id, event);
          logger.info({ memoryId, threadId: thread.id }, 'memory.updated event broadcast complete');
        } catch (eventError) {
          logger.warn(
            { error: eventError, memoryId, threadId: thread.id },
            'Failed to broadcast memory.updated event',
          );
        }
      } else if (!thread) {
        logger.warn(
          { memoryId, userId, agentId },
          'No thread found for memory - cannot broadcast event',
        );
      } else if (!connectionManager) {
        logger.warn({ memoryId }, 'ConnectionManager not available - cannot broadcast event');
      }

      logger.debug({ memoryId }, 'Memory update successful');

      return reply.status(200).send({
        success: true,
        memory: updatedMemory,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('not found')) {
        return reply.status(404).send({
          error: 'Memory not found',
          message: `Memory ${memoryId} does not exist`,
        });
      }

      logger.error({ error, memoryId }, 'Failed to update memory');
      return reply.status(500).send({
        error: 'Failed to update memory',
        message: 'An error occurred while updating the memory',
      });
    }
  });

  /**
   * DELETE /api/memory/:id
   *
   * Delete a memory
   * Implementation: User Story 3 (T041)
   */
  app.delete<{
    Params: { id: string };
  }>('/api/memory/:id', async (request, reply) => {
    // Validate params
    const paramsValidation = MemoryIdParamSchema.safeParse(request.params);
    if (!paramsValidation.success) {
      return reply.status(400).send({
        error: 'Invalid memory ID',
        details: paramsValidation.error.issues,
      });
    }

    const { id: memoryId } = paramsValidation.data;

    try {
      logger.info({ memoryId }, 'Deleting memory');

      // Fetch memory first to get namespace for event broadcast (T047)
      const memoryToDelete = await prisma.memory.findUnique({
        where: { id: memoryId },
      });

      if (!memoryToDelete) {
        return reply.status(404).send({
          error: 'Memory not found',
          message: `Memory ${memoryId} does not exist`,
        });
      }

      // Delete memory via service
      await memoryService.deleteMemory(memoryId);

      // Get threadId from memory namespace for event broadcast
      // Namespace format: ['memories', agentId, userId]
      const agentId = memoryToDelete.namespace[1];
      const userId = memoryToDelete.namespace[2];

      // Find thread for this memory (T047)
      const thread = await prisma.thread.findFirst({
        where: {
          agentId,
          userId,
        },
      });

      // Emit memory.deleted event if ConnectionManager and thread available (T047)
      if (connectionManager && thread) {
        try {
          const event = {
            type: 'memory.deleted' as const,
            timestamp: new Date().toISOString(),
            memoryId,
            threadId: thread.id,
          };
          connectionManager.broadcastMemoryEvent(thread.id, event);
          logger.debug({ memoryId, threadId: thread.id }, 'memory.deleted event emitted');
        } catch (eventError) {
          logger.warn(
            { error: eventError, memoryId, threadId: thread.id },
            'Failed to broadcast memory.deleted event',
          );
        }
      }

      logger.debug({ memoryId }, 'Memory deletion successful');

      return reply.status(200).send({
        success: true,
        message: 'Memory deleted successfully',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('not found')) {
        return reply.status(404).send({
          error: 'Memory not found',
          message: `Memory ${memoryId} does not exist`,
        });
      }

      logger.error({ error, memoryId }, 'Failed to delete memory');
      return reply.status(500).send({
        error: 'Failed to delete memory',
        message: 'An error occurred while deleting the memory',
      });
    }
  });

  logger.info(
    'Memory API routes registered (skeleton mode - implementations pending user stories)',
  );
}
