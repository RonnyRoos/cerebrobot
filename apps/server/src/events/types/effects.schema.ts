/**
 * Effect Schemas for 008-migrate-to-events-effects
 *
 * Defines send_message effect type only.
 * Spec 009 will extend with schedule_timer type.
 */

import { z } from 'zod';
import { SessionKeySchema } from './events.schema.js';
import { createHash } from 'crypto';

// Effect type (008: send_message only)
export const EffectTypeSchema = z.enum(['send_message']);
export type EffectType = z.infer<typeof EffectTypeSchema>;

// Effect status
export const EffectStatusSchema = z.enum(['pending', 'executing', 'completed', 'failed']);
export type EffectStatus = z.infer<typeof EffectStatusSchema>;

// Send message payload
export const SendMessagePayloadSchema = z.object({
  content: z.string().min(1),
  requestId: z.string().uuid(),
  isFinal: z.boolean().optional(), // Marks the last effect in a stream
});

export type SendMessagePayload = z.infer<typeof SendMessagePayloadSchema>;

// Complete effect schema
export const EffectSchema = z.object({
  id: z.string().uuid(),
  session_key: SessionKeySchema,
  checkpoint_id: z.string(),
  type: EffectTypeSchema,
  payload: SendMessagePayloadSchema,
  dedupe_key: z.string(),
  status: EffectStatusSchema,
  created_at: z.date(),
  updated_at: z.date(),
});

export type Effect = z.infer<typeof EffectSchema>;

// Effect creation helper
export function createSendMessageEffect(
  sessionKey: z.infer<typeof SessionKeySchema>,
  checkpointId: string,
  content: string,
  requestId: string,
  sequence?: number,
  isFinal?: boolean,
) {
  const effect = {
    session_key: sessionKey,
    checkpoint_id: checkpointId,
    type: 'send_message' as const,
    payload: { content, requestId, isFinal },
    sequence,
  };

  const dedupeKey = generateDedupeKey(effect);

  return { ...effect, dedupe_key: dedupeKey };
}

// Dedupe key generation
export function generateDedupeKey(effect: {
  checkpoint_id: string;
  type: string;
  payload: unknown;
  sequence?: number;
}): string {
  const fingerprint = JSON.stringify({
    checkpoint_id: effect.checkpoint_id,
    type: effect.type,
    payload: effect.payload,
    sequence: effect.sequence ?? 0, // Include sequence in fingerprint
  });
  return createHash('sha256').update(fingerprint).digest('hex');
}
