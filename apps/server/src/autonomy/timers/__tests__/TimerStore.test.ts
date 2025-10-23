/**
 * TimerStore Unit Tests
 *
 * Tests timer persistence, upsert logic, due timer queries, and cancellation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { TimerStore } from '../TimerStore.js';
import type { SessionKey } from '../../types/events.schema.js';

const prisma = new PrismaClient();
const timerStore = new TimerStore(prisma);

const SESSION_1: SessionKey = 'user1:agent1:thread1' as SessionKey;
const SESSION_2: SessionKey = 'user2:agent2:thread2' as SessionKey;

describe('TimerStore', () => {
  beforeEach(async () => {
    // Clean up timers before each test
    await prisma.timer.deleteMany();
  });

  afterEach(async () => {
    await prisma.timer.deleteMany();
  });

  describe('upsertTimer', () => {
    it('should create a new timer', async () => {
      const fireAtMs = Date.now() + 30000;

      const timer = await timerStore.upsertTimer({
        session_key: SESSION_1,
        timer_id: 'followup-1',
        fire_at_ms: fireAtMs,
        payload: { reason: 'question_unanswered' },
      });

      expect(timer.id).toBeDefined();
      expect(timer.session_key).toBe(SESSION_1);
      expect(timer.timer_id).toBe('followup-1');
      expect(timer.fire_at_ms).toBe(fireAtMs);
      expect(timer.status).toBe('pending');
      expect(timer.payload).toEqual({ reason: 'question_unanswered' });
    });

    it('should upsert with same timer_id replaces previous fire_at and payload', async () => {
      const firstFireAtMs = Date.now() + 30000;
      const secondFireAtMs = Date.now() + 60000;

      // Create initial timer
      const first = await timerStore.upsertTimer({
        session_key: SESSION_1,
        timer_id: 'followup-1',
        fire_at_ms: firstFireAtMs,
        payload: { reason: 'first' },
      });

      // Upsert with same timer_id
      const second = await timerStore.upsertTimer({
        session_key: SESSION_1,
        timer_id: 'followup-1',
        fire_at_ms: secondFireAtMs,
        payload: { reason: 'second' },
      });

      // Should be same ID (update, not insert)
      expect(second.id).toBe(first.id);
      expect(second.fire_at_ms).toBe(secondFireAtMs);
      expect(second.payload).toEqual({ reason: 'second' });

      // Verify only one timer exists in DB
      const timers = await prisma.timer.findMany({
        where: { sessionKey: SESSION_1, timerId: 'followup-1' },
      });
      expect(timers).toHaveLength(1);
    });

    it('should verify UNIQUE constraint on (session_key, timer_id)', async () => {
      const fireAtMs = Date.now() + 30000;

      // Create timer for SESSION_1
      await timerStore.upsertTimer({
        session_key: SESSION_1,
        timer_id: 'followup-1',
        fire_at_ms: fireAtMs,
        payload: null,
      });

      // Create timer with same timer_id for SESSION_2 (should succeed - different session)
      const session2Timer = await timerStore.upsertTimer({
        session_key: SESSION_2,
        timer_id: 'followup-1',
        fire_at_ms: fireAtMs,
        payload: null,
      });

      expect(session2Timer.session_key).toBe(SESSION_2);

      // Verify both exist independently
      const allTimers = await prisma.timer.findMany({
        where: { timerId: 'followup-1' },
      });
      expect(allTimers).toHaveLength(2);
    });
  });

  describe('findDueTimers', () => {
    it('should return due timers ordered by fire_at', async () => {
      const nowMs = Date.now();
      const pastMs = nowMs - 10000;
      const recentMs = nowMs - 5000;
      const laterMs = nowMs + 60000;

      await timerStore.upsertTimer({
        session_key: SESSION_1,
        timer_id: 'timer-later',
        fire_at_ms: laterMs,
        payload: null,
      });

      await timerStore.upsertTimer({
        session_key: SESSION_1,
        timer_id: 'timer-recent',
        fire_at_ms: recentMs,
        payload: null,
      });

      await timerStore.upsertTimer({
        session_key: SESSION_1,
        timer_id: 'timer-past',
        fire_at_ms: pastMs,
        payload: null,
      });

      const dueTimers = await timerStore.findDueTimers(nowMs);

      expect(dueTimers).toHaveLength(2); // past and recent (not later)
      expect(dueTimers[0].timer_id).toBe('timer-past'); // Oldest first
      expect(dueTimers[1].timer_id).toBe('timer-recent');
    });

    it('should include past-scheduled timers with fire_at in the past', async () => {
      const veryOldMs = Date.now() - 3600000; // 1 hour ago

      await timerStore.upsertTimer({
        session_key: SESSION_1,
        timer_id: 'very-old',
        fire_at_ms: veryOldMs,
        payload: null,
      });

      const dueTimers = await timerStore.findDueTimers(Date.now());

      expect(dueTimers).toHaveLength(1);
      expect(dueTimers[0].timer_id).toBe('very-old');
    });

    it('should only return pending status timers', async () => {
      const fireAtMs = Date.now() - 1000;

      const timer = await timerStore.upsertTimer({
        session_key: SESSION_1,
        timer_id: 'test-timer',
        fire_at_ms: fireAtMs,
        payload: null,
      });

      // Mark as promoted
      await timerStore.markPromoted(timer.id);

      const dueTimers = await timerStore.findDueTimers(Date.now());

      expect(dueTimers).toHaveLength(0); // Should not include promoted timers
    });

    it('should respect limit parameter', async () => {
      const fireAtMs = Date.now() - 1000;

      for (let i = 0; i < 5; i++) {
        await timerStore.upsertTimer({
          session_key: SESSION_1,
          timer_id: `timer-${i}`,
          fire_at_ms: fireAtMs,
          payload: null,
        });
      }

      const limited = await timerStore.findDueTimers(Date.now(), 3);

      expect(limited).toHaveLength(3);
    });
  });

  describe('markPromoted', () => {
    it('should update status to promoted', async () => {
      const timer = await timerStore.upsertTimer({
        session_key: SESSION_1,
        timer_id: 'test',
        fire_at_ms: Date.now(),
        payload: null,
      });

      const promoted = await timerStore.markPromoted(timer.id);

      expect(promoted.status).toBe('promoted');
      expect(promoted.id).toBe(timer.id);
    });
  });

  describe('cancelBySession', () => {
    it('should cancel all pending timers for a session', async () => {
      await timerStore.upsertTimer({
        session_key: SESSION_1,
        timer_id: 'timer-1',
        fire_at_ms: Date.now() + 1000,
        payload: null,
      });

      await timerStore.upsertTimer({
        session_key: SESSION_1,
        timer_id: 'timer-2',
        fire_at_ms: Date.now() + 2000,
        payload: null,
      });

      await timerStore.upsertTimer({
        session_key: SESSION_2,
        timer_id: 'timer-3',
        fire_at_ms: Date.now() + 1000,
        payload: null,
      });

      const count = await timerStore.cancelBySession(SESSION_1);

      expect(count).toBe(2);

      // Verify SESSION_1 timers are cancelled
      const session1Timers = await prisma.timer.findMany({
        where: { sessionKey: SESSION_1 },
      });
      expect(session1Timers.every((t) => t.status === 'cancelled')).toBe(true);

      // Verify SESSION_2 timer unaffected
      const session2Timers = await prisma.timer.findMany({
        where: { sessionKey: SESSION_2 },
      });
      expect(session2Timers[0].status).toBe('pending');
    });
  });

  describe('getTimer', () => {
    it('should retrieve timer by session_key and timer_id', async () => {
      await timerStore.upsertTimer({
        session_key: SESSION_1,
        timer_id: 'specific',
        fire_at_ms: Date.now(),
        payload: { test: true },
      });

      const timer = await timerStore.getTimer(SESSION_1, 'specific');

      expect(timer).not.toBeNull();
      expect(timer!.timer_id).toBe('specific');
      expect(timer!.payload).toEqual({ test: true });
    });

    it('should return null for non-existent timer', async () => {
      const timer = await timerStore.getTimer(SESSION_1, 'nonexistent');

      expect(timer).toBeNull();
    });
  });
});
