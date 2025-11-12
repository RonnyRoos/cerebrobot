/**
 * TimerWorker Tests
 *
 * Validates timer polling, promotion logic, and invalid session_key handling.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TimerWorker } from '../TimerWorker.js';
import { TimerStore } from '../TimerStore.js';
import { EventStore } from '../../../events/events/EventStore.js';
import type { EventQueue } from '../../../events/events/EventQueue.js';
import pino from 'pino';

describe('TimerWorker', () => {
  let timerStore: TimerStore;
  let eventStore: EventStore;
  let eventQueue: EventQueue;
  let logger: pino.Logger;

  beforeEach(() => {
    // Mock dependencies
    timerStore = {
      findDueTimers: vi.fn(),
      markPromoted: vi.fn(),
      markCancelled: vi.fn(),
    } as unknown as TimerStore;

    eventStore = {
      getNextSeq: vi.fn(),
      create: vi.fn(),
    } as unknown as EventStore;

    eventQueue = {
      enqueue: vi.fn().mockResolvedValue(undefined), // Mock must return a promise
    } as unknown as EventQueue;

    logger = pino({ level: 'silent' });
  });

  describe('invalid session_key handling', () => {
    it('should skip timers with invalid session_key format (4 segments) and mark them as cancelled', async () => {
      // Arrange: Timer with invalid session_key (has timestamp suffix)
      const invalidTimer = {
        id: 'timer-123',
        session_key: 'test-validation:agent1:thread1:1762759196286', // Invalid: 4 segments
        timer_id: 'test-timer',
        fire_at_ms: BigInt(Date.now() - 1000),
        status: 'pending',
      };

      vi.mocked(timerStore.findDueTimers).mockResolvedValue([invalidTimer] as never);

      const worker = new TimerWorker(
        timerStore,
        eventStore,
        eventQueue,
        { pollIntervalMs: 1000, batchSize: 10 },
        logger,
      );

      // Act
      worker.start();
      await worker.pollAndPromote();
      worker.stop();

      // Assert: Timer should be marked as cancelled, not promoted
      expect(timerStore.markCancelled).toHaveBeenCalledWith('timer-123');
      expect(timerStore.markPromoted).not.toHaveBeenCalled();
      expect(eventStore.create).not.toHaveBeenCalled();
      expect(eventQueue.enqueue).not.toHaveBeenCalled();
    });

    it('should skip timers with special characters in session_key and mark them as cancelled', async () => {
      // Arrange: Timer with invalid characters in session_key
      const testTimer = {
        id: 'timer-test',
        session_key: 'user@email.com:agent:thread', // Invalid: contains @ and .
        timer_id: 'test-timer',
        fire_at_ms: BigInt(Date.now() - 1000),
        status: 'pending',
      };

      vi.mocked(timerStore.findDueTimers).mockResolvedValue([testTimer] as never);

      const worker = new TimerWorker(
        timerStore,
        eventStore,
        eventQueue,
        { pollIntervalMs: 1000, batchSize: 10 },
        logger,
      );

      // Act
      worker.start();
      await worker.pollAndPromote();
      worker.stop();

      // Assert
      expect(timerStore.markCancelled).toHaveBeenCalledWith('timer-test');
      expect(timerStore.markPromoted).not.toHaveBeenCalled();
    });

    it('should process valid timers successfully', async () => {
      // Arrange: Valid timer with correct 3-segment UUID-based session_key
      const validTimer = {
        id: 'timer-456',
        session_key: 'abc123def456:ghi789jkl012:mno345pqr678', // Valid: 3 segments, alphanumeric
        timer_id: 'valid-timer',
        fire_at_ms: BigInt(Date.now() - 1000),
        status: 'pending',
      };

      const mockEvent = {
        id: 'event-123',
        session_key: 'abc123def456:ghi789jkl012:mno345pqr678',
        seq: 1,
        type: 'timer',
        payload: { timer_id: 'valid-timer' },
        created_at: new Date(),
      };

      vi.mocked(timerStore.findDueTimers).mockResolvedValue([validTimer] as never);
      vi.mocked(eventStore.getNextSeq).mockResolvedValue(1);
      vi.mocked(eventStore.create).mockResolvedValue(mockEvent as never);

      const worker = new TimerWorker(
        timerStore,
        eventStore,
        eventQueue,
        { pollIntervalMs: 1000, batchSize: 10 },
        logger,
      );

      // Act
      worker.start();
      await worker.pollAndPromote();
      worker.stop();

      // Assert: Valid timer should be promoted
      expect(timerStore.markPromoted).toHaveBeenCalledWith('timer-456');
      expect(timerStore.markCancelled).not.toHaveBeenCalled();
      expect(eventStore.create).toHaveBeenCalled();
      expect(eventQueue.enqueue).toHaveBeenCalledWith(mockEvent);
    });
  });
});
