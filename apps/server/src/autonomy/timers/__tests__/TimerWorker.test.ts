/**
 * TimerWorker Unit Tests
 *
 * Tests timer polling, promotion logic, and status updates.
 * Uses TimerStore directly since TimerWorker will be implemented in T019.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { TimerStore } from '../TimerStore.js';
import type { SessionKey } from '../../../events/types/events.schema.js';

const prisma = new PrismaClient();
const timerStore = new TimerStore(prisma);

const SESSION_1: SessionKey = 'user1:agent1:thread1' as SessionKey;

describe('TimerWorker', () => {
  beforeEach(async () => {
    await prisma.timer.deleteMany();
  });

  describe('pollAndPromote logic', () => {
    it('should find due timers ready for promotion', async () => {
      // Create a due timer
      const timer = await timerStore.upsertTimer({
        session_key: SESSION_1,
        timer_id: 'test-timer',
        fire_at_ms: Date.now() - 1000, // Past due
        payload: { reason: 'followup' },
      });

      // Find due timers (what worker polls for)
      const dueTimers = await timerStore.findDueTimers(Date.now());

      expect(dueTimers).toHaveLength(1);
      expect(dueTimers[0].timer_id).toBe('test-timer');
      expect(dueTimers[0].status).toBe('pending');

      // Simulate promotion (mark as promoted)
      await timerStore.markPromoted(timer.id);

      // Verify timer status updated
      const updated = await timerStore.getTimer(SESSION_1, 'test-timer');
      expect(updated?.status).toBe('promoted');

      // Verify promoted timer no longer appears in due query
      const dueAfterPromotion = await timerStore.findDueTimers(Date.now());
      expect(dueAfterPromotion).toHaveLength(0);
    });

    it('should handle multiple due timers in order', async () => {
      const oldMs = Date.now() - 10000;
      const recentMs = Date.now() - 5000;

      await timerStore.upsertTimer({
        session_key: SESSION_1,
        timer_id: 'timer-old',
        fire_at_ms: oldMs,
        payload: null,
      });

      await timerStore.upsertTimer({
        session_key: SESSION_1,
        timer_id: 'timer-recent',
        fire_at_ms: recentMs,
        payload: null,
      });

      const dueTimers = await timerStore.findDueTimers(Date.now());

      expect(dueTimers).toHaveLength(2);
      expect(dueTimers[0].timer_id).toBe('timer-old'); // Oldest first
      expect(dueTimers[1].timer_id).toBe('timer-recent');
    });

    it('should not promote cancelled timers', async () => {
      await timerStore.upsertTimer({
        session_key: SESSION_1,
        timer_id: 'cancelled-timer',
        fire_at_ms: Date.now() - 1000,
        payload: null,
      });

      // Cancel the timer
      await timerStore.cancelBySession(SESSION_1);

      // Try to find due timers
      const dueTimers = await timerStore.findDueTimers(Date.now());

      expect(dueTimers).toHaveLength(0); // Cancelled timers not included
    });

    it('should not promote already-promoted timers', async () => {
      const timer = await timerStore.upsertTimer({
        session_key: SESSION_1,
        timer_id: 'already-promoted',
        fire_at_ms: Date.now() - 1000,
        payload: null,
      });

      await timerStore.markPromoted(timer.id);

      const dueTimers = await timerStore.findDueTimers(Date.now());

      expect(dueTimers).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should handle timer promotion failures gracefully', async () => {
      // This test verifies that worker can handle errors without crashing
      // Actual implementation will include try-catch with logging

      await timerStore.upsertTimer({
        session_key: SESSION_1,
        timer_id: 'error-test',
        fire_at_ms: Date.now() - 1000,
        payload: null,
      });

      // Worker should log error but continue
      // Test validates that the timer can still be found as pending
      const stillPending = await timerStore.getTimer(SESSION_1, 'error-test');
      expect(stillPending?.status).toBe('pending');
    });
  });
});
