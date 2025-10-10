import { z } from 'zod';

/**
 * Thread Metadata Schema
 * Represents summary information about a single conversation thread
 */
export const ThreadMetadataSchema = z.object({
  threadId: z.string().uuid(),
  userId: z.string().uuid(),
  agentId: z.string(), // Agent configuration ID for this thread
  title: z.string().min(1).max(50),
  lastMessage: z.string().max(100),
  lastMessageRole: z.enum(['user', 'assistant']),
  messageCount: z.number().int().nonnegative(),
  createdAt: z.date(),
  updatedAt: z.date(),
  isEmpty: z.boolean(),
});

export type ThreadMetadata = z.infer<typeof ThreadMetadataSchema>;

/**
 * Thread List Response Schema
 * API response containing list of threads for a user
 */
export const ThreadListResponseSchema = z.object({
  threads: z.array(ThreadMetadataSchema),
  total: z.number().int().nonnegative(),
});

export type ThreadListResponse = z.infer<typeof ThreadListResponseSchema>;

/**
 * Message Schema
 * Individual message in a conversation thread
 */
export const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  timestamp: z.date(),
});

export type Message = z.infer<typeof MessageSchema>;

/**
 * Message History Response Schema
 * Complete conversation history for a thread
 */
export const MessageHistoryResponseSchema = z.object({
  threadId: z.string().uuid(),
  messages: z.array(MessageSchema),
});

export type MessageHistoryResponse = z.infer<typeof MessageHistoryResponseSchema>;

/**
 * Thread Creation Response Schema
 * API response from POST /api/thread
 */
export const ThreadCreateResponseSchema = z.object({
  threadId: z.string().uuid(),
});

export type ThreadCreateResponse = z.infer<typeof ThreadCreateResponseSchema>;
