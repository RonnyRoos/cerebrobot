/**
 * Agent Routes
 *
 * Endpoints for agent CRUD operations (database-backed, spec 011)
 * Replaces filesystem-based agent discovery
 */

import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { AgentConfigSchema, AgentListResponseSchema } from '@cerebrobot/chat-shared';
import { AgentService } from '../services/AgentService.js';
import { ZodError } from 'zod';

interface GetAgentParams {
  id: string;
}

interface UpdateAgentParams {
  id: string;
}

interface DeleteAgentParams {
  id: string;
}

/**
 * Validate UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function registerAgentRoutes(app: FastifyInstance, prisma: PrismaClient): void {
  const agentService = new AgentService(prisma);

  /**
   * GET /api/agents
   * List all agents with lightweight metadata (database-backed)
   */
  app.get('/api/agents', async (request, reply) => {
    try {
      const agents = await agentService.listAgents();
      const response = { agents };

      // Validate response against schema
      AgentListResponseSchema.parse(response);

      return reply.code(200).send(response);
    } catch (error) {
      request.log.error(error, 'Failed to list agents');
      return reply.code(500).send({ error: 'Failed to list agents' });
    }
  });

  /**
   * GET /api/agents/:id
   * Get agent by ID with full configuration
   */
  app.get<{ Params: GetAgentParams }>('/api/agents/:id', async (request, reply) => {
    try {
      // Validate UUID format
      if (!isValidUUID(request.params.id)) {
        return reply.code(400).send({ error: 'Invalid agent ID format' });
      }

      const agent = await agentService.getAgentById(request.params.id);

      if (!agent) {
        return reply.code(404).send({ error: 'Agent not found' });
      }

      return reply.code(200).send(agent);
    } catch (error) {
      request.log.error(error, 'Failed to get agent');
      return reply.code(500).send({ error: 'Failed to get agent' });
    }
  });

  /**
   * POST /api/agents
   * Create new agent with validated configuration
   */
  app.post('/api/agents', async (request, reply) => {
    try {
      // Validate request body
      const config = AgentConfigSchema.parse(request.body);

      const agent = await agentService.createAgent(config);

      return reply.code(201).send(agent);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          error: 'Validation failed',
          details: error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }

      request.log.error(error, 'Failed to create agent');
      return reply.code(500).send({ error: 'Failed to create agent' });
    }
  });

  /**
   * PUT /api/agents/:id
   * Update existing agent configuration
   */
  app.put<{ Params: UpdateAgentParams }>('/api/agents/:id', async (request, reply) => {
    try {
      // Validate UUID format
      if (!isValidUUID(request.params.id)) {
        return reply.code(400).send({ error: 'Invalid agent ID format' });
      }

      // Validate request body
      const config = AgentConfigSchema.parse(request.body);

      const agent = await agentService.updateAgent(request.params.id, config);

      return reply.code(200).send(agent);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          error: 'Validation failed',
          details: error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }

      // Prisma P2025: Record not found
      if ((error as { code?: string }).code === 'P2025') {
        return reply.code(404).send({ error: 'Agent not found' });
      }

      request.log.error(error, 'Failed to update agent');
      return reply.code(500).send({ error: 'Failed to update agent' });
    }
  });

  /**
   * DELETE /api/agents/:id
   * Delete agent and cascade delete associated threads and checkpoints
   */
  app.delete<{ Params: DeleteAgentParams }>('/api/agents/:id', async (request, reply) => {
    try {
      // Validate UUID format
      if (!isValidUUID(request.params.id)) {
        return reply.code(400).send({ error: 'Invalid agent ID format' });
      }

      await agentService.deleteAgent(request.params.id);

      return reply.code(204).send();
    } catch (error) {
      // Prisma P2025: Record not found
      if ((error as { code?: string }).code === 'P2025') {
        return reply.code(404).send({ error: 'Agent not found' });
      }

      request.log.error(error, 'Failed to delete agent');
      return reply.code(500).send({ error: 'Failed to delete agent' });
    }
  });
}
