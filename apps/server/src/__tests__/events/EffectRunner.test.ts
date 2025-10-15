import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EffectDeliveryHandler } from '../../events/effects/EffectRunner.js';
import { EffectRunner } from '../../events/effects/EffectRunner.js';
import type { Effect } from '../../events/types/effects.schema.js';
import { parseSessionKey, SessionKeySchema } from '../../events/index.js';

describe('EffectRunner', () => {
  let mockOutboxStore: {
    getPending: ReturnType<typeof vi.fn>;
    updateStatus: ReturnType<typeof vi.fn>;
  };
  let effectRunner: EffectRunner;
  const deliveryHandler: EffectDeliveryHandler = vi.fn(async () => true);

  beforeEach(() => {
    vi.useFakeTimers();

    mockOutboxStore = {
      getPending: vi.fn().mockResolvedValue([]),
      updateStatus: vi.fn().mockResolvedValue(undefined),
    };

    effectRunner = new EffectRunner(mockOutboxStore as any, {
      pollIntervalMs: 100,
    });
  });

  afterEach(() => {
    effectRunner.stop();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  function createEffect(
    sessionKey: string,
    content: string,
    id = '1',
    seq = 1,
  ): Effect {
    const validatedKey = SessionKeySchema.parse(sessionKey);
    return {
      id,
      session_key: validatedKey,
      checkpoint_id: 'checkpoint-1',
      type: 'send_message',
      payload: { content },
      dedupe_key: `${validatedKey}:send_message:${seq}`,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  describe('polling', () => {
    it('should poll for pending effects at configured interval', async () => {
      effectRunner.start(deliveryHandler);

      // First poll happens immediately on start
      expect(mockOutboxStore.getPending).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(100);
      expect(mockOutboxStore.getPending).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(100);
      expect(mockOutboxStore.getPending).toHaveBeenCalledTimes(3);
    });

    it('should not poll when stopped', async () => {
      effectRunner.start(deliveryHandler);

      // Initial poll
      expect(mockOutboxStore.getPending).toHaveBeenCalledTimes(1);

      effectRunner.stop();

      await vi.advanceTimersByTimeAsync(200);
      // Should still be 1 (no additional polls after stop)
      expect(mockOutboxStore.getPending).toHaveBeenCalledTimes(1);
    });

    it('should not throw error if started twice', () => {
      effectRunner.start(deliveryHandler);

      // Should not throw, just warn and ignore
      expect(() => effectRunner.start(deliveryHandler)).not.toThrow();
    });
  });

  describe('delivery', () => {
    it('should invoke delivery handler for each pending effect', async () => {
      const effect1 = createEffect('user1:agent1:thread1', 'Hello', '1', 1);
      const effect2 = createEffect('user1:agent1:thread1', 'World', '2', 2);

      mockOutboxStore.getPending.mockResolvedValueOnce([effect1, effect2]);

      effectRunner.start(deliveryHandler);

      await vi.advanceTimersByTimeAsync(100);

      expect(deliveryHandler).toHaveBeenCalledTimes(2);
      expect(deliveryHandler).toHaveBeenCalledWith(effect1);
      expect(deliveryHandler).toHaveBeenCalledWith(effect2);
    });

    it('should process effects in parallel', async () => {
      const effect1 = createEffect('user1:agent1:thread1', 'Hello', '1', 1);
      const effect2 = createEffect('user2:agent1:thread2', 'World', '2', 1);

      let effect1Started = false;
      let effect2Started = false;
      let effect1Completed = false;
      let effect2Completed = false;

      const slowDelivery = vi.fn(async (effect: Effect) => {
        if (effect.id === '1') {
          effect1Started = true;
          await new Promise((resolve) => setTimeout(resolve, 50));
          effect1Completed = true;
        } else {
          effect2Started = true;
          await new Promise((resolve) => setTimeout(resolve, 50));
          effect2Completed = true;
        }
        return true;
      });

      mockOutboxStore.getPending.mockResolvedValueOnce([effect1, effect2]);

      effectRunner.start(slowDelivery);

      await vi.advanceTimersByTimeAsync(100);

      // Both should start before either completes (parallel execution)
      expect(effect1Started).toBe(true);
      expect(effect2Started).toBe(true);

      await vi.advanceTimersByTimeAsync(50);

      expect(effect1Completed).toBe(true);
      expect(effect2Completed).toBe(true);
    });
  });

  describe('status updates', () => {
    it('should update status to executing when starting delivery', async () => {
      const effect = createEffect('user1:agent1:thread1', 'Hello', '1', 1);

      mockOutboxStore.getPending.mockResolvedValueOnce([effect]).mockResolvedValue([]);

      effectRunner.start(deliveryHandler);

      // Wait for immediate poll + one more cycle
      await vi.advanceTimersByTimeAsync(1);

      // Should update to executing first
      expect(mockOutboxStore.updateStatus).toHaveBeenCalledWith(effect.id, 'executing');
    });

    it('should update status to completed on successful delivery', async () => {
      const effect = createEffect('user1:agent1:thread1', 'Hello', '1', 1);

      mockOutboxStore.getPending.mockResolvedValueOnce([effect]).mockResolvedValue([]);
      vi.mocked(deliveryHandler).mockResolvedValueOnce(true);

      effectRunner.start(deliveryHandler);

      await vi.advanceTimersByTimeAsync(1);

      expect(mockOutboxStore.updateStatus).toHaveBeenCalledWith(effect.id, 'completed');
    });

    it('should revert status to pending on delivery failure', async () => {
      const effect = createEffect('user1:agent1:thread1', 'Hello', '1', 1);

      mockOutboxStore.getPending.mockResolvedValueOnce([effect]).mockResolvedValue([]);
      vi.mocked(deliveryHandler).mockResolvedValueOnce(false); // Delivery failed

      effectRunner.start(deliveryHandler);

      await vi.advanceTimersByTimeAsync(1);

      expect(mockOutboxStore.updateStatus).toHaveBeenCalledWith(effect.id, 'pending');
    });

    it('should mark as failed on delivery exception', async () => {
      const effect = createEffect('user1:agent1:thread1', 'Hello', '1', 1);

      mockOutboxStore.getPending.mockResolvedValueOnce([effect]).mockResolvedValue([]);
      vi.mocked(deliveryHandler).mockRejectedValueOnce(new Error('Network error'));

      effectRunner.start(deliveryHandler);

      await vi.advanceTimersByTimeAsync(1);

      expect(mockOutboxStore.updateStatus).toHaveBeenCalledWith(effect.id, 'failed');
    });
  });

  describe('session-specific polling', () => {
    it('should poll for specific session when requested', async () => {
      const sessionKey = SessionKeySchema.parse('user1:agent1:thread1');
      const effect = createEffect('user1:agent1:thread1', 'Hello', '1', 1);

      // First mock for the automatic start() poll, second for pollForSession()
      mockOutboxStore.getPending.mockResolvedValueOnce([]).mockResolvedValueOnce([effect]);

      effectRunner.start(deliveryHandler);

      await effectRunner.pollForSession(sessionKey);

      // Check that getPending was called with the sessionKey as second parameter
      expect(mockOutboxStore.getPending).toHaveBeenCalledWith(100, sessionKey);
      expect(deliveryHandler).toHaveBeenCalledWith(effect);
    });

    it('should process session-specific effects immediately', async () => {
      const sessionKey = SessionKeySchema.parse('user1:agent1:thread1');
      const effect = createEffect('user1:agent1:thread1', 'Hello', '1', 1);

      // First mock for the automatic start() poll, second for pollForSession()
      mockOutboxStore.getPending.mockResolvedValueOnce([]).mockResolvedValueOnce([effect]);
      vi.mocked(deliveryHandler).mockResolvedValue(true);

      effectRunner.start(deliveryHandler);

      // Poll immediately without advancing timers
      await effectRunner.pollForSession(sessionKey);

      expect(deliveryHandler).toHaveBeenCalledWith(effect);
      expect(mockOutboxStore.updateStatus).toHaveBeenCalledWith(effect.id, 'completed');
    });
  });

  describe('lifecycle', () => {
    it('should start in stopped state', () => {
      expect(effectRunner.isStarted()).toBe(false);
    });

    it('should be started after start()', () => {
      effectRunner.start(deliveryHandler);
      expect(effectRunner.isStarted()).toBe(true);
    });

    it('should be stopped after stop()', () => {
      effectRunner.start(deliveryHandler);
      effectRunner.stop();
      expect(effectRunner.isStarted()).toBe(false);
    });

    it('should not error when stopping if not started', () => {
      expect(() => effectRunner.stop()).not.toThrow();
    });

    it('should clear timers on stop', async () => {
      effectRunner.start(deliveryHandler);

      // Initial poll on start
      expect(mockOutboxStore.getPending).toHaveBeenCalledTimes(1);

      effectRunner.stop();

      await vi.advanceTimersByTimeAsync(200);
      // Should still be 1 (no new polls after stop)
      expect(mockOutboxStore.getPending).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should continue polling after delivery error', async () => {
      const effect1 = createEffect('user1:agent1:thread1', 'Hello', '1', 1);
      const effect2 = createEffect('user1:agent1:thread1', 'World', '2', 2);

      mockOutboxStore.getPending
        .mockResolvedValueOnce([effect1])
        .mockResolvedValueOnce([effect2])
        .mockResolvedValue([]);

      vi.mocked(deliveryHandler).mockRejectedValueOnce(new Error('Network error'));

      effectRunner.start(deliveryHandler);

      // Wait for initial poll
      await vi.advanceTimersByTimeAsync(1);
      expect(deliveryHandler).toHaveBeenCalledTimes(1);

      // Should continue polling despite error
      await vi.advanceTimersByTimeAsync(100);
      expect(mockOutboxStore.getPending).toHaveBeenCalledTimes(2);
      expect(deliveryHandler).toHaveBeenCalledTimes(2);
    });

    it('should continue polling after getPending error', async () => {
      mockOutboxStore.getPending
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValue([]);

      effectRunner.start(deliveryHandler);

      // Initial poll (will fail)
      await vi.advanceTimersByTimeAsync(1);
      expect(mockOutboxStore.getPending).toHaveBeenCalledTimes(1);

      // Should continue polling despite error
      await vi.advanceTimersByTimeAsync(100);
      expect(mockOutboxStore.getPending).toHaveBeenCalledTimes(2);
    });
  });
});
