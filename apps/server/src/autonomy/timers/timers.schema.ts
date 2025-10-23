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
  fire_at_ms: z.coerce.bigint(),
  payload: z.unknown().nullable().optional(),
  status: TimerStatusSchema,
  cancelled_at: z.date().nullable().optional(),
  created_at: z.date(),
  updated_at: z.date(),
});

export type Timer = z.infer<typeof TimerSchema>;

// Timer creation/upsert schema (without id/timestamps/status)
export const UpsertTimerSchema = z.object({
  session_key: SessionKeySchema,
  timer_id: z.string(),
  fire_at_ms: z.coerce.bigint(),
  payload: z.unknown().nullable().optional(),
});

export type UpsertTimer = Omit<z.infer<typeof UpsertTimerSchema>, 'fire_at_ms'> & {
  fire_at_ms: number | bigint; // Accept both for convenience, Zod coerces to bigint
};
