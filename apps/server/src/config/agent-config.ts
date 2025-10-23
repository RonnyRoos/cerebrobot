/**
 * Agent Configuration Schema
 *
 * Zod schemas for validating agent configuration JSON files.
 * Supports dynamic loading of agent personalities from filesystem.
 */

import { z } from 'zod';
import { AgentAutonomyConfigSchema } from '@cerebrobot/chat-shared';

/**
 * LLM Provider Configuration
 */
export const LLMConfigSchema = z.object({
  /** Model identifier (e.g., "deepseek-ai/DeepSeek-V3.1-Terminus") */
  model: z.string().min(1, 'Model name is required'),

  /** Sampling temperature for response generation (0-2) */
  temperature: z.number().min(0).max(2, 'Temperature must be between 0 and 2'),

  /** API key for LLM provider (secret) */
  apiKey: z.string().min(1, 'API key is required'),

  /** Base URL for API endpoint */
  apiBase: z.string().url('Must be a valid URL'),
});

/**
 * Memory System Configuration (Agent-level)
 *
 * Defined in agent JSON configuration files.
 * Distinct from SystemMemoryConfigSchema in agent/memory/config.ts.
 */
export const AgentMemoryConfigSchema = z.object({
  /** Max recent messages kept verbatim before summarization */
  hotPathLimit: z.number().int().positive('Must be a positive integer'),

  /** Token budget for hot path window */
  hotPathTokenBudget: z.number().int().positive('Must be a positive integer'),

  /** Minimum guaranteed unsummarized messages */
  recentMessageFloor: z.number().int().nonnegative('Must be non-negative'),

  /** Headroom within token budget (0-1, e.g., 0.3 = use 70%) */
  hotPathMarginPct: z.number().min(0).max(1, 'Must be between 0 and 1'),

  /** Model for generating embeddings */
  embeddingModel: z.string().min(1, 'Embedding model is required'),

  /** API endpoint for embedding generation */
  embeddingEndpoint: z.string().url('Must be a valid URL'),

  /** Minimum similarity score for memory retrieval (0-1) */
  similarityThreshold: z.number().min(0).max(1, 'Must be between 0 and 1'),

  /** Max tokens for memory context injection */
  maxTokens: z.number().int().positive('Must be a positive integer'),

  /** Token budget for injected memory */
  injectionBudget: z.number().int().positive('Must be a positive integer'),

  /** Timeout for memory retrieval operations (milliseconds) */
  retrievalTimeoutMs: z.number().int().positive('Must be a positive integer'),
});

/**
 * Complete Agent Configuration
 */
export const AgentConfigSchema = z.object({
  /** Globally unique identifier (UUID v4) */
  id: z.string().uuid('Must be a valid UUID v4'),

  /** Human-readable name displayed in UI */
  name: z.string().min(1, 'Name is required'),

  /** Core personality prompt sent to LLM */
  systemPrompt: z.string().min(1, 'System prompt is required'),

  /** Tag for persona identification (e.g., "operator", "assistant") */
  personaTag: z.string().min(1, 'Persona tag is required'),

  /** LLM provider and model settings */
  llm: LLMConfigSchema,

  /** Memory system configuration */
  memory: AgentMemoryConfigSchema,

  /** Autonomy and follow-up message configuration (spec 009) */
  autonomy: AgentAutonomyConfigSchema,
});

/**
 * Agent Metadata (API Response)
 *
 * Lightweight representation for frontend display (excludes secrets).
 */
export const AgentMetadataSchema = z.object({
  /** Agent unique identifier */
  id: z.string().uuid(),

  /** Human-readable agent name */
  name: z.string(),
});

/**
 * TypeScript Types (inferred from schemas)
 */
export type LLMConfig = z.infer<typeof LLMConfigSchema>;
export type AgentMemoryConfig = z.infer<typeof AgentMemoryConfigSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type AgentMetadata = z.infer<typeof AgentMetadataSchema>;
