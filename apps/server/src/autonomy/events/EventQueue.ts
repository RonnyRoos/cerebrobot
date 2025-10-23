/**
 * EventQueue - In-process per-SESSION_KEY event queue with strict ordering
 *
 * Ensures events for the same SESSION_KEY are processed sequentially to prevent
 * race conditions. Uses async locks to prevent concurrent processing.
 */

import type { SessionKey } from '../types/events.schema';
import type { Event } from '../types/events.schema';

interface QueueEntry {
  event: Event;
  resolve: () => void;
  reject: (error: Error) => void;
}

export class EventQueue {
  private queues = new Map<SessionKey, QueueEntry[]>();
  private processing = new Set<SessionKey>();

  /**
   * Enqueue an event for processing
   * Returns promise that resolves when event is processed
   */
  async enqueue(event: Event): Promise<void> {
    return new Promise((resolve, reject) => {
      const sessionKey = event.session_key;

      if (!this.queues.has(sessionKey)) {
        this.queues.set(sessionKey, []);
      }

      this.queues.get(sessionKey)!.push({ event, resolve, reject });

      // Start processing if not already running for this session
      if (!this.processing.has(sessionKey)) {
        void this.processQueue(sessionKey);
      }
    });
  }

  /**
   * Process queue for a specific session key
   * Runs until queue is empty, then cleans up
   */
  private async processQueue(sessionKey: SessionKey): Promise<void> {
    this.processing.add(sessionKey);

    try {
      const queue = this.queues.get(sessionKey);
      if (!queue) return;

      while (queue.length > 0) {
        const entry = queue.shift();
        if (!entry) break;

        try {
          // Event processing happens here via callback
          // For now, just resolve immediately
          // Actual processor will be wired in SessionProcessor
          entry.resolve();
        } catch (error) {
          entry.reject(error instanceof Error ? error : new Error(String(error)));
        }
      }

      // Cleanup empty queue
      if (queue.length === 0) {
        this.queues.delete(sessionKey);
      }
    } finally {
      this.processing.delete(sessionKey);
    }
  }

  /**
   * Get queue depth for a session (for monitoring)
   */
  getQueueDepth(sessionKey: SessionKey): number {
    return this.queues.get(sessionKey)?.length ?? 0;
  }

  /**
   * Get total queued events across all sessions
   */
  getTotalQueued(): number {
    let total = 0;
    for (const queue of this.queues.values()) {
      total += queue.length;
    }
    return total;
  }

  /**
   * Check if a session is currently processing
   */
  isProcessing(sessionKey: SessionKey): boolean {
    return this.processing.has(sessionKey);
  }
}
