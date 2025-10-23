/**
 * EffectRunner - Background worker for durable effect delivery
 * Core responsibility: Poll outbox for pending effects, execute via WebSocket, update status
 */

import type { OutboxStore } from './OutboxStore.js';
import type { Effect } from './types.js';
import type { Logger } from 'pino';
import type { SessionKey } from '../types/events.schema.js';
import type { TimerStore } from '../../autonomy/timers/TimerStore.js';
import type { PolicyGates, AutonomyMetadata } from '../../autonomy/session/PolicyGates.js';

/**
 * Callback for delivering effects to WebSocket connections
 * Returns true if delivery succeeded, false if WebSocket not connected
 */
export type EffectDeliveryHandler = (effect: Effect) => Promise<boolean>;

/**
 * Callback for loading autonomy metadata from checkpoint
 * Used for PolicyGates enforcement (optional - only needed if autonomy enabled)
 */
export type LoadAutonomyMetadata = (sessionKey: SessionKey) => Promise<AutonomyMetadata | null>;

export interface EffectRunnerConfig {
  /**
   * Polling interval in milliseconds
   * Default: 500ms (from EFFECT_POLL_INTERVAL_MS env var)
   */
  pollIntervalMs?: number;

  /**
   * Maximum number of effects to fetch per poll
   * Default: 100
   */
  batchSize?: number;

  /**
   * Whether to enable debug logging
   * Default: false
   */
  debug?: boolean;

  /**
   * Time-to-live for pending effects in milliseconds
   * Effects older than this will be marked as failed
   * Default: 24 hours (86400000ms)
   */
  effectTtlMs?: number;
}

export class EffectRunner {
  private readonly outboxStore: OutboxStore;
  private readonly timerStore?: TimerStore;
  private readonly policyGates?: PolicyGates;
  private readonly loadMetadata?: LoadAutonomyMetadata;
  private readonly config: Required<EffectRunnerConfig>;
  private readonly logger?: Logger;
  private deliveryHandler: EffectDeliveryHandler | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Track last failed delivery timestamp per session to avoid log spam
   * Session cooldown: skip retry for 10 seconds after WebSocket delivery fails
   */
  private readonly sessionCooldowns = new Map<SessionKey, number>();
  private readonly cooldownMs = 10_000; // 10 seconds

  constructor(
    outboxStore: OutboxStore,
    config: EffectRunnerConfig = {},
    logger?: Logger,
    timerStore?: TimerStore,
    policyGates?: PolicyGates,
    loadMetadata?: LoadAutonomyMetadata,
  ) {
    this.outboxStore = outboxStore;
    this.timerStore = timerStore;
    this.policyGates = policyGates;
    this.loadMetadata = loadMetadata;
    this.config = {
      pollIntervalMs: config.pollIntervalMs ?? 500,
      batchSize: config.batchSize ?? 100,
      debug: config.debug ?? false,
      effectTtlMs: config.effectTtlMs ?? 24 * 60 * 60 * 1000, // 24 hours
    };
    this.logger = logger;
  }

  /**
   * Start background polling for pending effects
   * @param handler - Callback to deliver effects to WebSocket connections
   */
  start(handler: EffectDeliveryHandler): void {
    if (this.isRunning) {
      this.logger?.warn('EffectRunner already started, ignoring duplicate start call');
      return;
    }

    this.deliveryHandler = handler;
    this.isRunning = true;

    // Start polling interval
    this.pollInterval = setInterval(() => {
      void this.processEffects();
    }, this.config.pollIntervalMs);

    this.logger?.info(
      { pollIntervalMs: this.config.pollIntervalMs },
      'EffectRunner started - polling for pending effects',
    );

    // Immediate first poll to avoid initial delay
    void this.processEffects();
  }

