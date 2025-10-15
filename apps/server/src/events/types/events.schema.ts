/**
 * Event Schemas for 008-migrate-to-events-effects
 *
 * Defines user_message event type only.
 * Spec 009 will extend with timer and tool_result types.
 */

import { z } from 'zod';

// Session Key branded type
export const SessionKeySchema = z
  .string()
  .regex(/^[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+$/, 'Invalid SESSION_KEY format')
  .brand<'SessionKey'>();

export type SessionKey = z.infer<typeof SessionKeySchema>;

// Event type (008: user_message only)
export const EventTypeSchema = z.enum(['user_message']);
export type EventType = z.infer<typeof EventTypeSchema>;

// User message payload
export const UserMessagePayloadSchema = z.object({
  text: z.string().min(1),
});

export type UserMessagePayload = z.infer<typeof UserMessagePayloadSchema>;

// Complete event schema
export const EventSchema = z.object({
  id: z.string().uuid(),
  session_key: SessionKeySchema,
  seq: z.number().int().positive(),
  type: EventTypeSchema,
  payload: UserMessagePayloadSchema,
  created_at: z.date(),
});

export type Event = z.infer<typeof EventSchema>;

// Event creation helper
export function createUserMessageEvent(sessionKey: SessionKey, seq: number, text: string) {
  return {
    session_key: sessionKey,
    seq,
    type: 'user_message' as const,
    payload: { text },
  };
}

// SESSION_KEY parsing
export function parseSessionKey(sessionKey: SessionKey): {
  userId: string;
  agentId: string;
  threadId: string;
} {
  const [userId, agentId, threadId] = sessionKey.split(':');
  return { userId, agentId, threadId };
}
