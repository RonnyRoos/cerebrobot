/**
 * Thread API Routes
 *
 * Provides REST endpoints for conversation thread management.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { ThreadService } from './service.js';

// Request validation schemas
const ListThreadsQuerySchema = z.object({
  userId: z.string().uuid('Invalid userId format'),
  agentId: z.string().min(1, 'agentId must not be empty').optional(),
});

const GetThreadHistoryParamsSchema = z.object({
  threadId: z.string().uuid('Invalid threadId format'),
});

const GetThreadHistoryQuerySchema = z.object({
  userId: z.string().uuid('Invalid userId format'),
});

const GetThreadHistoryQueryOptionalSchema = z.object({
  userId: z.string().uuid('Invalid userId format').optional(),
});

export function registerThreadRoutes(app: FastifyInstance, threadService: ThreadService): void {
  /**
   * GET /api/threads
   * List all conversation threads for a user
   */
  app.get('/api/threads', async (request, reply) => {
    const queryParse = ListThreadsQuerySchema.safeParse(request.query);

    if (!queryParse.success) {
      return reply.status(400).send({
        error: 'Invalid query parameters',
        details: queryParse.error.issues,
      });
    }

    const { userId, agentId } = queryParse.data;

    try {
      const threads = await threadService.listThreads(userId, agentId);

      return reply.status(200).send({
        threads,
        total: threads.length,
      });
    } catch (error) {
      app.log.error({ error, userId }, 'Failed to list threads');
      return reply.status(500).send({
        error: 'Failed to retrieve threads',
      });
    }
  });

  /**
   * GET /api/threads/:threadId/messages
   * Get complete message history for a specific thread
   */
  app.get<{ Params: { threadId: string } }>(
    '/api/threads/:threadId/messages',
    async (request, reply) => {
      const paramsParse = GetThreadHistoryParamsSchema.safeParse(request.params);
      const queryParse = GetThreadHistoryQuerySchema.safeParse(request.query);

      if (!paramsParse.success) {
        return reply.status(400).send({
          error: 'Invalid thread ID',
          details: paramsParse.error.issues,
        });
      }

      if (!queryParse.success) {
        return reply.status(400).send({
          error: 'Invalid query parameters',
          details: queryParse.error.issues,
        });
      }

      const { threadId } = paramsParse.data;
      const { userId } = queryParse.data;

      try {
        const history = await threadService.getThreadHistory(threadId, userId);
        return reply.status(200).send(history);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Handle specific error cases
        if (errorMessage.includes('not found')) {
          return reply.status(404).send({
            error: `Thread ${threadId} not found`,
          });
        }

        if (errorMessage.includes('Unauthorized')) {
          return reply.status(403).send({
            error: 'You do not have access to this thread',
          });
        }

        app.log.error({ error, threadId, userId }, 'Failed to get thread history');
        return reply.status(500).send({
          error: 'Failed to retrieve thread history',
        });
      }
    },
  );

  /**
   * GET /api/thread/:threadId/history
   * Back-compat endpoint for legacy clients expecting singular /thread route.
   */
  app.get<{ Params: { threadId: string } }>(
    '/api/thread/:threadId/history',
    async (request, reply) => {
      const paramsParse = GetThreadHistoryParamsSchema.safeParse(request.params);
      const queryParse = GetThreadHistoryQueryOptionalSchema.safeParse(request.query);

      if (!paramsParse.success) {
        return reply.status(400).send({
          error: 'Invalid thread ID',
          details: paramsParse.error.issues,
        });
      }

      if (!queryParse.success) {
        return reply.status(400).send({
          error: 'Invalid query parameters',
          details: queryParse.error.issues,
        });
      }

      const { threadId } = paramsParse.data;
      const { userId } = queryParse.data;

      try {
        const history = await threadService.getThreadHistory(threadId, userId);
        return reply.status(200).send(history);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (errorMessage.includes('not found')) {
          return reply.status(404).send({
            error: `Thread ${threadId} not found`,
          });
        }

        if (errorMessage.includes('Unauthorized')) {
          return reply.status(403).send({
            error: 'You do not have access to this thread',
          });
        }

        app.log.error(
          { error, threadId, userId },
          'Failed to get thread history via compatibility route',
        );
        return reply.status(500).send({
          error: 'Failed to retrieve thread history',
        });
      }
    },
  );
}
