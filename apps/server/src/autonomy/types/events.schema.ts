/**
 * Event Schemas - Autonomy Extensions (009)
 *
 * EXTENDS 008 foundation with timer and tool_result event types.
 */

import { z } from 'zod';

export const SessionKeySchema = z
  .string()
  .regex(/^[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+$/, 'Invalid SESSION_KEY format')
  .brand<'SessionKey'>();

export type SessionKey = z.infer<typeof SessionKeySchema>;

// EXTENDED in 009: adds 'timer', 'tool_result' to 008's ['user_message']
export const EventTypeSchema = z.enum(['user_message', 'timer', 'tool_result']);
export type EventType = z.infer<typeof EventTypeSchema>;

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
  seq: z.number().int().nonnegative(),
  type: EventTypeSchema,
  payload: EventPayloadSchema,
  created_at: z.date(),
});

export type Event = z.infer<typeof EventSchema>;

// Event creation schema (without id/timestamps)
export const CreateEventSchema = z.object({
  session_key: SessionKeySchema,
  seq: z.number().int().nonnegative(),
  type: EventTypeSchema,
  payload: EventPayloadSchema,
});

export type CreateEvent = z.infer<typeof CreateEventSchema>;
