/**
 * Agent Routes
 *
 * Endpoints for agent discovery and selection
 */

import type { FastifyInstance } from 'fastify';
import { AgentListResponseSchema, type AgentListResponse } from '@cerebrobot/chat-shared';
import { discoverAgentConfigs } from '../config/agent-loader.js';

export function registerAgentRoutes(app: FastifyInstance): void {
  /**
   * GET /api/agents
   *
   * List all available agent configurations.
   * Scans config/agents/ directory, validates each config.
   * Returns 500 with validation details if any config is invalid (FR-012).
   */
  app.get('/api/agents', async (_request, reply) => {
    try {
      // Discover and validate all agent configs (fail-fast)
      const agents = await discoverAgentConfigs();

      const response: AgentListResponse = {
        agents: agents.map((agent) => ({
          id: agent.id,
          name: agent.name,
          // description is optional - not yet in AgentMetadata schema
        })),
      };

      // Validate response shape
      const validated = AgentListResponseSchema.parse(response);

      return reply.status(200).send(validated);
    } catch (error: unknown) {
      app.log.error({ error }, 'Failed to list agent configurations');

      return reply.status(500).send({
        error: 'Failed to list agent configurations',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });
}
