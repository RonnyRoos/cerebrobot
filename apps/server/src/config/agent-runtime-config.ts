/**
 * Agent Configuration Bridge
 *
 * Bridges between AgentConfig (JSON files) and ServerConfig (runtime config).
 * Loads agent config with fallback to .env, combines with infrastructure settings.
 */

import type { Logger } from 'pino';
import type { AgentConfig } from './agent-config.js';
import { discoverAgentConfigs, loadAgentConfig } from './agent-loader.js';
import { loadConfigFromEnv, type ServerConfig } from '../config.js';

/**
 * Extended server config that includes agent-specific settings.
 * Replaces process.env dependencies with explicit config object.
 */
export interface AgentRuntimeConfig {
  /** Agent personality configuration */
  readonly agent: AgentConfig;

  /** Infrastructure configuration (port, persistence, etc.) */
  readonly server: ServerConfig;
}

/**
 * Load agent configuration for single-agent mode (Phase 1 MVP).
 *
 * Attempts to load from JSON files first, falls back to .env if none found.
 * For Phase 1, uses the first available agent config.
 * Phase 2 will add agent selection support.
 *
 * @param logger - Optional logger for warnings/info
 * @returns Agent runtime configuration
 * @throws Error if no valid config found
 */
export async function loadAgentRuntimeConfig(logger?: Logger): Promise<AgentRuntimeConfig> {
  // Load infrastructure config from .env
  const serverConfig = loadConfigFromEnv();

  try {
    // Attempt to load from JSON files
    const agents = await discoverAgentConfigs(logger);

    if (agents.length === 0) {
      logger?.info('No JSON agent configs found, using .env fallback');
      const envFallbackConfig = await loadAgentConfig(
        '00000000-0000-0000-0000-000000000000',
        logger,
      );
      return {
        agent: envFallbackConfig,
        server: serverConfig,
      };
    }

    // Phase 1: Use first available agent
    const selectedAgent = agents[0];
    logger?.info(
      { agentId: selectedAgent.id, agentName: selectedAgent.name },
      'Loading agent configuration',
    );

    const agentConfig = await loadAgentConfig(selectedAgent.id, logger);

    return {
      agent: agentConfig,
      server: serverConfig,
    };
  } catch (error) {
    logger?.warn({ error }, 'Failed to load JSON agent configs, falling back to .env');

    // Fallback to .env
    const envFallbackConfig = await loadAgentConfig('00000000-0000-0000-0000-000000000000', logger);
    return {
      agent: envFallbackConfig,
      server: serverConfig,
    };
  }
}
