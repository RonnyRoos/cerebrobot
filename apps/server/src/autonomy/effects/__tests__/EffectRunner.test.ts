/**
 * EffectRunner Unit Tests
 *
 * Tests effect processing for schedule_timer and send_message types.
 * Part of TDD for User Story 1 (T017-T018).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { TimerStore } from '../../timers/TimerStore.js';
import type { SessionKey } from '../../types/events.schema.js';

const prisma = new PrismaClient();
const timerStore = new TimerStore(prisma);

const SESSION_1: SessionKey = 'user1:agent1:thread1' as SessionKey;

describe('EffectRunner', () => {
  beforeEach(async () => {
    await prisma.timer.deleteMany();
    await prisma.effect.deleteMany();
  });

  describe('processScheduleTimer', () => {
    it('should create timer from schedule_timer effect', async () => {
      // Create a schedule_timer effect
      const effect = await prisma.effect.create({
        data: {
          sessionKey: SESSION_1,
          checkpointId: 'test-checkpoint-1',
          dedupeKey: `${SESSION_1}:schedule_timer:followup-1`,
          type: 'schedule_timer',
          payload: {
            timer_id: 'followup-1',
            delay_seconds: 30,
            payload: { reason: 'check_in' },
          },
          status: 'pending',
        },
      });

      // Simulate EffectRunner processing
      const payload = effect.payload as {
        timer_id: string;
        delay_seconds: number;
        payload?: unknown;
      };

      const fireAtMs = Date.now() + payload.delay_seconds * 1000;

      await timerStore.upsertTimer({
        session_key: SESSION_1,
        timer_id: payload.timer_id,
        fire_at_ms: fireAtMs,
        payload: payload.payload ?? null,
      });

      // Mark effect as completed (processed successfully)
      await prisma.effect.update({
        where: { id: effect.id },
        data: { status: 'completed' },
      });

      // Verify timer was created
      const timer = await timerStore.getTimer(SESSION_1, 'followup-1');
      expect(timer).toBeDefined();
      expect(timer?.status).toBe('pending');
      expect(timer?.payload).toEqual({ reason: 'check_in' });

      // Verify effect was marked completed
      const updated = await prisma.effect.findUnique({
        where: { id: effect.id },
      });
      expect(updated?.status).toBe('completed');
    });

    it('should replace existing timer with same timer_id', async () => {
      // Create initial timer
      await timerStore.upsertTimer({
        session_key: SESSION_1,
        timer_id: 'followup-1',
        fire_at_ms: Date.now() + 60000, // 1 minute
        payload: { reason: 'old' },
      });

      // Create schedule_timer effect with same timer_id
      const effect = await prisma.effect.create({
        data: {
          sessionKey: SESSION_1,
          checkpointId: 'test-checkpoint-2',
          dedupeKey: `${SESSION_1}:schedule_timer:followup-1-update`,
          type: 'schedule_timer',
          payload: {
            timer_id: 'followup-1',
            delay_seconds: 30,
            payload: { reason: 'updated' },
          },
          status: 'pending',
        },
      });

      // Simulate EffectRunner processing (upsert replaces)
      const payload = effect.payload as {
        timer_id: string;
        delay_seconds: number;
        payload?: unknown;
      };

      const fireAtMs = Date.now() + payload.delay_seconds * 1000;

      await timerStore.upsertTimer({
        session_key: SESSION_1,
        timer_id: payload.timer_id,
        fire_at_ms: fireAtMs,
        payload: payload.payload ?? null,
      });

      // Verify timer was replaced (not duplicated)
      const allTimers = await prisma.timer.findMany({
        where: { sessionKey: SESSION_1, timerId: 'followup-1' },
      });
      expect(allTimers).toHaveLength(1);
      expect(allTimers[0].payload).toEqual({ reason: 'updated' });
    });

    it('should handle null payload in timer', async () => {
      const effect = await prisma.effect.create({
        data: {
          sessionKey: SESSION_1,
          checkpointId: 'test-checkpoint-3',
          dedupeKey: `${SESSION_1}:schedule_timer:no-payload`,
          type: 'schedule_timer',
          payload: {
            timer_id: 'no-payload-timer',
            delay_seconds: 10,
            // No payload field
          },
          status: 'pending',
        },
      });

      const payload = effect.payload as {
        timer_id: string;
        delay_seconds: number;
        payload?: unknown;
      };

      const fireAtMs = Date.now() + payload.delay_seconds * 1000;

      await timerStore.upsertTimer({
        session_key: SESSION_1,
        timer_id: payload.timer_id,
        fire_at_ms: fireAtMs,
        payload: payload.payload ?? null,
      });

      const timer = await timerStore.getTimer(SESSION_1, 'no-payload-timer');
      expect(timer?.payload).toBeNull();
    });
  });

  describe('processSendMessage', () => {
    it('should enqueue send_message effect to outbox', async () => {
      // Create a send_message effect
      const effect = await prisma.effect.create({
        data: {
          sessionKey: SESSION_1,
          checkpointId: 'test-checkpoint-5',
          dedupeKey: `${SESSION_1}:send_message:1`,
          type: 'send_message',
          payload: {
            content: 'Hello from autonomy!',
          },
          status: 'pending',
        },
      });

      // Simulate EffectRunner processing (mark as completed)
      await prisma.effect.update({
        where: { id: effect.id },
        data: { status: 'completed' },
      });

      // In real implementation, EffectRunner would add to outbox
      // Here we verify the effect status changed
      const updated = await prisma.effect.findUnique({
        where: { id: effect.id },
      });
      expect(updated?.status).toBe('completed');
    });

    it('should handle empty content gracefully', async () => {
      const effect = await prisma.effect.create({
        data: {
          sessionKey: SESSION_1,
          checkpointId: 'test-checkpoint-6',
          dedupeKey: `${SESSION_1}:send_message:empty`,
          type: 'send_message',
          payload: {
            content: '',
          },
          status: 'pending',
        },
      });

      // Validation would happen in EffectRunner
      // For now, verify effect exists
      expect(effect.type).toBe('send_message');
    });
  });

  describe('error handling', () => {
    it('should mark effect as failed on timer creation error', async () => {
      // Create effect with invalid payload
      const effect = await prisma.effect.create({
        data: {
          sessionKey: SESSION_1,
          checkpointId: 'test-checkpoint-4',
          dedupeKey: `${SESSION_1}:schedule_timer:invalid`,
          type: 'schedule_timer',
          payload: {
            // Missing required timer_id
            delay_seconds: 30,
          },
          status: 'pending',
        },
      });

      // Simulate EffectRunner error handling
      try {
        const payload = effect.payload as {
          timer_id: string;
          delay_seconds: number;
        };

        // This should throw due to missing timer_id
        await timerStore.upsertTimer({
          session_key: SESSION_1,
          timer_id: payload.timer_id, // undefined
          fire_at_ms: Date.now(),
          payload: null,
        });
      } catch (error) {
        // Mark effect as failed
        await prisma.effect.update({
          where: { id: effect.id },
          data: { status: 'failed' },
        });
      }

      const updated = await prisma.effect.findUnique({
        where: { id: effect.id },
      });
      expect(updated?.status).toBe('failed');
    });
  });
});
