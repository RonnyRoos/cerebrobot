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
import { loadConfigFromEnv } from '../config.js';

// Resolve config directory relative to repository root (3 levels up from this file)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_DIR = path.resolve(__dirname, '../../../../config/agents');
const TEMPLATE_FILE = 'template.json';

/**
 * Discover all agent configurations with fail-fast validation.
 *
 * Scans CONFIG_DIR, validates ALL .json files (except template.json).
 * If ANY config is invalid, throws error (fail-fast).
 * Falls back to .env if directory missing/empty.
 *
 * @param logger - Optional logger for warnings
 * @returns Array of agent metadata (id, name only)
 * @throws Error if any config file is invalid or unreadable
 */
export async function discoverAgentConfigs(logger?: Logger): Promise<AgentMetadata[]> {
  try {
    const files = await fs.readdir(CONFIG_DIR);
    const jsonFiles = files.filter(
      (f) => f.endsWith('.json') && f !== TEMPLATE_FILE && !f.startsWith('.'),
    );

    if (jsonFiles.length === 0) {
      logger?.info('No agent configs found, falling back to .env');
      return buildEnvFallbackMetadata();
    }

    // Validate ALL configs (fail-fast)
    const metadataPromises = jsonFiles.map(async (filename) => {
      const filePath = path.join(CONFIG_DIR, filename);
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
  } catch (error: unknown) {
    // Directory missing or unreadable → fallback to .env
    if (isNodeError(error) && error.code === 'ENOENT') {
      logger?.info(`Agent config directory not found: ${CONFIG_DIR}, falling back to .env`);
      return buildEnvFallbackMetadata();
    }

    // Validation errors → fail-fast
    throw error;
  }
}

/**
 * Load a specific agent configuration by ID with strict validation.
 *
 * Reads file from CONFIG_DIR, validates against schema.
 * If config invalid or not found, throws error (fail-fast).
 * Falls back to .env if directory missing/empty.
 *
 * @param agentId - UUID of the agent to load
 * @param logger - Optional logger for warnings
 * @returns Validated agent configuration
 * @throws Error if config not found, invalid, or unreadable
 */
export async function loadAgentConfig(agentId: string, logger?: Logger): Promise<AgentConfig> {
  try {
    const files = await fs.readdir(CONFIG_DIR);
    const jsonFiles = files.filter(
      (f) => f.endsWith('.json') && f !== TEMPLATE_FILE && !f.startsWith('.'),
    );

    if (jsonFiles.length === 0) {
      logger?.info('No agent configs found, falling back to .env');
      return buildEnvFallbackConfig();
    }

    // Find config file with matching ID
    for (const filename of jsonFiles) {
      const filePath = path.join(CONFIG_DIR, filename);
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
  } catch (error: unknown) {
    // Directory missing → fallback to .env
    if (isNodeError(error) && error.code === 'ENOENT') {
      logger?.info(`Agent config directory not found: ${CONFIG_DIR}, falling back to .env`);
      return buildEnvFallbackConfig();
    }

    // Re-throw validation errors
    throw error;
  }
}

/**
 * Build fallback AgentMetadata from current .env configuration.
 *
 * @returns Array with single agent metadata entry
 */
function buildEnvFallbackMetadata(): AgentMetadata[] {
  const config = loadConfigFromEnv();
  return [
    {
      id: '00000000-0000-0000-0000-000000000000', // Sentinel UUID for .env fallback
      name: config.personaTag || 'Default Agent',
    },
  ];
}

/**
 * Build fallback AgentConfig from current .env configuration.
 *
 * @returns Complete agent config from environment variables
 */
function buildEnvFallbackConfig(): AgentConfig {
  const serverConfig = loadConfigFromEnv();

  // Load memory config from environment
  const memoryApiKey = process.env.DEEPINFRA_API_KEY;
  if (!memoryApiKey) {
    throw new Error('DEEPINFRA_API_KEY is required when using .env fallback');
  }

  return {
    id: '00000000-0000-0000-0000-000000000000', // Sentinel UUID
    name: serverConfig.personaTag || 'Default Agent',
    systemPrompt: serverConfig.systemPrompt,
    personaTag: serverConfig.personaTag,
    llm: {
      model: serverConfig.model,
      temperature: serverConfig.temperature,
      apiKey: memoryApiKey,
      apiBase: process.env.DEEPINFRA_API_BASE || 'https://api.deepinfra.com/v1/openai',
    },
    memory: {
      hotPathLimit: serverConfig.hotpathLimit,
      hotPathTokenBudget: serverConfig.hotpathTokenBudget,
      recentMessageFloor: serverConfig.recentMessageFloor,
      hotPathMarginPct: serverConfig.hotpathMarginPct,
      embeddingModel: process.env.MEMORY_EMBEDDING_MODEL || 'Qwen/Qwen3-Embedding-8B',
      embeddingEndpoint:
        process.env.MEMORY_EMBEDDING_ENDPOINT || 'https://api.deepinfra.com/v1/openai',
      similarityThreshold: process.env.MEMORY_SIMILARITY_THRESHOLD
        ? parseFloat(process.env.MEMORY_SIMILARITY_THRESHOLD)
        : 0.7,
      maxTokens: process.env.MEMORY_MAX_TOKENS ? parseInt(process.env.MEMORY_MAX_TOKENS, 10) : 2048,
      injectionBudget: process.env.MEMORY_INJECTION_BUDGET
        ? parseInt(process.env.MEMORY_INJECTION_BUDGET, 10)
        : 1000,
      retrievalTimeoutMs: process.env.MEMORY_RETRIEVAL_TIMEOUT_MS
        ? parseInt(process.env.MEMORY_RETRIEVAL_TIMEOUT_MS, 10)
        : 5000,
    },
  };
}

/**
 * Type guard for Node.js errors with code property
 */
function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
