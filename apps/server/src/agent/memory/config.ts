/**
 * Memory Configuration
 *
 * Loads and validates memory system configuration from environment variables.
 */

import { z } from 'zod';

/**
 * Memory Configuration Schema (System-level)
 *
 * Loaded from environment variables for runtime configuration.
 * Distinct from AgentMemoryConfigSchema in config/agent-config.ts.
 */
export const SystemMemoryConfigSchema = z.object({
  /** Enable/disable memory features */
  enabled: z.boolean().default(true),

  /** DeepInfra API key for embeddings */
  apiKey: z.string().min(1),

  /** Embedding service endpoint (OpenAI-compatible) */
  embeddingEndpoint: z.string().url().default('https://api.deepinfra.com/v1/openai'),

  /** Embedding model name */
  embeddingModel: z.string().default('Qwen/Qwen3-Embedding-8B'),

  /** Similarity threshold for retrieval (0-1) */
  similarityThreshold: z.number().min(0).max(1).default(0.7),

  /** Maximum tokens per memory content */
  contentMaxTokens: z.number().int().positive().default(2048),

  /** Maximum total tokens for injected memories */
  injectionBudget: z.number().int().positive().default(1000),

  /** Memory retrieval timeout in milliseconds */
  retrievalTimeoutMs: z.number().int().positive().default(5000),
});

/**
 * Memory System Configuration
 */

/**
 * Embedding dimension for vector storage.
 * Must match the embedding model being used:
 * - OpenAI text-embedding-ada-002: 1536
 * - OpenAI text-embedding-3-small: 1536
 * - OpenAI text-embedding-3-large: 3072
 * - Qwen/Qwen3-Embedding-8B (DeepInfra): 1536
 */
export const EMBEDDING_DIMENSIONS = 1536;

export type MemoryConfig = z.infer<typeof SystemMemoryConfigSchema>;

/**
 * Load memory configuration from environment variables
 *
 * @returns Validated memory configuration
 * @throws Error if required environment variables are missing or invalid
 */
export function loadMemoryConfig(): MemoryConfig {
  const rawConfig = {
    enabled: process.env.MEMORY_ENABLED !== 'false',
    apiKey: process.env.DEEPINFRA_API_KEY,
    embeddingEndpoint: process.env.MEMORY_EMBEDDING_ENDPOINT,
    embeddingModel: process.env.MEMORY_EMBEDDING_MODEL,
    similarityThreshold: process.env.MEMORY_SIMILARITY_THRESHOLD
      ? parseFloat(process.env.MEMORY_SIMILARITY_THRESHOLD)
      : undefined,
    contentMaxTokens: process.env.MEMORY_MAX_TOKENS
      ? parseInt(process.env.MEMORY_MAX_TOKENS, 10)
      : undefined,
    injectionBudget: process.env.MEMORY_INJECTION_BUDGET
      ? parseInt(process.env.MEMORY_INJECTION_BUDGET, 10)
      : undefined,
    retrievalTimeoutMs: process.env.MEMORY_RETRIEVAL_TIMEOUT_MS
      ? parseInt(process.env.MEMORY_RETRIEVAL_TIMEOUT_MS, 10)
      : undefined,
  };

  return SystemMemoryConfigSchema.parse(rawConfig);
}
