/**
 * Agent Factory
 *
 * Lazy loading and caching of LangGraph agents based on configuration.
 * Configs are loaded on-demand from database (first use), not at startup.
 * Database is single source of truth (Spec 011).
 */

import type { Logger } from 'pino';
import type { PrismaClient } from '@prisma/client';
import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import type { ChatAgent } from '../chat/chat-agent.js';
import type { ConnectionManager } from '../chat/connection-manager.js';
import { discoverAgentConfigs, loadAgentConfig } from '../config/agent-loader.js';
import { createLangGraphChatAgent } from './langgraph-agent.js';

export interface AgentFactoryOptions {
  readonly prisma: PrismaClient;
  readonly logger?: Logger;
  readonly checkpointer?: BaseCheckpointSaver;
  readonly connectionManager?: ConnectionManager;
}

/**
 * Factory for creating and caching LangGraph agents.
 *
 * Implements lazy loading: agents are created on first use, not at startup.
 * Agents are cached to avoid expensive re-initialization.
 */
export class AgentFactory {
  private readonly agents = new Map<string, ChatAgent>();

  constructor(private readonly options: AgentFactoryOptions) {}

  /**
   * Get or create an agent for the specified agentId.
   *
   * Lazy loading: Config is loaded on first use of each agentId.
   * Caching: Agent instance is reused for subsequent calls with same agentId.
   *
   * @param agentId - Optional agent ID. If not provided, uses first available config.
   * @returns Chat agent instance
   * @throws Error if config is invalid or not found
   */
  async getOrCreateAgent(agentId?: string): Promise<ChatAgent> {
    // Phase 1: If no agentId provided, use first available config
    const resolvedAgentId = agentId ?? (await this.getDefaultAgentId());

    // Check cache first
    if (this.agents.has(resolvedAgentId)) {
      this.options.logger?.debug({ agentId: resolvedAgentId }, 'Using cached agent instance');
      return this.agents.get(resolvedAgentId)!;
    }

    // LAZY LOADING: First time this agentId is used, load config
    this.options.logger?.info(
      { agentId: resolvedAgentId },
      'Creating new agent instance (lazy loading)',
    );

    const agentConfig = await loadAgentConfig(
      resolvedAgentId,
      this.options.prisma,
      this.options.logger,
    );

    const agent = createLangGraphChatAgent(
      agentConfig,
      this.options.logger,
      this.options.checkpointer,
      this.options.connectionManager,
    );

    // Cache for reuse
    this.agents.set(resolvedAgentId, agent);

    this.options.logger?.info(
      { agentId: resolvedAgentId, agentName: agentConfig.name },
      'Agent instance created and cached',
    );

    return agent;
  }

  /**
   * Get the default agent ID for Phase 1 (first available config).
   *
   * @returns Agent ID (first available)
   * @throws Error if no agent configs are found (graceful - tells user to create one)
   */
  private async getDefaultAgentId(): Promise<string> {
    const configs = await discoverAgentConfigs(this.options.prisma, this.options.logger);

    if (configs.length === 0) {
      throw new Error('No agents configured. Please create your first agent via the UI at /agents');
    }

    // Phase 1: Use first available config
    this.options.logger?.info(
      { agentId: configs[0].id, agentName: configs[0].name },
      'Using first available agent config',
    );
    return configs[0].id;
  }

  /**
   * Clear the agent cache (useful for testing or config reloading).
   */
  clearCache(): void {
    this.agents.clear();
    this.options.logger?.info('Agent cache cleared');
  }
}

/**
 * Create an agent factory instance.
 */
export function createAgentFactory(options: AgentFactoryOptions): AgentFactory {
  return new AgentFactory(options);
}
