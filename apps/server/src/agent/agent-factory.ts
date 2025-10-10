/**
 * Agent Factory
 *
 * Lazy loading and caching of LangGraph agents based on configuration.
 * Configs are loaded on-demand (first use), not at startup.
 */

import type { Logger } from 'pino';
import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import type { ServerConfig } from '../config.js';
import type { ChatAgent } from '../chat/chat-agent.js';
import {
  discoverAgentConfigs,
  loadAgentConfig,
  ENV_FALLBACK_AGENT_ID,
} from '../config/agent-loader.js';
import { createLangGraphChatAgent } from './langgraph-agent.js';

export interface AgentFactoryOptions {
  readonly serverConfig: ServerConfig;
  readonly logger?: Logger;
  readonly checkpointer?: BaseCheckpointSaver;
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
   * @param agentId - Optional agent ID. If not provided, uses first available config or .env fallback.
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

    const agentConfig = await loadAgentConfig(resolvedAgentId, this.options.logger);

    const agent = createLangGraphChatAgent(
      this.options.serverConfig,
      agentConfig,
      this.options.logger,
      this.options.checkpointer,
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
   * Get the default agent ID for Phase 1 (first available config or .env fallback).
   *
   * @returns Agent ID (first available) or ENV_FALLBACK_AGENT_ID for .env fallback
   */
  private async getDefaultAgentId(): Promise<string> {
    try {
      const configs = await discoverAgentConfigs(this.options.logger);

      if (configs.length === 0) {
        this.options.logger?.info('No JSON configs found, using .env fallback');
        return ENV_FALLBACK_AGENT_ID;
      }

      // Phase 1: Use first available config
      this.options.logger?.info(
        { agentId: configs[0].id, agentName: configs[0].name },
        'Using first available agent config',
      );
      return configs[0].id;
    } catch (error) {
      this.options.logger?.warn({ error }, 'Failed to discover configs, using .env fallback');
      return ENV_FALLBACK_AGENT_ID;
    }
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
