/**
 * Effect Schemas - Autonomy Extensions (009)
 *
 * EXTENDS 008 foundation with schedule_timer effect type.
 */

import { z } from 'zod';
import { SessionKeySchema } from './events.schema';

// EXTENDED in 009: adds 'schedule_timer' to 008's ['send_message']
export const EffectTypeSchema = z.enum(['send_message', 'schedule_timer']);
export type EffectType = z.infer<typeof EffectTypeSchema>;

export const EffectStatusSchema = z.enum(['pending', 'executing', 'completed', 'failed']);
export type EffectStatus = z.infer<typeof EffectStatusSchema>;

export const SendMessagePayloadSchema = z.object({
  content: z.string().min(1),
});

// NEW in 009: Schedule timer effect payload
export const ScheduleTimerPayloadSchema = z.object({
  timer_id: z.string(),
  fire_at: z.string().datetime(), // ISO 8601 timestamp
  payload: z.unknown().optional(),
});

export const EffectPayloadSchema = z.union([SendMessagePayloadSchema, ScheduleTimerPayloadSchema]);

export type EffectPayload = z.infer<typeof EffectPayloadSchema>;

// Complete effect schema
export const EffectSchema = z.object({
  id: z.string().uuid(),
  session_key: SessionKeySchema,
  checkpoint_id: z.string(),
  type: EffectTypeSchema,
  payload: EffectPayloadSchema,
  dedupe_key: z.string(),
  status: EffectStatusSchema,
  created_at: z.date(),
  updated_at: z.date(),
  attempt_count: z.number().int().nonnegative(),
  last_attempt_at: z.date().nullable().optional(),
});

export type Effect = z.infer<typeof EffectSchema>;

// Effect creation schema (without id/timestamps/status)
export const CreateEffectSchema = z.object({
  session_key: SessionKeySchema,
  checkpoint_id: z.string(),
  type: EffectTypeSchema,
  payload: EffectPayloadSchema,
  dedupe_key: z.string(),
});

export type CreateEffect = z.infer<typeof CreateEffectSchema>;
