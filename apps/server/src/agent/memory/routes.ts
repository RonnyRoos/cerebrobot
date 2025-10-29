/**
 * Memory API Routes
 *
 * REST endpoints for memory CRUD operations, search, and capacity management.
 */

import type { FastifyInstance } from 'fastify';
import type { Logger } from 'pino';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { buildAgentMemoryNamespace, MemoryListResponseSchema } from '@cerebrobot/chat-shared';
import type { MemoryService } from './service.js';

interface MemoryRoutesOptions {
  readonly logger: Logger;
  readonly memoryService: MemoryService;
  readonly prisma: PrismaClient;
}

// Query parameter validation schemas
const GetMemoriesQuerySchema = z.object({
  threadId: z.string().uuid('Invalid threadId format'),
  offset: z.coerce.number().int().min(0).default(0).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
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
  const { logger, memoryService, prisma } = options;

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
   * Implementation: User Story 2 (T028)
   */
  app.get('/api/memory/search', async (request, reply) => {
    logger.debug('GET /api/memory/search - placeholder for US2 implementation');
    return reply.status(501).send({
      error: 'Not Implemented',
      message: 'Memory search endpoint will be implemented in User Story 2 (T028)',
    });
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
  }>('/api/memory/:id', async (request, reply) => {
    logger.debug(
      { memoryId: request.params.id },
      'PUT /api/memory/:id - placeholder for US3 implementation',
    );
    return reply.status(501).send({
      error: 'Not Implemented',
      message: 'Memory update endpoint will be implemented in User Story 3 (T040)',
    });
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
    logger.debug(
      { memoryId: request.params.id },
      'DELETE /api/memory/:id - placeholder for US3 implementation',
    );
    return reply.status(501).send({
      error: 'Not Implemented',
      message: 'Memory deletion endpoint will be implemented in User Story 3 (T041)',
    });
  });

  logger.info(
    'Memory API routes registered (skeleton mode - implementations pending user stories)',
  );
}
