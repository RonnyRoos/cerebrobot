/**
 * Timer Schemas for Server-Side Autonomy
 *
 * Defines Zod schemas for timer data structures. Timers represent
 * scheduled future actions that will be promoted to timer events.
 */

import { z } from 'zod';
import { SessionKeySchema } from '../../events/types/events.schema.js';

// Timer status
export const TimerStatusSchema = z.enum(['pending', 'promoted', 'cancelled']);
export type TimerStatus = z.infer<typeof TimerStatusSchema>;

// Complete timer schema
export const TimerSchema = z.object({
  id: z.string().uuid(),
  session_key: SessionKeySchema,
  timer_id: z.string(),
  fire_at_ms: z.number().int().positive(), // Epoch milliseconds
  payload: z.unknown().nullable().optional(),
  status: TimerStatusSchema,
  created_at: z.date(),
  updated_at: z.date(),
});

export type Timer = z.infer<typeof TimerSchema>;

// Timer creation/upsert schema (without id/timestamps/status)
export const UpsertTimerSchema = z.object({
  session_key: SessionKeySchema,
  timer_id: z.string(),
  fire_at_ms: z.number().int().positive(), // Epoch milliseconds
  payload: z.unknown().nullable().optional(),
});

export type UpsertTimer = z.infer<typeof UpsertTimerSchema>;

// Timer query schemas
export const FindDueTimersSchema = z.object({
  before_ms: z.number().int().positive(), // Epoch milliseconds
  limit: z.number().int().positive().optional(),
});

export type FindDueTimersQuery = z.infer<typeof FindDueTimersSchema>;

export const CancelTimersSchema = z.object({
  session_key: SessionKeySchema,
});

export type CancelTimersQuery = z.infer<typeof CancelTimersSchema>;
