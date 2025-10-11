/**
 * Agent Configuration Loader
 *
 * Lazy loading of agent configurations with fail-fast validation.
 * Configs loaded on-demand (API requests, thread creation), not at startup.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import type { Logger } from 'pino';
import {
  AgentConfigSchema,
  AgentMetadataSchema,
  type AgentConfig,
  type AgentMetadata,
} from './agent-config.js';
// NOTE: Agent configs should NOT fall back to .env
// import { loadConfigFromEnv } from '../config.js';

// Resolve config directory relative to repository root (3 levels up from this file)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_DIR = path.resolve(__dirname, '../../../../config/agents');
const TEMPLATE_FILE = 'template.json';

/**
 * Reserved UUID for .env fallback agent configuration.
 *
 * This UUID is used when no JSON agent configs exist and the system
 * falls back to reading configuration from environment variables.
 *
 * Format: Uses version 5 UUID structure to indicate it's deterministic.
/**
 * Options for AgentLoader constructor
 */
export interface AgentLoaderOptions {
  /**
   * Directory containing agent configuration JSON files.
   * Defaults to CONFIG_DIR (config/agents) in production.
   * Injectable for testing.
   */
  readonly configDir?: string;

  /**
   * Optional logger for diagnostic messages
   */
  readonly logger?: Logger;
}

/**
 * Agent Configuration Loader
 *
 * Handles discovery and loading of agent configurations from filesystem.
 * Supports dependency injection for testing (configDir parameter).
 */
export class AgentLoader {
  private readonly configDir: string;
  private readonly logger?: Logger;

  constructor(options: AgentLoaderOptions = {}) {
    this.configDir = options.configDir ?? CONFIG_DIR;
    this.logger = options.logger;
  }

  /**
   * Discover all agent configurations with fail-fast validation.
   *
   * Scans configDir, validates ALL .json files (except template.json).
   * If ANY config is invalid, throws error (fail-fast).
   * NO .env fallback - agent configs MUST be in JSON files.
   *
   * @returns Array of agent metadata (id, name only)
   * @throws Error if any config file is invalid or unreadable
   */
  async discoverAgentConfigs(): Promise<AgentMetadata[]> {
    return this.discoverFromFilesystem();
  }

  /**
   * Load a specific agent configuration by ID with strict validation.
   *
   * Reads file from configDir, validates against schema.
   * NO .env fallback - agent configs MUST be in JSON files.
   * If config invalid or not found, throws error (fail-fast).
   *
   * @param agentId - UUID of the agent to load
   * @returns Validated agent configuration
   * @throws Error if config not found, invalid, or unreadable
   */
  async loadAgentConfig(agentId: string): Promise<AgentConfig> {
    return this.loadFromFilesystem(agentId);
  }

  /**
   * Discover agent configs from filesystem (internal implementation)
   */
  private async discoverFromFilesystem(): Promise<AgentMetadata[]> {
    const files = await fs.readdir(this.configDir);
    const jsonFiles = files.filter(
      (f) => f.endsWith('.json') && f !== TEMPLATE_FILE && !f.startsWith('.'),
    );

    if (jsonFiles.length === 0) {
      throw new Error(`No agent configs found in ${this.configDir}`);
    }

    // Validate ALL configs (fail-fast)
    const metadataPromises = jsonFiles.map(async (filename) => {
      const filePath = path.join(this.configDir, filename);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const json = JSON.parse(content);
        const config = AgentConfigSchema.parse(json);

        return AgentMetadataSchema.parse({ id: config.id, name: config.name });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const issues = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
          throw new Error(`Agent config validation failed in ${filename}: ${issues.join(', ')}`);
        }
        if (error instanceof SyntaxError) {
          throw new Error(`Failed to parse JSON in ${filename}: ${error.message}`);
        }
        throw new Error(`Failed to read agent config ${filename}: ${String(error)}`);
      }
    });

    return await Promise.all(metadataPromises);
  }

  /**
   * Load specific agent config from filesystem (internal implementation)
   */
  private async loadFromFilesystem(agentId: string): Promise<AgentConfig> {
    const files = await fs.readdir(this.configDir);
    const jsonFiles = files.filter(
      (f) => f.endsWith('.json') && f !== TEMPLATE_FILE && !f.startsWith('.'),
    );

    if (jsonFiles.length === 0) {
      throw new Error(`No agent configs found in ${this.configDir}`);
    }

    // Find config file with matching ID
    for (const filename of jsonFiles) {
      const filePath = path.join(this.configDir, filename);
      const content = await fs.readFile(filePath, 'utf-8');
      const json = JSON.parse(content);

      if (json.id === agentId) {
        try {
          return AgentConfigSchema.parse(json);
        } catch (error) {
          if (error instanceof z.ZodError) {
            const issues = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
            throw new Error(`Agent config validation failed in ${filename}: ${issues.join(', ')}`);
          }
          throw error;
        }
      }
    }

    // Not found
    throw new Error(`Agent configuration not found: ${agentId}`);
  }

  /**
   * Execute operation with .env fallback on ENOENT errors
   *
   * DRY helper to eliminate duplicated fallback logic.
   */
  private async withEnvFallback<T>(
    operation: () => Promise<T>,
    fallback: () => T,
    context: string,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: unknown) {
      // Directory missing or unreadable → fallback to .env
      if (isNodeError(error) && error.code === 'ENOENT') {
        this.logger?.info(`${context}, falling back to .env`);
        return fallback();
      }

      // Validation errors and other errors → fail-fast
      throw error;
    }
  }
}

/**
 * Discover all agent configurations with fail-fast validation.
 *
 * Module-level convenience function for backward compatibility.
 * Uses default CONFIG_DIR from environment.
 *
 * @param logger - Optional logger for warnings
 * @returns Array of agent metadata (id, name only)
 * @throws Error if any config file is invalid or unreadable
 */
export async function discoverAgentConfigs(logger?: Logger): Promise<AgentMetadata[]> {
  const loader = new AgentLoader({ logger });
  return loader.discoverAgentConfigs();
}

/**
 * Load a specific agent configuration by ID with strict validation.
 *
 * Module-level convenience function for backward compatibility.
 * Uses default CONFIG_DIR from environment.
 *
 * @param agentId - UUID of the agent to load
 * @param logger - Optional logger for warnings
 * @returns Validated agent configuration
 * @throws Error if config not found, invalid, or unreadable
 */
export async function loadAgentConfig(agentId: string, logger?: Logger): Promise<AgentConfig> {
  const loader = new AgentLoader({ logger });
  return loader.loadAgentConfig(agentId);
}

/**
 * REMOVED: .env fallback logic
 *
 * Agent configs MUST be in JSON files. No fallback to .env.
 * Functions buildEnvFallbackMetadata() and buildEnvFallbackConfig() removed.
 */

/**
 * Type guard for Node.js errors with code property
 */
function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
