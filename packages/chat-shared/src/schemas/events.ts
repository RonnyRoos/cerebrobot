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

/**
 * Memory Updated Event Schema (T045)
 *
 * Emitted when a memory is edited by the operator.
 * Allows UI to update displayed memories in real-time.
 */
export const MemoryUpdatedEventSchema = BaseWebSocketEventSchema.extend({
  type: z.literal('memory.updated'),

  /** The updated memory entry */
  memory: MemoryEntrySchema,

  /** Thread ID where memory was updated */
  threadId: z.string().uuid(),
}).strict();

export type MemoryUpdatedEvent = z.infer<typeof MemoryUpdatedEventSchema>;

/**
 * Memory Deleted Event Schema (T045)
 *
 * Emitted when a memory is deleted by the operator.
 * Allows UI to remove memories from display in real-time.
 */
export const MemoryDeletedEventSchema = BaseWebSocketEventSchema.extend({
  type: z.literal('memory.deleted'),

  /** ID of the deleted memory */
  memoryId: z.string().uuid(),

  /** Thread ID where memory was deleted */
  threadId: z.string().uuid(),
}).strict();

export type MemoryDeletedEvent = z.infer<typeof MemoryDeletedEventSchema>;

// ============================================================================
// Event Union
// ============================================================================

/**
 * All WebSocket event types
 *
 * Includes memory lifecycle events: created, updated, deleted
 */
export const WebSocketEventSchema = z.union([
  MemoryCreatedEventSchema,
  MemoryUpdatedEventSchema,
  MemoryDeletedEventSchema,
]);

export type WebSocketEvent = z.infer<typeof WebSocketEventSchema>;
