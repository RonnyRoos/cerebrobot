import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { ThreadManager } from './session-manager.js';

const SessionRequestSchema = z
  .object({
    previousThreadId: z.string().trim().min(1).optional(),
    userId: z.string().uuid().optional(), // Required for reset
  })
  .strict();

export function registerSessionRoutes(app: FastifyInstance, threadManager: ThreadManager): void {
  app.post('/api/session', async (request, reply) => {
    const parseResult = SessionRequestSchema.safeParse(request.body ?? {});

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid session request payload',
        details: parseResult.error.issues,
      });
    }

    const { previousThreadId, userId } = parseResult.data;

    if (previousThreadId && userId) {
      await threadManager.resetThread(previousThreadId, userId);
    }

    const threadId = await threadManager.issueThread();

    return reply.status(201).send({ threadId });
  });
}
