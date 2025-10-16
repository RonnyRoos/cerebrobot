/**
 * Effect Schemas - Autonomy Extensions (009)
 * 
 * EXTENDS 008 foundation with schedule_timer effect type.
 * 
 * NOTE: In implementation, this file extends the schemas from 008/contracts/effects.schema.ts
 * by adding new effect types to EffectTypeSchema enum and new payload schemas.
 * 
 * Foundation from 008:
 * - SessionKeySchema (from events.schema)
 * - EffectTypeSchema base: ['send_message']
 * - EffectStatusSchema
 * - SendMessagePayloadSchema
 * - EffectSchema structure
 * 
 * Added in 009:
 * - 'schedule_timer' to EffectTypeSchema
 * - ScheduleTimerPayloadSchema
 */

import { z } from 'zod';
import { SessionKeySchema } from './events.schema';

// EXTENDED in 009: adds 'schedule_timer' to 008's ['send_message']
export const EffectTypeSchema = z.enum(['send_message', 'schedule_timer']);
export type EffectType = z.infer<typeof EffectTypeSchema>;

// Re-exported from 008
export const EffectStatusSchema = z.enum(['pending', 'executing', 'completed', 'failed']);
export type EffectStatus = z.infer<typeof EffectStatusSchema>;

// Re-exported from 008
export const SendMessagePayloadSchema = z.object({
  content: z.string().min(1),
});

// NEW in 009: Schedule timer effect payload
export const ScheduleTimerPayloadSchema = z.object({
  timer_id: z.string(),
  fire_at: z.string().datetime(), // ISO 8601 timestamp
  payload: z.unknown().optional(),
});

// EXTENDED in 009: adds ScheduleTimer to union
export const EffectPayloadSchema = z.union([
  SendMessagePayloadSchema,
  ScheduleTimerPayloadSchema,
]);

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
  attempt_count: z.number().int().min(0).default(0),
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

// Typed effect constructors
export function createSendMessageEffect(
  sessionKey: z.infer<typeof SessionKeySchema>,
  checkpointId: string,
  content: string
): Omit<CreateEffect, 'dedupe_key'> {
  return {
    session_key: sessionKey,
    checkpoint_id: checkpointId,
    type: 'send_message',
    payload: { content },
  };
}

export function createScheduleTimerEffect(
  sessionKey: z.infer<typeof SessionKeySchema>,
  checkpointId: string,
  timerId: string,
  fireAt: Date,
  payload?: unknown
): Omit<CreateEffect, 'dedupe_key'> {
  return {
    session_key: sessionKey,
    checkpoint_id: checkpointId,
    type: 'schedule_timer',
    payload: {
      timer_id: timerId,
      fire_at: fireAt.toISOString(),
      payload,
    },
  };
}

// Dedupe key generation
// Hash of checkpoint_id + type + payload fingerprint ensures idempotency
export function generateDedupeKey(
  checkpointId: string,
  type: EffectType,
  payload: EffectPayload
): string {
  const fingerprint = JSON.stringify({ checkpointId, type, payload });
  // In actual implementation, use a proper hash function (e.g., crypto.createHash)
  // For contract, showing the structure
  return `dedupe_${Buffer.from(fingerprint).toString('base64').slice(0, 32)}`;
}

// Effect update schemas
export const UpdateEffectStatusSchema = z.object({
  id: z.string().uuid(),
  status: EffectStatusSchema,
  attempt_count: z.number().int().min(0).optional(),
  last_attempt_at: z.date().optional(),
});

export type UpdateEffectStatus = z.infer<typeof UpdateEffectStatusSchema>;
