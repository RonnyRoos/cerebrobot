/**
 * EventQueue - In-process event queue with per-session ordering
 * Implements Map<SESSION_KEY, Queue<Event>> for session-isolated event processing
 */

import type { SessionKey } from '../types/events.schema.js';
import type { Event } from './types.js';

interface QueuedEvent {
  event: Event;
  resolve: (result: void) => void;
  reject: (error: Error) => void;
  attemptCount?: number; // Track retry attempts
  lastError?: Error; // Track last error for logging
}

/**
 * EventQueue manages in-process event queues with strict session isolation
 * - Each SESSION_KEY has its own FIFO queue
 * - Events processed sequentially per session
 * - Concurrent processing across different sessions
 * - Failed events retried up to MAX_RETRY_ATTEMPTS with exponential backoff
 */
export class EventQueue {
  private queues: Map<SessionKey, QueuedEvent[]> = new Map();
  private processing: Set<SessionKey> = new Set();
  private processor: ((event: Event) => Promise<void>) | null = null;
  private interval: NodeJS.Timeout | null = null;
  private intervalMs: number;
  private static readonly MAX_RETRY_ATTEMPTS = 3; // Max retries before giving up
  private static readonly RETRY_DELAY_MS = 1000; // Base delay for exponential backoff

  constructor(intervalMs = 50) {
    this.intervalMs = intervalMs;
  }

  /**
   * Enqueue an event for processing
   * Returns a promise that resolves when the event is processed
   */
  async enqueue(event: Event): Promise<void> {
    return new Promise((resolve, reject) => {
      const queue = this.queues.get(event.session_key) ?? [];
      queue.push({ event, resolve, reject, attemptCount: 0 });
      this.queues.set(event.session_key, queue);
    });
  }

  /**
   * Start processing events at configured interval
   * @param processor Function to process each event
   */
  start(processor: (event: Event) => Promise<void>): void {
    if (this.interval) {
      throw new Error('EventQueue already started');
    }

    this.processor = processor;
    this.interval = setInterval(() => {
      void this.processQueues();
    }, this.intervalMs);
  }

  /**
   * Stop processing events and clear interval
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.processor = null;
  }

  /**
   * Process all queues, respecting session isolation
   * Each session processes one event at a time
   * Multiple sessions can process concurrently
   */
  private async processQueues(): Promise<void> {
    const sessions = Array.from(this.queues.keys());

    // Process one event per session concurrently
    await Promise.all(
      sessions.map(async (sessionKey) => {
        // Skip if this session is already processing
        if (this.processing.has(sessionKey)) {
          return;
        }

        const queue = this.queues.get(sessionKey);
        if (!queue || queue.length === 0) {
          return;
        }

        // Mark session as processing
        this.processing.add(sessionKey);

        try {
          // Get next event (FIFO)
          const queued = queue.shift();
          if (!queued) {
            return;
          }

          // Clean up empty queue
          if (queue.length === 0) {
            this.queues.delete(sessionKey);
          }

          // Process event
          if (this.processor) {
            try {
              await this.processor(queued.event);
              queued.resolve();
            } catch (error) {
              const attemptCount = (queued.attemptCount ?? 0) + 1;
              const err = error as Error;

              // Don't retry timer events - autonomous messages are best-effort
              // Retrying timer events causes duplicate messages when LLM timeouts occur
              const shouldRetry =
                queued.event.type !== 'timer' && attemptCount < EventQueue.MAX_RETRY_ATTEMPTS;

              if (shouldRetry) {
                // Retry with exponential backoff
                const delayMs = EventQueue.RETRY_DELAY_MS * Math.pow(2, attemptCount - 1);

                // Re-enqueue with updated attempt count after delay
                setTimeout(() => {
                  const retryQueue = this.queues.get(sessionKey) ?? [];
                  retryQueue.push({
                    event: queued.event,
                    resolve: queued.resolve,
                    reject: queued.reject,
                    attemptCount,
                    lastError: err,
                  });
                  this.queues.set(sessionKey, retryQueue);
                }, delayMs);
              } else {
                // Timer events or max retries exceeded, reject permanently
                const reason =
                  queued.event.type === 'timer'
                    ? 'Timer events are not retried (best-effort delivery)'
                    : `Event processing failed after ${EventQueue.MAX_RETRY_ATTEMPTS} attempts`;
                queued.reject(new Error(`${reason}: ${err.message}`));
              }
            }
          }
        } finally {
          // Mark session as no longer processing
          this.processing.delete(sessionKey);
        }
      }),
    );
  }

  /**
   * Get queue depth for a session (for monitoring/debugging)
   */
  getQueueDepth(sessionKey: SessionKey): number {
    return this.queues.get(sessionKey)?.length ?? 0;
  }

  /**
   * Get total number of queued events across all sessions
   */
  getTotalQueueDepth(): number {
    return Array.from(this.queues.values()).reduce((total, queue) => total + queue.length, 0);
  }

  /**
   * Check if queue is processing events
   */
  isStarted(): boolean {
    return this.interval !== null;
  }
}
