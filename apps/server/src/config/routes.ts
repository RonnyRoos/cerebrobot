/**
 * Global Configuration Routes (Spec 017 - User Story 4)
 *
 * GET /api/config - Get global configuration
 * PUT /api/config - Update global configuration
 */

import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { GlobalConfigurationService } from './global-config-service.js';

const UpdateConfigSchema = z.object({
  enableMarkdownResponses: z.boolean().optional(),
  includeToolReferences: z.boolean().optional(),
});

export function registerGlobalConfigRoutes(fastify: FastifyInstance, prisma: PrismaClient): void {
  const configService = new GlobalConfigurationService(prisma);

  // GET /api/config
  fastify.get('/api/config', async (_request, reply) => {
    const config = await configService.getConfig();
    return reply.send(config);
  });

  // PUT /api/config
  fastify.put('/api/config', async (request, reply) => {
    const parseResult = UpdateConfigSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parseResult.error.errors,
      });
    }

    const config = await configService.updateConfig(parseResult.data);
    return reply.send(config);
  });
}
