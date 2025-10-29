/**
 * Memory API Routes
 *
 * REST endpoints for memory CRUD operations, search, and capacity management.
 */

import type { FastifyInstance } from 'fastify';
import type { Logger } from 'pino';
import type { MemoryService } from './service.js';

interface MemoryRoutesOptions {
  readonly logger: Logger;
  readonly memoryService: MemoryService;
}

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
  const { logger } = options;
  // Note: memoryService will be used in user story implementations
  const _memoryService = options.memoryService;

  /**
   * GET /api/memory
   *
   * List memories with pagination
   * Implementation: User Story 1 (T010)
   */
  app.get('/api/memory', async (request, reply) => {
    logger.debug('GET /api/memory - placeholder for US1 implementation');
    return reply.status(501).send({
      error: 'Not Implemented',
      message: 'Memory list endpoint will be implemented in User Story 1 (T010)',
    });
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
