/**
 * Event Schemas for 008-migrate-to-events-effects
 *
 * Extended in spec 009 with timer and tool_result event types.
 */

import { z } from 'zod';

// Session Key branded type
export const SessionKeySchema = z
  .string()
  .regex(/^[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+$/, 'Invalid SESSION_KEY format')
  .brand<'SessionKey'>();

export type SessionKey = z.infer<typeof SessionKeySchema>;

// Event types (spec 008 + spec 009 extensions)
export const EventTypeSchema = z.enum(['user_message', 'timer', 'tool_result']);
export type EventType = z.infer<typeof EventTypeSchema>;

// User message payload (spec 008)
export const UserMessagePayloadSchema = z.object({
  text: z.string().min(1),
  requestId: z.string().uuid(),
});

export type UserMessagePayload = z.infer<typeof UserMessagePayloadSchema>;

// Timer event payload (spec 009)
export const TimerPayloadSchema = z.object({
  timer_id: z.string().min(1),
  payload: z.any().optional(),
});

export type TimerPayload = z.infer<typeof TimerPayloadSchema>;

// Tool result event payload (spec 009)
export const ToolResultPayloadSchema = z.object({
  tool_call_id: z.string().min(1),
  result: z.any(),
});

export type ToolResultPayload = z.infer<typeof ToolResultPayloadSchema>;

// Union of all event payloads
export const EventPayloadSchema = z.union([
  UserMessagePayloadSchema,
  TimerPayloadSchema,
  ToolResultPayloadSchema,
]);

export type EventPayload = z.infer<typeof EventPayloadSchema>;

// Complete event schema
export const EventSchema = z.object({
  id: z.string().uuid(),
  session_key: SessionKeySchema,
  seq: z.number().int().positive(),
  type: EventTypeSchema,
  payload: EventPayloadSchema,
  created_at: z.date(),
});

export type Event = z.infer<typeof EventSchema>;

// Event creation helper
export function createUserMessageEvent(
  sessionKey: SessionKey,
  seq: number,
  text: string,
  requestId: string,
) {
  return {
    session_key: sessionKey,
    seq,
    type: 'user_message' as const,
    payload: { text, requestId },
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
