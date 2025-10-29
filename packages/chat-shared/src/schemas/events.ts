/**
 * WebSocket Event Schemas
 *
 * Defines events broadcast over WebSocket connections for real-time updates.
 */

import { z } from 'zod';
import { MemoryEntrySchema } from './memory.js';

// ============================================================================
// Base Event Schema
// ============================================================================

/**
 * Base WebSocket event with common fields
 */
export const BaseWebSocketEventSchema = z.object({
  /** Event type discriminator */
  type: z.string(),

  /** ISO timestamp when event was created */
  timestamp: z.string().datetime(),
});

// ============================================================================
// Memory Events
// ============================================================================

/**
 * Memory Created Event Schema
 *
 * Emitted when the agent stores a new memory during conversation.
 * Allows UI to display memories in real-time as they're created.
 */
export const MemoryCreatedEventSchema = BaseWebSocketEventSchema.extend({
  type: z.literal('memory.created'),

  /** The newly created memory entry */
  memory: MemoryEntrySchema,

  /** Thread ID where memory was created */
  threadId: z.string().uuid(),
}).strict();

export type MemoryCreatedEvent = z.infer<typeof MemoryCreatedEventSchema>;

// ============================================================================
// Event Union (Future: memory.updated, memory.deleted, etc.)
// ============================================================================

/**
 * All WebSocket event types
 *
 * Currently only memory.created is defined.
 * Future events will be added here as union members.
 */
export const WebSocketEventSchema = z.union([
  MemoryCreatedEventSchema,
  // Future: MemoryUpdatedEventSchema,
  // Future: MemoryDeletedEventSchema,
]);

export type WebSocketEvent = z.infer<typeof WebSocketEventSchema>;
