/**
 * Event Types for 008-migrate-to-events-effects
 * Derived from Zod schemas in events.schema.ts
 */

import type { SessionKey, EventType, UserMessagePayload, Event } from '../types/events.schema.js';

// Re-export schema types
export type { SessionKey, EventType, UserMessagePayload, Event };

// Event creation input (without generated fields)
export interface CreateEvent {
  sessionKey: SessionKey;
  seq: number;
  type: EventType;
  payload: UserMessagePayload;
}
