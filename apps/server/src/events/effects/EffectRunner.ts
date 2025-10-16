/**
 * EffectRunner - Background worker for durable effect delivery
 * Core responsibility: Poll outbox for pending effects, execute via WebSocket, update status
 */

import type { OutboxStore } from './OutboxStore.js';
import type { Effect } from './types.js';
import type { Logger } from 'pino';
import type { SessionKey } from '../types/events.schema.js';

/**
 * Callback for delivering effects to WebSocket connections
 * Returns true if delivery succeeded, false if WebSocket not connected
 */
export type EffectDeliveryHandler = (effect: Effect) => Promise<boolean>;

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
}

export class EffectRunner {
  private readonly outboxStore: OutboxStore;
  private readonly config: Required<EffectRunnerConfig>;
  private readonly logger?: Logger;
  private deliveryHandler: EffectDeliveryHandler | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(outboxStore: OutboxStore, config: EffectRunnerConfig = {}, logger?: Logger) {
    this.outboxStore = outboxStore;
    this.config = {
      pollIntervalMs: config.pollIntervalMs ?? 500,
      batchSize: config.batchSize ?? 100,
      debug: config.debug ?? false,
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

      this.logger?.info({ count: effects.length }, 'Processing pending effects');

      // Process effects concurrently (each session isolated)
      const results = await Promise.allSettled(effects.map((effect) => this.executeEffect(effect)));

      // Log any failures
      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        this.logger?.error(
          { failureCount: failures.length, totalCount: effects.length },
          'Some effects failed to execute',
        );
      }
    } catch (error) {
      this.logger?.error({ error }, 'Error in processEffects');
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
      // Update status to executing (prevents duplicate processing)
      await this.outboxStore.updateStatus(effect.id, 'executing');

      // Execute based on effect type
      switch (effect.type) {
        case 'send_message': {
          const delivered = await this.deliveryHandler(effect);

          if (delivered) {
            // Mark as completed
            await this.outboxStore.updateStatus(effect.id, 'completed');

            this.logger?.debug(
              {
                effectId: effect.id,
                sessionKey: effect.session_key,
                checkpointId: effect.checkpoint_id,
              },
              'Effect delivered successfully',
            );
          } else {
            // WebSocket not connected - revert to pending for retry on reconnection
            await this.outboxStore.updateStatus(effect.id, 'pending');

            this.logger?.debug(
              {
                effectId: effect.id,
                sessionKey: effect.session_key,
              },
              'WebSocket not connected, effect reverted to pending for retry',
            );
          }
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
          error,
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
      this.logger?.error({ sessionKey, error }, 'Error polling effects for session');
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
