/**
 * Effect Types for 008-migrate-to-events-effects
 * Derived from Zod schemas in effects.schema.ts
 */

import type {
  EffectType,
  EffectStatus,
  SendMessagePayload,
  ScheduleTimerPayload,
  EffectPayload,
  Effect,
} from '../types/effects.schema.js';
import type { SessionKey } from '../types/events.schema.js';

// Re-export schema types
export type {
  EffectType,
  EffectStatus,
  SendMessagePayload,
  ScheduleTimerPayload,
  EffectPayload,
  Effect,
};

// Effect creation input (without generated fields)
export interface CreateEffect {
  sessionKey: SessionKey;
  checkpointId: string;
  type: EffectType;
  payload: EffectPayload; // Changed from SendMessagePayload to EffectPayload union
  dedupeKey: string;
}
