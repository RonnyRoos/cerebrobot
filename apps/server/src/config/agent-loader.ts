/**
 * Agent Configuration Loader
 *
 * Database-backed agent loading (Spec 011).
 * Agents are stored in PostgreSQL and loaded on-demand.
 * Filesystem JSON configs deprecated - database is single source of truth.
 */

import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import type { Logger } from 'pino';
import { AgentConfigSchema, type Agent } from '@cerebrobot/chat-shared';

// Local metadata schema (not in shared package)
const AgentMetadataSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

type AgentMetadata = z.infer<typeof AgentMetadataSchema>;

/**
 * Reserved UUID for .env fallback agent configuration.
 *
 * This UUID is used when no JSON agent configs exist and the system
 * falls back to reading configuration from environment variables.
 *
 * Format: Uses version 5 UUID structure to indicate it's deterministic.
 */
/**
 * Options for AgentLoader constructor
 */
export interface AgentLoaderOptions {
  /**
   * Prisma client for database access.
   * Required for database-backed agent loading.
   */
  readonly prisma: PrismaClient;

  /**
   * Optional logger for diagnostic messages
   */
  readonly logger?: Logger;
}

/**
 * Agent Configuration Loader
 *
 * Handles discovery and loading of agent configurations from database.
 * Database is the single source of truth (filesystem configs deprecated per Spec 011).
 */
export class AgentLoader {
  private readonly prisma: PrismaClient;
  private readonly logger?: Logger;

  constructor(options: AgentLoaderOptions) {
    this.prisma = options.prisma;
    this.logger = options.logger;
  }

  /**
   * Discover all agent configurations from database.
   *
   * Queries agents table, validates ALL configs.
   * If ANY config is invalid, throws error (fail-fast).
   *
   * @returns Array of agent metadata (id, name only)
   * @throws Error if any config is invalid or database query fails
   */
  async discoverAgentConfigs(): Promise<AgentMetadata[]> {
    return this.discoverFromDatabase();
  }

  /**
   * Load a specific agent configuration by ID with strict validation.
   *
   * Queries database, validates against schema.
   * If config invalid or not found, throws error (fail-fast).
   *
   * @param agentId - UUID of the agent to load
   * @returns Validated agent WITH metadata (id, timestamps)
   * @throws Error if config not found, invalid, or database query fails
   */
  async loadAgentConfig(agentId: string): Promise<Agent> {
    return this.loadFromDatabase(agentId);
  }

  /**
   * Discover agent configs from database (internal implementation)
   */
  private async discoverFromDatabase(): Promise<AgentMetadata[]> {
    try {
      const agents = await this.prisma.agent.findMany({
        select: { id: true, name: true },
        orderBy: { createdAt: 'desc' },
      });

      // Return empty array if no agents (graceful - allows server to start)
      if (agents.length === 0) {
        this.logger?.warn('No agents found in database - server will start but autonomy disabled');
        return [];
      }

      // Validate all metadata
      return agents.map((agent) => {
        try {
          return AgentMetadataSchema.parse({ id: agent.id, name: agent.name });
        } catch (error) {
          if (error instanceof z.ZodError) {
            const issues = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
            throw new Error(
              `Agent metadata validation failed for ${agent.id}: ${issues.join(', ')}`,
            );
          }
          throw error;
        }
      });
    } catch (error) {
      throw new Error(`Failed to discover agents from database: ${String(error)}`);
    }
  }

  /**
   * Load specific agent config from database (internal implementation)
   */
  private async loadFromDatabase(agentId: string): Promise<Agent> {
    try {
      const agent = await this.prisma.agent.findUnique({
        where: { id: agentId },
      });

      if (!agent) {
        throw new Error(`Agent configuration not found: ${agentId}`);
      }

      // Parse and validate the config JSON
      // Note: Database stores config WITHOUT id/timestamps (separate columns)
      // AgentConfigSchema expects config fields only (no metadata)
      try {
        const validatedConfig = AgentConfigSchema.parse(agent.config);

        // Return Agent type with metadata
        return {
          id: agent.id,
          createdAt: agent.createdAt.toISOString(),
          updatedAt: agent.updatedAt.toISOString(),
          ...validatedConfig,
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          const issues = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
          throw new Error(`Agent config validation failed for ${agentId}: ${issues.join(', ')}`);
        }
        throw error;
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Agent config')) {
        throw error; // Re-throw validation errors as-is
      }
      throw new Error(`Failed to load agent ${agentId} from database: ${String(error)}`);
    }
  }
}

/**
 * Discover all agent configurations from database.
 *
 * Module-level convenience function.
 * Requires Prisma client instance.
 *
 * @param prisma - Prisma client for database access
 * @param logger - Optional logger for warnings
 * @returns Array of agent metadata (id, name only)
 * @throws Error if any config is invalid or database query fails
 */
export async function discoverAgentConfigs(
  prisma: PrismaClient,
  logger?: Logger,
): Promise<AgentMetadata[]> {
  const loader = new AgentLoader({ prisma, logger });
  return loader.discoverAgentConfigs();
}

/**
 * Load a specific agent configuration by ID with strict validation.
 *
 * Module-level convenience function.
 * Requires Prisma client instance.
 *
 * @param agentId - UUID of the agent to load
 * @param prisma - Prisma client for database access
 * @param logger - Optional logger for warnings
 * @returns Validated agent WITH metadata (id, timestamps)
 * @throws Error if config not found, invalid, or database query fails
 */
export async function loadAgentConfig(
  agentId: string,
  prisma: PrismaClient,
  logger?: Logger,
): Promise<Agent> {
  const loader = new AgentLoader({ prisma, logger });
  return loader.loadAgentConfig(agentId);
}
