/**
 * Events & Effects Module Exports
 * Main entry point for spec 008 Events & Effects architecture
 */

// Event types and schemas
export type { SessionKey, EventType, UserMessagePayload, Event } from './types/events.schema.js';
export {
  SessionKeySchema,
  parseSessionKey,
  createUserMessageEvent,
} from './types/events.schema.js';

// Effect types and schemas
export type {
  EffectType,
  EffectStatus,
  SendMessagePayload,
  ScheduleTimerPayload,
  EffectPayload,
  Effect,
} from './types/effects.schema.js';
export { createSendMessageEffect, generateDedupeKey } from './types/effects.schema.js';

// Event types (re-exports)
export type { CreateEvent } from './events/types.js';

// Effect types (re-exports)
export type { CreateEffect } from './effects/types.js';

// Session types
export type { SessionProcessorConfig } from './session/types.js';

// Core stores
export { EventStore } from './events/EventStore.js';
export { OutboxStore } from './effects/OutboxStore.js';

// Processing components
export { EventQueue } from './events/EventQueue.js';
export { SessionProcessor } from './session/SessionProcessor.js';
export {
  EffectRunner,
  type EffectDeliveryHandler,
  type EffectRunnerConfig,
} from './effects/EffectRunner.js';
