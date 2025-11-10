/**
 * TimerWorker - Background worker for timer polling and promotion
 *
 * Polls for due timers and promotes them to timer events for processing.
 * Runs on configurable interval (default: 1000ms).
 */

import type { Logger } from 'pino';
import { TimerStore } from './TimerStore.js';
import { EventStore } from '../../events/events/EventStore.js';
import type { EventQueue } from '../../events/events/EventQueue.js';
import { SessionKeySchema, type SessionKey } from '../../events/types/events.schema.js';
import { ZodError } from 'zod';

export interface TimerWorkerConfig {
  pollIntervalMs: number;
  batchSize?: number;
}

export class TimerWorker {
  private intervalId?: NodeJS.Timeout;
  private isRunning = false;

  constructor(
    private readonly timerStore: TimerStore,
    private readonly eventStore: EventStore,
    private readonly eventQueue: EventQueue,
    private readonly config: TimerWorkerConfig,
    private readonly logger: Logger,
  ) {}

  /**
   * Start the worker polling loop
   */
  start(): void {
    if (this.isRunning) {
      this.logger.warn('TimerWorker already running');
      return;
    }

    this.isRunning = true;
    this.logger.info({ pollIntervalMs: this.config.pollIntervalMs }, 'TimerWorker starting');

    // Run immediately, then on interval
    void this.pollAndPromote();
    this.intervalId = setInterval(() => {
      void this.pollAndPromote();
    }, this.config.pollIntervalMs);
  }

  /**
   * Stop the worker polling loop
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    this.logger.info('TimerWorker stopped');
  }

  /**
   * Poll for due timers and promote to events
   * Public for testing
   */
  async pollAndPromote(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      const nowMs = Date.now();
      const dueTimers = await this.timerStore.findDueTimers(nowMs, this.config.batchSize);

      if (dueTimers.length === 0) {
        return;
      }

      this.logger.debug({ count: dueTimers.length }, 'Processing due timers');

      // Process each due timer
      for (const timer of dueTimers) {
        try {
          // Validate session_key format before processing
          // This prevents invalid test data or corrupted entries from causing log spam
          let sessionKey: SessionKey;
          try {
            sessionKey = SessionKeySchema.parse(timer.session_key);
          } catch (validationError) {
            if (validationError instanceof ZodError) {
              this.logger.warn(
                {
                  timerId: timer.timer_id,
                  sessionKey: timer.session_key,
                  validationError: validationError.errors,
                },
                'Invalid session_key format - marking timer as cancelled',
              );
              // Mark invalid timer as cancelled to prevent infinite retries
              await this.timerStore.markCancelled(timer.id);
              continue; // Skip to next timer
            }
            throw validationError; // Re-throw unexpected errors
          }

          // Get next sequence for this session
          const nextSeq = await this.eventStore.getNextSeq(sessionKey);

          // Create timer event
          const createdEvent = await this.eventStore.create({
            sessionKey,
            seq: nextSeq,
            type: 'timer',
            payload: {
              timer_id: timer.timer_id,
              payload: timer.payload ?? undefined,
            },
          });

          // Enqueue event for processing (triggers agent response)
          void this.eventQueue.enqueue(createdEvent);

          // Mark timer as promoted
          await this.timerStore.markPromoted(timer.id);

          this.logger.info(
            {
              timerId: timer.timer_id,
              sessionKey: timer.session_key,
              fireAtMs: timer.fire_at_ms.toString(),
              fireAt: new Date(Number(timer.fire_at_ms)).toISOString(), // Convert to ISO string for logging
              seq: nextSeq,
            },
            'Timer promoted to event',
          );
        } catch (error) {
          this.logger.error(
            {
              timerId: timer.timer_id,
              sessionKey: timer.session_key,
              error: error instanceof Error ? error.message : String(error),
            },
            'Failed to promote timer',
          );
          // Continue processing other timers
        }
      }
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
        },
        'Error during timer polling',
      );
    }
  }
}
