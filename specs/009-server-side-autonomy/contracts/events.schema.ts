/**
 * Event Schemas - Autonomy Extensions (009)
 * 
 * EXTENDS 008 foundation with timer and tool_result event types.
 * 
 * NOTE: In implementation, this file extends the schemas from 008/contracts/events.schema.ts
 * by adding new event types to EventTypeSchema enum and new payload schemas.
 * 
 * Foundation from 008:
 * - SessionKeySchema
 * - EventTypeSchema base: ['user_message']
 * - UserMessagePayloadSchema
 * - EventSchema structure
 * 
 * Added in 009:
 * - 'timer' and 'tool_result' to EventTypeSchema
 * - TimerPayloadSchema
 * - ToolResultPayloadSchema
 */

import { z } from 'zod';

// Re-exported from 008 (implementation imports from @/events/schemas)
export const SessionKeySchema = z.string()
  .regex(/^[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+$/, 'Invalid SESSION_KEY format')
  .brand<'SessionKey'>();

export type SessionKey = z.infer<typeof SessionKeySchema>;

// EXTENDED in 009: adds 'timer', 'tool_result' to 008's ['user_message']
export const EventTypeSchema = z.enum(['user_message', 'timer', 'tool_result']);
export type EventType = z.infer<typeof EventTypeSchema>;

// Re-exported from 008
export const UserMessagePayloadSchema = z.object({
  text: z.string().min(1),
});

// NEW in 009: Timer event payload
export const TimerPayloadSchema = z.object({
  timer_id: z.string(),
  payload: z.unknown().optional(),
});

// NEW in 009: Tool result event payload
export const ToolResultPayloadSchema = z.object({
  tool_id: z.string(),
  payload: z.unknown(),
});

// EXTENDED in 009: adds Timer and ToolResult to union
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

// Event creation schema (without id/created_at)
export const CreateEventSchema = z.object({
  session_key: SessionKeySchema,
  seq: z.number().int().positive(),
  type: EventTypeSchema,
  payload: EventPayloadSchema,
});

export type CreateEvent = z.infer<typeof CreateEventSchema>;

// Typed event constructors
export function createUserMessageEvent(
  sessionKey: SessionKey,
  seq: number,
  text: string
): CreateEvent {
  return {
    session_key: sessionKey,
    seq,
    type: 'user_message',
    payload: { text },
  };
}

export function createTimerEvent(
  sessionKey: SessionKey,
  seq: number,
  timerId: string,
  payload?: unknown
): CreateEvent {
  return {
    session_key: sessionKey,
    seq,
    type: 'timer',
    payload: { timer_id: timerId, payload },
  };
}

export function createToolResultEvent(
  sessionKey: SessionKey,
  seq: number,
  toolId: string,
  payload: unknown
): CreateEvent {
  return {
    session_key: sessionKey,
    seq,
    type: 'tool_result',
    payload: { tool_id: toolId, payload },
  };
}

// Helper to parse SESSION_KEY components
export interface SessionKeyComponents {
  userId: string;
  agentId: string;
  threadId: string;
}

export function parseSessionKey(sessionKey: SessionKey): SessionKeyComponents {
  const [userId, agentId, threadId] = sessionKey.split(':');
  return { userId, agentId, threadId };
}

export function buildSessionKey(
  userId: string,
  agentId: string,
  threadId: string
): SessionKey {
  const raw = `${userId}:${agentId}:${threadId}`;
  return SessionKeySchema.parse(raw);
}
