import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { ThreadManager } from './thread-manager.js';
import { loadAgentConfig } from '../config/agent-loader.js';

const ThreadRequestSchema = z
  .object({
    agentId: z.string().trim().min(1), // Required: which agent to use for this thread
    previousThreadId: z.string().trim().min(1).optional(),
    userId: z.string().uuid().optional(), // Required for reset
  })
  .strict();

export function registerThreadRoutes(app: FastifyInstance, threadManager: ThreadManager): void {
  app.post('/api/thread', async (request, reply) => {
    const parseResult = ThreadRequestSchema.safeParse(request.body ?? {});

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid thread request payload',
        details: parseResult.error.issues,
      });
    }

    const { agentId, previousThreadId, userId } = parseResult.data;

    // Validate agentId exists by attempting to load config
    try {
      await loadAgentConfig(agentId);
    } catch (error: unknown) {
      app.log.warn({ agentId, error }, 'Invalid agentId specified for thread creation');
      return reply.status(400).send({
        error: 'Invalid agent configuration',
        details: error instanceof Error ? error.message : String(error),
      });
    }

    if (previousThreadId && userId) {
      await threadManager.resetThread(previousThreadId, userId);
    }

    const threadId = await threadManager.issueThread(agentId, userId);

    return reply.status(201).send({ threadId });
  });
}
