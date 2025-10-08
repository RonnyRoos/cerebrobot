import { z } from 'zod';

const NonEmptyString = z.string().trim().min(1, 'Value cannot be empty');

export const ChatRequestSchema = z
  .object({
    sessionId: NonEmptyString,
    message: NonEmptyString,
    clientRequestId: NonEmptyString.optional(),
    userId: z.string().uuid(), // REQUIRED: All chats must be tied to a user
  })
  .strict();

export const ChatErrorSchema = z
  .object({
    message: NonEmptyString,
    retryable: z.boolean().default(false),
  })
  .strict();

export const TokenUsageSchema = z
  .object({
    recentTokens: z.number().int().nonnegative(),
    overflowTokens: z.number().int().nonnegative(),
    budget: z.number().int().nonnegative(),
    utilisationPct: z.number().int().min(0).max(100),
  })
  .strip();

export const ChatResponseMetadataSchema = z
  .object({
    latencyMs: z.number().int().nonnegative().optional(),
    tokensConsumed: z.number().int().nonnegative().optional(),
    tokenUsage: TokenUsageSchema.optional(),
  })
  .strip();

export const ChatResponseSchema = z
  .object({
    sessionId: NonEmptyString,
    correlationId: NonEmptyString,
    message: z.string(),
    latencyMs: z.number().int().nonnegative(),
    streamed: z.boolean(),
    error: ChatErrorSchema.optional(),
    metadata: ChatResponseMetadataSchema.optional(),
  })
  .strict();

export const ChatStreamTokenEventSchema = z
  .object({
    type: z.literal('token'),
    value: z.string(),
  })
  .strict();

export const ChatStreamFinalEventSchema = z
  .object({
    type: z.literal('final'),
    message: z.string(),
    latencyMs: z.number().int().nonnegative().optional(),
    summary: z.string().optional(),
    tokenUsage: TokenUsageSchema.optional(),
  })
  .strict();

export const ChatStreamErrorEventSchema = ChatErrorSchema.extend({
  type: z.literal('error'),
}).strict();

export const ChatStreamEventSchema = z.union([
  ChatStreamTokenEventSchema,
  ChatStreamFinalEventSchema,
  ChatStreamErrorEventSchema,
]);

export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
export type ChatError = z.infer<typeof ChatErrorSchema>;
export type ChatStreamEvent = z.infer<typeof ChatStreamEventSchema>;
export type TokenUsage = z.infer<typeof TokenUsageSchema>;
