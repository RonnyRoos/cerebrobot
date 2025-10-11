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
