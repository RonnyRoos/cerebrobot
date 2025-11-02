/**
 * Agent Service
 * Business logic for CRUD operations on agent configurations
 */

import type { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import type { AgentConfig, AgentListItem, Agent } from '@cerebrobot/chat-shared';
import { AgentConfigSchema } from '@cerebrobot/chat-shared';

export class AgentService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * List all agents with lightweight metadata
   * Returns AgentListItem[] for UI list view
   */
  async listAgents(): Promise<AgentListItem[]> {
    const agents = await this.prisma.agent.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        config: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return agents.map((agent) => {
      const config = agent.config as Record<string, unknown>;
      const autonomy = config.autonomy as { enabled?: boolean } | undefined;

      return {
        id: agent.id,
        name: agent.name,
        createdAt: agent.createdAt.toISOString(),
        updatedAt: agent.updatedAt.toISOString(),
        autonomyEnabled: autonomy?.enabled === true,
      };
    });
  }

  /**
   * Get agent by ID with full configuration
   * Returns null if agent not found
   */
  async getAgentById(id: string): Promise<Agent | null> {
    const agent = await this.prisma.agent.findUnique({
      where: { id },
    });

    if (!agent) {
      return null;
    }

    return {
      id: agent.id,
      createdAt: agent.createdAt.toISOString(),
      updatedAt: agent.updatedAt.toISOString(),
      ...(agent.config as AgentConfig),
    };
  }

  /**
   * Create new agent with validated configuration
   * Throws if validation fails
   */
  async createAgent(config: AgentConfig): Promise<Agent> {
    // Validate config with Zod
    const validatedConfig = AgentConfigSchema.parse(config);

    const agent = await this.prisma.agent.create({
      data: {
        name: validatedConfig.name,
        config: validatedConfig as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      id: agent.id,
      createdAt: agent.createdAt.toISOString(),
      updatedAt: agent.updatedAt.toISOString(),
      ...(agent.config as AgentConfig),
    };
  }

  /**
   * Update existing agent configuration
   * Throws if validation fails or agent not found
   */
  async updateAgent(id: string, config: AgentConfig): Promise<Agent> {
    // Validate config with Zod
    const validatedConfig = AgentConfigSchema.parse(config);

    const agent = await this.prisma.agent.update({
      where: { id },
      data: {
        name: validatedConfig.name,
        config: validatedConfig as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      id: agent.id,
      createdAt: agent.createdAt.toISOString(),
      updatedAt: agent.updatedAt.toISOString(),
      ...(agent.config as AgentConfig),
    };
  }

  /**
   * Delete agent and cascade delete associated threads and checkpoints
   *
   * Uses application-level transaction for atomicity.
   * Manual cascade required because LangGraph checkpoint tables reference threads,
   * not agents directly. Prisma's onDelete:Cascade only handles one level
   * (agent→threads), but we need multi-level cascade (agent→threads→checkpoints→writes).
   *
   * Deletion order matters due to foreign key constraints:
   * 1. checkpoint_writes (references checkpoints)
   * 2. checkpoints (references threads)
   * 3. threads (references agents)
   * 4. agent
   */
  async deleteAgent(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Find all threads for this agent
      const threads = await tx.thread.findMany({
        where: { agentId: id },
        select: { id: true },
      });

      const threadIds = threads.map((t) => t.id);

      if (threadIds.length > 0) {
        // Delete LangGraph checkpoint writes first (foreign key constraint)
        await tx.langGraphCheckpointWrite.deleteMany({
          where: {
            threadId: { in: threadIds },
          },
        });

        // Delete LangGraph checkpoints
        await tx.langGraphCheckpoint.deleteMany({
          where: {
            threadId: { in: threadIds },
          },
        });

        // Delete threads
        await tx.thread.deleteMany({
          where: { agentId: id },
        });
      }

      // Finally, delete the agent
      await tx.agent.delete({
        where: { id },
      });
    });
  }
}
