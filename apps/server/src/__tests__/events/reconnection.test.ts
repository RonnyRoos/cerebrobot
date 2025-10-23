/**
 * Reconnection Delivery Unit Tests (User Story 2)
 * Tests that pending effects are delivered when user reconnects after WebSocket disconnection
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { EffectRunner } from '../../events/effects/EffectRunner.js';
import type { OutboxStore } from '../../events/effects/OutboxStore.js';
import type { Effect } from '../../events/effects/types.js';
import { SessionKeySchema } from '../../events/types/events.schema.js';

describe('Reconnection Delivery (User Story 2)', () => {
  let effectRunner: EffectRunner;
  let mockOutboxStore: OutboxStore;
  let deliveredEffects: Effect[];

  const SESSION_KEY = SessionKeySchema.parse('user1:agent1:thread1');

  beforeEach(() => {
    deliveredEffects = [];

    // Mock OutboxStore
    mockOutboxStore = {
      getPending: vi.fn(async (_limit: number, sessionKey?: string) => {
        // Return pending effects only for the requested session
        if (sessionKey === SESSION_KEY) {
          return [
            createMockEffect('effect-1', SESSION_KEY, 'Message from before disconnect'),
            createMockEffect('effect-2', SESSION_KEY, 'Second pending message'),
          ];
        }
        return [];
      }),
      updateStatus: vi.fn(async (id: string) => {
        return createMockEffect(id, SESSION_KEY, 'content');
      }),
      isCompletedByDedupeKey: vi.fn(async () => false), // No duplicates by default
    } as unknown as OutboxStore;

    // Create EffectRunner
    effectRunner = new EffectRunner(mockOutboxStore, { pollIntervalMs: 100 });

    // Start with mock delivery handler
    effectRunner.start(async (effect: Effect) => {
      deliveredEffects.push(effect);
      return true; // Simulate successful WebSocket delivery
    });
  });

  it('should deliver pending effects when pollForSession is called', async () => {
    // Simulate reconnection trigger
    await effectRunner.pollForSession(SESSION_KEY);

    // Should have delivered both pending effects
    expect(deliveredEffects.length).toBe(2);
    const payload1 = deliveredEffects[0].payload as { content: string };
    const payload2 = deliveredEffects[1].payload as { content: string };
    expect(payload1.content).toBe('Message from before disconnect');
    expect(payload2.content).toBe('Second pending message');

    // Should have fetched pending effects for this session
    expect(mockOutboxStore.getPending).toHaveBeenCalledWith(100, SESSION_KEY);

    // Should have updated status for each effect (pending → executing → completed)
    expect(mockOutboxStore.updateStatus).toHaveBeenCalledTimes(4); // 2 effects × 2 status updates each
  });

  it('should not deliver effects for other sessions', async () => {
    const OTHER_SESSION = SessionKeySchema.parse('user2:agent2:thread2');

    // Poll for different session
    await effectRunner.pollForSession(OTHER_SESSION);

    // Should not deliver any effects (mock returns empty for other sessions)
    expect(deliveredEffects.length).toBe(0);
    expect(mockOutboxStore.getPending).toHaveBeenCalledWith(100, OTHER_SESSION);
  });

  it('should handle empty pending queue gracefully', async () => {
    // Mock returns empty array
    vi.mocked(mockOutboxStore.getPending).mockResolvedValue([]);

    await effectRunner.pollForSession(SESSION_KEY);

    // Should not crash, no effects delivered
    expect(deliveredEffects.length).toBe(0);
  });

  it('should process effects sequentially for session (preserve order)', async () => {
    const processOrder: string[] = [];

    // Create fresh EffectRunner with custom handler
    const sequentialRunner = new EffectRunner(mockOutboxStore, { pollIntervalMs: 100 });
    sequentialRunner.start(async (effect: Effect) => {
      processOrder.push(effect.id);
      // Simulate async delivery delay
      await new Promise((resolve) => setTimeout(resolve, 10));
      return true;
    });

    await sequentialRunner.pollForSession(SESSION_KEY);

    // Effects should be processed in order (not concurrent)
    expect(processOrder).toEqual(['effect-1', 'effect-2']);
  });

  it('should continue processing even if one effect fails', async () => {
    let callCount = 0;
    const failingEffects: Effect[] = [];

    // Create fresh EffectRunner with failure-aware handler
    const failureRunner = new EffectRunner(mockOutboxStore, { pollIntervalMs: 100 });
    failureRunner.start(async (effect: Effect) => {
      callCount++;
      if (callCount === 1) {
        return false; // First effect fails (WebSocket not connected)
      }
      failingEffects.push(effect);
      return true; // Second effect succeeds
    });

    await failureRunner.pollForSession(SESSION_KEY);

    // Second effect should still be processed
    expect(failingEffects.length).toBe(1);
    expect(failingEffects[0].id).toBe('effect-2');
  });

  it('should work when EffectRunner is not started', async () => {
    // Create fresh EffectRunner without starting
    const freshRunner = new EffectRunner(mockOutboxStore);

    // Should not crash, but also won't deliver (no handler set)
    await expect(freshRunner.pollForSession(SESSION_KEY)).resolves.not.toThrow();

    expect(deliveredEffects.length).toBe(0);
  });
});

// Helper function to create mock effects
function createMockEffect(id: string, sessionKey: string, content: string): Effect {
  return {
    id,
    session_key: sessionKey as ReturnType<typeof SessionKeySchema.parse>,
    checkpoint_id: 'ckpt-123',
    type: 'send_message',
    payload: {
      content,
      requestId: randomUUID(),
      isFinal: true,
    },
    dedupe_key: `dedupe-${id}`,
    status: 'pending',
    created_at: new Date(),
    updated_at: new Date(),
  };
}
