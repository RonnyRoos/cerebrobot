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
}

/**
 * EventQueue manages in-process event queues with strict session isolation
 * - Each SESSION_KEY has its own FIFO queue
 * - Events processed sequentially per session
 * - Concurrent processing across different sessions
 */
export class EventQueue {
  private queues: Map<SessionKey, QueuedEvent[]> = new Map();
  private processing: Set<SessionKey> = new Set();
  private processor: ((event: Event) => Promise<void>) | null = null;
  private interval: NodeJS.Timeout | null = null;
  private intervalMs: number;

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
      queue.push({ event, resolve, reject });
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
            await this.processor(queued.event);
            queued.resolve();
          }
        } catch (error) {
          // On error, reject the promise but continue processing other events
          const queued = queue[0]; // Error occurred during processing
          if (queued) {
            queued.reject(error as Error);
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
