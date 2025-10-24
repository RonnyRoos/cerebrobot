import { z } from 'zod';

/**
 * Agent List Item Schema
 * Represents a single agent configuration in the listing
 */
export const AgentListItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
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
 */
export const AgentLLMConfigSchema = z.object({
  model: z.string().min(1),
  temperature: z.number().min(0).max(2),
  apiKey: z.string().min(1),
  apiBase: z.string().url(),
});

export const AgentMemoryConfigSchema = z.object({
  hotPathLimit: z.number().int().positive(),
  hotPathTokenBudget: z.number().int().positive(),
  recentMessageFloor: z.number().int().nonnegative(),
  hotPathMarginPct: z.number().min(0).max(1),
  embeddingModel: z.string().min(1),
  embeddingEndpoint: z.string().url(),
  similarityThreshold: z.number().min(0).max(1),
  maxTokens: z.number().int().positive(),
  injectionBudget: z.number().int().positive(),
  retrievalTimeoutMs: z.number().int().positive(),
});

export const AgentAutonomyEvaluatorConfigSchema = z.object({
  model: z.string().min(1),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().positive(),
  systemPrompt: z.string().min(1),
});

export const AgentAutonomyLimitsConfigSchema = z.object({
  maxFollowUpsPerSession: z.number().int().positive(),
  minDelayMs: z.number().int().positive(),
  maxDelayMs: z.number().int().positive(),
});

export const AgentAutonomyMemoryContextConfigSchema = z.object({
  recentMemoryCount: z.number().int().nonnegative(),
  includeRecentMessages: z.number().int().positive(),
});

export const AgentAutonomyConfigSchema = z.object({
  enabled: z.boolean(),
  evaluator: AgentAutonomyEvaluatorConfigSchema,
  limits: AgentAutonomyLimitsConfigSchema,
  memoryContext: AgentAutonomyMemoryContextConfigSchema,
});

export const AgentConfigSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  systemPrompt: z.string().min(1),
  personaTag: z.string().min(1),
  llm: AgentLLMConfigSchema,
  memory: AgentMemoryConfigSchema,
  autonomy: AgentAutonomyConfigSchema,
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type AgentAutonomyConfig = z.infer<typeof AgentAutonomyConfigSchema>;
