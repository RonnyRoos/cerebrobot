/**
 * Logger utility for metadata lifecycle tracking
 *
 * Provides structured logging for autonomous message metadata operations
 * at DEBUG, INFO, and ERROR levels.
 *
 * @module logger
 * @see specs/016-metadata-autonomous-messages/data-model.md Section 9 (Logging Strategy)
 */

import type { Logger } from 'pino';
import type { MessageMetadata } from '@cerebrobot/chat-shared';

/**
 * Log levels for metadata operations
 */
export const MetadataLogLevels = {
  /** Detailed metadata creation, detection, filtering logs */
  DEBUG: 'debug',
  /** Summary statistics (e.g., "filtered 3 synthetic messages") */
  INFO: 'info',
  /** Critical failures (e.g., empty thread misconfiguration) */
  ERROR: 'error',
} as const;

/**
 * Structured log context for metadata operations
 */
export interface MetadataLogContext {
  /** Operation being performed */
  operation: 'create' | 'detect' | 'filter' | 'query';
  /** Thread ID where operation occurred */
  threadId: string;
  /** Metadata being logged */
  metadata?: MessageMetadata;
  /** Number of messages affected */
  messageCount?: number;
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Log metadata creation (DEBUG level)
 *
 * @example
 * ```typescript
 * logMetadataCreation(logger, {
 *   operation: 'create',
 *   threadId: 'thread-123',
 *   metadata: { synthetic: true, trigger_type: 'check_in' }
 * });
 * ```
 */
export function logMetadataCreation(logger: Logger, context: MetadataLogContext): void {
  logger.debug(
    {
      metadata_operation: context.operation,
      thread_id: context.threadId,
      synthetic: context.metadata?.synthetic,
      trigger_type: context.metadata?.trigger_type,
      trigger_reason: context.metadata?.trigger_reason,
      ...context.context,
    },
    'Created synthetic message with metadata',
  );
}

/**
 * Log metadata detection in memory retrieval (DEBUG level)
 *
 * @example
 * ```typescript
 * logMetadataDetection(logger, {
 *   operation: 'detect',
 *   threadId: 'thread-123',
 *   metadata: { synthetic: true, trigger_type: 'check_in' },
 *   context: { querySource: 'previous_user_message' }
 * });
 * ```
 */
export function logMetadataDetection(logger: Logger, context: MetadataLogContext): void {
  logger.debug(
    {
      metadata_operation: context.operation,
      thread_id: context.threadId,
      synthetic_detected: context.metadata?.synthetic,
      trigger_type: context.metadata?.trigger_type,
      ...context.context,
    },
    'Metadata detected, using alternative query source',
  );
}

/**
 * Log thread history filtering statistics (INFO level)
 *
 * @example
 * ```typescript
 * logMetadataFilterStats(logger, {
 *   operation: 'filter',
 *   threadId: 'thread-123',
 *   messageCount: 3,
 *   context: { totalMessages: 10, filteredCount: 3 }
 * });
 * ```
 */
export function logMetadataFilterStats(logger: Logger, context: MetadataLogContext): void {
  logger.info(
    {
      metadata_operation: context.operation,
      thread_id: context.threadId,
      total_messages: context.context?.totalMessages,
      filtered_count: context.messageCount,
      ...context.context,
    },
    `Filtered ${context.messageCount} synthetic messages from thread history`,
  );
}

/**
 * Log individual message filtering (DEBUG level)
 *
 * @example
 * ```typescript
 * logMessageFiltered(logger, {
 *   operation: 'filter',
 *   threadId: 'thread-123',
 *   metadata: { synthetic: true, trigger_type: 'check_in' }
 * });
 * ```
 */
export function logMessageFiltered(logger: Logger, context: MetadataLogContext): void {
  logger.debug(
    {
      metadata_operation: context.operation,
      thread_id: context.threadId,
      trigger_type: context.metadata?.trigger_type,
      ...context.context,
    },
    'Filtered synthetic message from thread history',
  );
}

/**
 * Log empty thread error (ERROR level)
 *
 * Called when autonomous message fires on empty thread (misconfiguration).
 *
 * @example
 * ```typescript
 * logEmptyThreadError(logger, {
 *   operation: 'query',
 *   threadId: 'thread-123',
 *   metadata: { synthetic: true, trigger_type: 'check_in' }
 * });
 * ```
 */
export function logEmptyThreadError(logger: Logger, context: MetadataLogContext): void {
  logger.error(
    {
      metadata_operation: context.operation,
      thread_id: context.threadId,
      trigger_type: context.metadata?.trigger_type,
      ...context.context,
    },
    'Autonomous message triggered on empty thread - timer misconfiguration',
  );
}

/**
 * Log trigger type and prompt selection (DEBUG level)
 *
 * @example
 * ```typescript
 * logTriggerPromptSelection(logger, {
 *   operation: 'create',
 *   threadId: 'thread-123',
 *   context: {
 *     trigger_type: 'check_in',
 *     selected_prompt: 'Continue our conversation naturally.'
 *   }
 * });
 * ```
 */
export function logTriggerPromptSelection(logger: Logger, context: MetadataLogContext): void {
  logger.debug(
    {
      metadata_operation: context.operation,
      thread_id: context.threadId,
      trigger_type: context.context?.trigger_type,
      selected_prompt: context.context?.selected_prompt,
      ...context.context,
    },
    'Selected natural prompt for trigger type',
  );
}
