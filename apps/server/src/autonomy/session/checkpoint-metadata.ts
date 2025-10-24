/**
 * Checkpoint Metadata Extensions for Autonomy
 *
 * Utilities for reading/writing autonomy counters in LangGraph checkpoint metadata.
 *
 * Metadata structure:
 * {
 *   ...existing fields,
 *   autonomy: {
 *     event_seq: number,
 *     consecutive_autonomous_msgs: number,
 *     last_autonomous_at: string | null (ISO8601)
 *   }
 * }
 */

import type { CheckpointMetadata } from '@langchain/langgraph-checkpoint';

export interface AutonomyCheckpointMetadata {
  event_seq: number;
  consecutive_autonomous_msgs: number;
  last_autonomous_at: string | null;
}

/**
 * Get autonomy metadata from checkpoint metadata
 * Returns defaults if not present
 */
export function getAutonomyMetadata(metadata: CheckpointMetadata): AutonomyCheckpointMetadata {
  const autonomy = (metadata as Record<string, unknown>).autonomy as
    | AutonomyCheckpointMetadata
    | undefined;

  return (
    autonomy ?? {
      event_seq: -1,
      consecutive_autonomous_msgs: 0,
      last_autonomous_at: null,
    }
  );
}

/**
 * Set autonomy metadata in checkpoint metadata
 * Returns new metadata object (immutable)
 */
export function setAutonomyMetadata(
  metadata: CheckpointMetadata,
  autonomy: Partial<AutonomyCheckpointMetadata>,
): CheckpointMetadata {
  const current = getAutonomyMetadata(metadata);

  return {
    ...metadata,
    autonomy: {
      ...current,
      ...autonomy,
    },
  } as CheckpointMetadata;
}

/**
 * Update event sequence number
 */
export function updateEventSeq(metadata: CheckpointMetadata, seq: number): CheckpointMetadata {
  return setAutonomyMetadata(metadata, { event_seq: seq });
}

/**
 * Update autonomy counters after autonomous send
 */
export function updateAfterAutonomousSend(metadata: CheckpointMetadata): CheckpointMetadata {
  const current = getAutonomyMetadata(metadata);

  return setAutonomyMetadata(metadata, {
    consecutive_autonomous_msgs: current.consecutive_autonomous_msgs + 1,
    last_autonomous_at: new Date().toISOString(),
  });
}

/**
 * Reset autonomy counters on user message
 */
export function resetAutonomyCounters(metadata: CheckpointMetadata): CheckpointMetadata {
  return setAutonomyMetadata(metadata, {
    consecutive_autonomous_msgs: 0,
    last_autonomous_at: null,
  });
}
