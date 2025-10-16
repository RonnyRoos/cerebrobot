/**
 * Timer Schemas for Server-Side Autonomy
 * 
 * Defines Zod schemas for timer data structures. Timers represent
 * scheduled future actions that will be promoted to timer events.
 */

import { z } from 'zod';
import { SessionKeySchema } from './events.schema';

// Timer status
export const TimerStatusSchema = z.enum(['pending', 'promoted', 'cancelled']);
export type TimerStatus = z.infer<typeof TimerStatusSchema>;

// Complete timer schema
export const TimerSchema = z.object({
  id: z.string().uuid(),
  session_key: SessionKeySchema,
  timer_id: z.string(),
  fire_at: z.date(),
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
  fire_at: z.date(),
  payload: z.unknown().nullable().optional(),
});

export type UpsertTimer = z.infer<typeof UpsertTimerSchema>;

// Timer query schemas
export const FindDueTimersSchema = z.object({
  before: z.date(),
  limit: z.number().int().positive().optional(),
});

export type FindDueTimersQuery = z.infer<typeof FindDueTimersSchema>;

export const CancelTimersSchema = z.object({
  session_key: SessionKeySchema,
});

export type CancelTimersQuery = z.infer<typeof CancelTimersSchema>;

// Timer update schemas
export const UpdateTimerStatusSchema = z.object({
  id: z.string().uuid(),
  status: TimerStatusSchema,
});

export type UpdateTimerStatus = z.infer<typeof UpdateTimerStatusSchema>;

// Helper to check if timer is due
export function isTimerDue(timer: Timer, now: Date = new Date()): boolean {
  return timer.status === 'pending' && timer.fire_at <= now;
}

// Helper to check if timer is overdue (past scheduled time, accounting for polling interval)
export function isTimerOverdue(
  timer: Timer,
  pollingIntervalMs: number = 500,
  now: Date = new Date()
): boolean {
  if (timer.status !== 'pending') return false;
  const overdueThreshold = new Date(now.getTime() - pollingIntervalMs);
  return timer.fire_at < overdueThreshold;
}
