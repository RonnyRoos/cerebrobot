import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { SessionManager } from './session-manager.js';

const SessionRequestSchema = z
  .object({
    previousSessionId: z.string().trim().min(1).optional(),
  })
  .strict();

export function registerSessionRoutes(app: FastifyInstance, sessionManager: SessionManager): void {
  app.post('/api/session', async (request, reply) => {
    const parseResult = SessionRequestSchema.safeParse(request.body ?? {});

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid session request payload',
        details: parseResult.error.issues,
      });
    }

    const { previousSessionId } = parseResult.data;

    if (previousSessionId) {
      await sessionManager.resetSession(previousSessionId);
    }

    const sessionId = await sessionManager.issueSession();

    return reply.status(201).send({ sessionId });
  });
}