  /**
   * Stop background polling
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    this.deliveryHandler = null;
    this.isRunning = false;

    this.logger?.info('EffectRunner stopped');
  }

  /**
   * Process one batch of pending effects
   * Called automatically by polling interval, or manually for testing
   */
  async processEffects(): Promise<void> {
    if (!this.deliveryHandler) {
      this.logger?.warn('processEffects called but no delivery handler set');
      return;
    }

    try {
      // Fetch pending effects (FIFO order)
      const effects = await this.outboxStore.getPending(this.config.batchSize);

      if (effects.length === 0) {
        if (this.config.debug) {
          this.logger?.debug('No pending effects found');
        }
        return;
      }

      // Filter out effects for sessions in cooldown (recently failed delivery)
      const now = Date.now();
      const effectsToProcess = effects.filter((effect) => {
        const lastFail = this.sessionCooldowns.get(effect.session_key);
        if (lastFail && now - lastFail < this.cooldownMs) {
          // Skip this effect - session is in cooldown
          return false;
        }
        return true;
      });

      // Check for expired effects (older than TTL)
      const expiredEffects = effectsToProcess.filter((effect) => {
        const createdAt = new Date(effect.created_at).getTime();
        return now - createdAt > this.config.effectTtlMs;
      });

      // Mark expired effects as failed
      if (expiredEffects.length > 0) {
        this.logger?.info(
          { count: expiredEffects.length, ttlHours: this.config.effectTtlMs / (60 * 60 * 1000) },
          'Marking expired effects as failed (TTL exceeded)',
        );

        await Promise.allSettled(
          expiredEffects.map((effect) =>
            this.outboxStore.updateStatus(effect.id, 'failed').catch((error) => {
              this.logger?.error(
                { effectId: effect.id, error },
                'Failed to mark expired effect as failed',
              );
            }),
          ),
        );
      }

      // Remove expired effects from processing list
      const activeEffects = effectsToProcess.filter((effect) => {
        const createdAt = new Date(effect.created_at).getTime();
        return now - createdAt <= this.config.effectTtlMs;
      });

      if (activeEffects.length === 0) {
        if (this.config.debug) {
          this.logger?.debug('All effects are either in cooldown or expired');
        }
        return;
      }

      if (activeEffects.length < effects.length) {
        this.logger?.debug(
          {
            total: effects.length,
            processing: activeEffects.length,
            cooldown: effectsToProcess.length - activeEffects.length,
            expired: expiredEffects.length,
          },
          'Some effects skipped (cooldown) or failed (TTL)',
        );
      }

      this.logger?.info({ count: activeEffects.length }, 'Processing pending effects');

      // Process effects concurrently (each session isolated)
      const results = await Promise.allSettled(
        activeEffects.map((effect) => this.executeEffect(effect)),
      );

      // Log any failures
      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        this.logger?.error(
          { failureCount: failures.length, totalCount: effectsToProcess.length },
          'Some effects failed to execute',
        );
      }
    } catch (error) {
      this.logger?.error(
        {
          error: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
        },
        'Error in processEffects',
      );
    }
  }

  /**
   * Execute a single effect
   * Updates status: pending → executing → completed/failed
   */
  private async executeEffect(effect: Effect): Promise<void> {
    this.logger?.debug(
      { effectId: effect.id, type: effect.type, status: effect.status },
      'EffectRunner: executeEffect called',
    );

    if (!this.deliveryHandler) {
      throw new Error('No delivery handler set');
    }

    try {
      // Idempotency check: Skip if effect with same dedupe_key already completed
      const alreadyCompleted = await this.outboxStore.isCompletedByDedupeKey(effect.dedupe_key);
      if (alreadyCompleted) {
        this.logger?.info(
          { effectId: effect.id, dedupeKey: effect.dedupe_key },
          'Effect already completed (duplicate dedupe_key), skipping execution',
        );
        // Mark this duplicate as completed to remove from pending queue
        await this.outboxStore.updateStatus(effect.id, 'completed');
        return;
      }

      // Update status to executing (prevents duplicate processing)
      await this.outboxStore.updateStatus(effect.id, 'executing');

      // Execute based on effect type
      switch (effect.type) {
        case 'send_message': {
          // USER STORY 3: Check PolicyGates for autonomous messages (timer-triggered)
          // Only applies to autonomous sends (from timer events), not user-response sends
          const payload = effect.payload as { content: string; requestId: string };
          const isAutonomous = payload.requestId?.includes('timer_') ?? false;

          if (isAutonomous && this.policyGates && this.loadMetadata) {
            try {
              const metadata = await this.loadMetadata(effect.session_key);
              if (metadata) {
                const policyCheck = this.policyGates.checkCanSendAutonomous(metadata);

                if (!policyCheck.allowed) {
                  // Blocked by policy - mark as failed and log
                  await this.outboxStore.updateStatus(effect.id, 'failed');

                  this.logger?.info(
                    {
                      effectId: effect.id,
                      sessionKey: effect.session_key,
                      blockedBy: policyCheck.blockedBy,
                      reason: policyCheck.reason,
                    },
                    'Autonomous message blocked by PolicyGates',
                  );

                  return; // Exit early - message blocked
                }
              }
            } catch (error) {
              this.logger?.warn(
                {
                  effectId: effect.id,
                  error: error instanceof Error ? error.message : String(error),
                },
                'Failed to load autonomy metadata for PolicyGates check - allowing send',
              );
              // Fail open: if we can't check policy, allow the send (better than blocking legitimate messages)
            }
          }

          const delivered = await this.deliveryHandler(effect);

          if (delivered) {
            // Mark as completed and clear cooldown
            await this.outboxStore.updateStatus(effect.id, 'completed');
            this.sessionCooldowns.delete(effect.session_key);

            this.logger?.debug(
              {
                effectId: effect.id,
                sessionKey: effect.session_key,
                checkpointId: effect.checkpoint_id,
              },
              'Effect delivered successfully',
            );
          } else {
            // WebSocket not connected - revert to pending and start cooldown
            await this.outboxStore.updateStatus(effect.id, 'pending');
            this.sessionCooldowns.set(effect.session_key, Date.now());

            this.logger?.debug(
              {
                effectId: effect.id,
                sessionKey: effect.session_key,
              },
              'WebSocket not connected, effect reverted to pending (cooldown started)',
            );
          }
          break;
        }
        case 'schedule_timer': {
          // NEW in spec 009: Handle schedule_timer effects
          if (!this.timerStore) {
            this.logger?.error(
              { effectId: effect.id },
              'schedule_timer effect received but no TimerStore configured',
            );
            await this.outboxStore.updateStatus(effect.id, 'failed');
            break;
          }

          const payload = effect.payload as unknown;
          if (
            !payload ||
            typeof payload !== 'object' ||
            !('timer_id' in payload) ||
            !('delay_seconds' in payload)
          ) {
            this.logger?.error({ effectId: effect.id }, 'Invalid schedule_timer payload');
            await this.outboxStore.updateStatus(effect.id, 'failed');
            break;
          }

          const { timer_id, delay_seconds } = payload as {
            timer_id: string;
            delay_seconds: number;
            payload?: unknown;
          };
          const timerPayload =
            'payload' in payload ? (payload as { payload: unknown }).payload : undefined;

          const fireAtMs = Date.now() + delay_seconds * 1000;

          await this.timerStore.upsertTimer({
            session_key: effect.session_key,
            timer_id,
            fire_at_ms: fireAtMs,
            payload: timerPayload ?? null,
          });

          await this.outboxStore.updateStatus(effect.id, 'completed');

          this.logger?.info(
            {
              effectId: effect.id,
              timerId: timer_id,
              sessionKey: effect.session_key,
              fireAtMs,
              delaySeconds: delay_seconds,
            },
            'Timer scheduled from effect',
          );
          break;
        }
        default: {
          // Unknown effect type - mark as failed
          this.logger?.error(
            { effectId: effect.id, type: effect.type },
            'Unknown effect type, marking as failed',
          );
          await this.outboxStore.updateStatus(effect.id, 'failed');
        }
      }
    } catch (error) {
      // Execution error - mark as failed
      this.logger?.error(
        {
          effectId: effect.id,
          sessionKey: effect.session_key,
          error: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          errorName: error instanceof Error ? error.name : undefined,
        },
        'Error executing effect, marking as failed',
      );

      try {
        await this.outboxStore.updateStatus(effect.id, 'failed');
      } catch (updateError) {
        this.logger?.error(
          { effectId: effect.id, updateError },
          'Failed to update effect status to failed',
        );
      }
    }
  }

  /**
   * Poll for pending effects for a specific session
   * Used when a WebSocket reconnects to deliver queued messages
   * @param sessionKey - The SESSION_KEY to poll effects for
   */
  async pollForSession(sessionKey: SessionKey): Promise<void> {
    if (!this.deliveryHandler) {
      this.logger?.warn('pollForSession called but no delivery handler set');
      return;
    }

    try {
      // Clear cooldown for this session (WebSocket is now connected)
      this.sessionCooldowns.delete(sessionKey);

      // Fetch pending effects for this session only
      const effects = await this.outboxStore.getPending(this.config.batchSize, sessionKey);

      if (effects.length === 0) {
        this.logger?.debug({ sessionKey }, 'No pending effects for session');
        return;
      }

      this.logger?.info(
        { sessionKey, count: effects.length },
        'Delivering pending effects for reconnected session',
      );

      // Process effects sequentially for this session (preserve order)
      for (const effect of effects) {
        await this.executeEffect(effect);
      }
    } catch (error) {
      this.logger?.error(
        {
          sessionKey,
          error: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
        },
        'Error polling effects for session',
      );
    }
  }

  /**
   * Check if EffectRunner is currently running
   */
  isStarted(): boolean {
    return this.isRunning;
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<EffectRunnerConfig> {
    return { ...this.config };
  }
}
