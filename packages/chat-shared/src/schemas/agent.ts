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
  model: z.string().min(1, { message: 'LLM model is required' }),
  temperature: z
    .number()
    .min(0, { message: 'Temperature must be between 0 and 2' })
    .max(2, { message: 'Temperature must be between 0 and 2' }),
  apiKey: z.string().min(1, { message: 'LLM API key is required' }),
  apiBase: z.string().url({ message: 'LLM API base must be a valid URL' }),
  maxTokens: z
    .number()
    .int()
    .min(1, { message: 'Max tokens must be between 1 and 2,000,000' })
    .max(2000000, { message: 'Max tokens must be between 1 and 2,000,000' })
    .optional(),
});

/**
 * Summarizer Configuration Schema
 * Optional configuration for conversation summarization
 * If not specified, falls back to main LLM config
 * Allows cost optimization by using cheaper models for summarization
 */
export const AgentSummarizerConfigSchema = z.object({
  model: z.string().min(1, { message: 'Summarizer model is required' }).optional(),
  temperature: z
    .number()
    .min(0, { message: 'Summarizer temperature must be between 0 and 2' })
    .max(2, { message: 'Summarizer temperature must be between 0 and 2' })
    .optional(),
  apiKey: z.string().min(1, { message: 'Summarizer API key is required' }).optional(),
  apiBase: z.string().url({ message: 'Summarizer API base must be a valid URL' }).optional(),
  tokenBudget: z
    .number()
    .int()
    .min(100, { message: 'Token budget must be between 100 and 2,000,000' })
    .max(2000000, { message: 'Token budget must be between 100 and 2,000,000' })
    .optional(),
});

export const AgentMemoryConfigSchema = z.object({
  hotPathLimit: z
    .number()
    .int()
    .min(1, { message: 'Hot path limit must be between 1 and 1,000' })
    .max(1000, { message: 'Hot path limit must be between 1 and 1,000' }),
  hotPathTokenBudget: z
    .number()
    .int()
    .min(100, { message: 'Hot path token budget must be between 100 and 2,000,000' })
    .max(2000000, { message: 'Hot path token budget must be between 100 and 2,000,000' }),
  recentMessageFloor: z
    .number()
    .int()
    .min(0, { message: 'Recent message floor must be between 0 and 100' })
    .max(100, { message: 'Recent message floor must be between 0 and 100' }),
  hotPathMarginPct: z
    .number()
    .min(0, { message: 'Hot path margin must be between 0 and 1' })
    .max(1, { message: 'Hot path margin must be between 0 and 1' }),
  embeddingModel: z.string().min(1, { message: 'Embedding model is required' }),
  embeddingEndpoint: z.string().url({ message: 'Embedding endpoint must be a valid URL' }),
  apiKey: z.string().min(1, { message: 'Memory API key is required' }),
  similarityThreshold: z
    .number()
    .min(0, { message: 'Similarity threshold must be between 0 and 1' })
    .max(1, { message: 'Similarity threshold must be between 0 and 1' }),
  maxTokens: z
    .number()
    .int()
    .min(100, { message: 'Max tokens must be between 100 and 2,000,000' })
    .max(2000000, { message: 'Max tokens must be between 100 and 2,000,000' }),
  injectionBudget: z
    .number()
    .int()
    .min(100, { message: 'Injection budget must be between 100 and 2,000,000' })
    .max(2000000, { message: 'Injection budget must be between 100 and 2,000,000' }),
  retrievalTimeoutMs: z
    .number()
    .int()
    .min(100, { message: 'Retrieval timeout must be between 100ms and 60,000ms' })
    .max(60000, { message: 'Retrieval timeout must be between 100ms and 60,000ms' }),
});

export const AgentAutonomyEvaluatorConfigSchema = z.object({
  model: z.string().min(1, { message: 'Evaluator model is required' }),
  temperature: z
    .number()
    .min(0, { message: 'Evaluator temperature must be between 0 and 2' })
    .max(2, { message: 'Evaluator temperature must be between 0 and 2' }),
  maxTokens: z
    .number()
    .int()
    .min(1, { message: 'Evaluator max tokens must be between 1 and 2,000,000' })
    .max(2000000, { message: 'Evaluator max tokens must be between 1 and 2,000,000' }),
  systemPrompt: z.string().min(1, { message: 'Evaluator system prompt is required' }),
});

export const AgentAutonomyLimitsConfigSchema = z.object({
  maxFollowUpsPerSession: z
    .number()
    .int()
    .min(1, { message: 'Maximum follow-ups per session must be between 1 and 100' })
    .max(100, { message: 'Maximum follow-ups per session must be between 1 and 100' }),
  minDelayMs: z
    .number()
    .int()
    .min(1000, {
      message: 'Minimum delay must be between 1,000ms and 3,600,000ms (1 second to 1 hour)',
    })
    .max(3600000, {
      message: 'Minimum delay must be between 1,000ms and 3,600,000ms (1 second to 1 hour)',
    }),
  maxDelayMs: z
    .number()
    .int()
    .min(1000, {
      message: 'Maximum delay must be between 1,000ms and 3,600,000ms (1 second to 1 hour)',
    })
    .max(3600000, {
      message: 'Maximum delay must be between 1,000ms and 3,600,000ms (1 second to 1 hour)',
    }),
});

export const AgentAutonomyMemoryContextConfigSchema = z.object({
  recentMemoryCount: z
    .number()
    .int()
    .min(0, { message: 'Recent memory count must be between 0 and 100' })
    .max(100, { message: 'Recent memory count must be between 0 and 100' }),
  includeRecentMessages: z
    .number()
    .int()
    .min(0, { message: 'Recent messages count must be between 0 and 100' })
    .max(100, { message: 'Recent messages count must be between 0 and 100' }),
});

export const AgentAutonomyConfigSchema = z
  .object({
    enabled: z.boolean(),
    evaluator: AgentAutonomyEvaluatorConfigSchema.optional(),
    limits: AgentAutonomyLimitsConfigSchema.optional(),
    memoryContext: AgentAutonomyMemoryContextConfigSchema.optional(),
  })
  .superRefine((data, ctx) => {
    // Only validate nested fields if autonomy is enabled
    if (!data.enabled) {
      return; // Skip validation when disabled
    }

    // If enabled, validate that required fields are present
    if (!data.evaluator) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Evaluator configuration is required when autonomy is enabled',
        path: ['evaluator'],
      });
    }

    if (!data.limits) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Limits configuration is required when autonomy is enabled',
        path: ['limits'],
      });
    }

    if (!data.memoryContext) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Memory context configuration is required when autonomy is enabled',
        path: ['memoryContext'],
      });
    }
  });

export const AgentConfigSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Agent name is required' })
    .max(100, { message: 'Agent name must be 100 characters or less' }),
  systemPrompt: z
    .string()
    .min(1, { message: 'System prompt is required' })
    .max(10000, { message: 'System prompt must be 10,000 characters or less' }),
  personaTag: z
    .string()
    .min(1, { message: 'Persona tag is required' })
    .max(50, { message: 'Persona tag must be 50 characters or less' }),
  llm: AgentLLMConfigSchema,
  memory: AgentMemoryConfigSchema,
  autonomy: AgentAutonomyConfigSchema,
  summarizer: AgentSummarizerConfigSchema.optional(),
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
export type AgentSummarizerConfig = z.infer<typeof AgentSummarizerConfigSchema>;
