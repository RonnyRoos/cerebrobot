import { z } from 'zod';

/**
 * Agent List Item Schema
 * Represents a single agent configuration in the listing
 * Updated per spec 011: includes timestamps and autonomy status (no description)
 */
export const AgentListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  autonomyEnabled: z.boolean(),
});

export type AgentListItem = z.infer<typeof AgentListItemSchema>;

/**
 * Agent List Response Schema
 * API response from GET /api/agents
 */
export const AgentListResponseSchema = z.object({
  agents: z.array(AgentListItemSchema),
});

export type AgentListResponse = z.infer<typeof AgentListResponseSchema>;

/**
 * Agent Configuration Schema
 * Full agent configuration including autonomy settings (spec 009)
 * Updated per spec 011: added validation ranges and string length constraints
 */
export const AgentLLMConfigSchema = z.object({
  model: z.string().min(1),
  temperature: z.number().min(0).max(2),
  apiKey: z.string().min(1),
  apiBase: z.string().url(),
  maxTokens: z.number().int().min(1).max(2000000).optional(),
});

export const AgentMemoryConfigSchema = z.object({
  hotPathLimit: z.number().int().min(1).max(1000),
  hotPathTokenBudget: z.number().int().min(100).max(2000000),
  recentMessageFloor: z.number().int().min(0).max(100),
  hotPathMarginPct: z.number().min(0).max(1),
  embeddingModel: z.string().min(1),
  embeddingEndpoint: z.string().url(),
  apiKey: z.string().min(1),
  similarityThreshold: z.number().min(0).max(1),
  maxTokens: z.number().int().min(100).max(2000000),
  injectionBudget: z.number().int().min(100).max(2000000),
  retrievalTimeoutMs: z.number().int().min(100).max(60000),
});

export const AgentAutonomyEvaluatorConfigSchema = z.object({
  model: z.string().min(1),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().min(1).max(2000000),
  systemPrompt: z.string().min(1),
});

export const AgentAutonomyLimitsConfigSchema = z.object({
  maxFollowUpsPerSession: z.number().int().min(1).max(100),
  minDelayMs: z.number().int().min(1000).max(3600000),
  maxDelayMs: z.number().int().min(1000).max(3600000),
});

export const AgentAutonomyMemoryContextConfigSchema = z.object({
  recentMemoryCount: z.number().int().min(0).max(100),
  includeRecentMessages: z.number().int().min(0).max(100),
});

export const AgentAutonomyConfigSchema = z.object({
  enabled: z.boolean(),
  evaluator: AgentAutonomyEvaluatorConfigSchema,
  limits: AgentAutonomyLimitsConfigSchema,
  memoryContext: AgentAutonomyMemoryContextConfigSchema,
});

export const AgentConfigSchema = z.object({
  name: z.string().min(1).max(100),
  systemPrompt: z.string().min(1).max(10000),
  personaTag: z.string().min(1).max(50),
  llm: AgentLLMConfigSchema,
  memory: AgentMemoryConfigSchema,
  autonomy: AgentAutonomyConfigSchema,
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

/**
 * Full Agent Schema (with database metadata)
 * Used for API responses that include id and timestamps
 */
export const AgentSchema = AgentConfigSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Agent = z.infer<typeof AgentSchema>;
export type AgentAutonomyConfig = z.infer<typeof AgentAutonomyConfigSchema>;
