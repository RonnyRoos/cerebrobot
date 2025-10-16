/**
 * EventQueue Unit Tests
 * Tests sequential per-session processing and concurrent cross-session processing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventQueue } from '../../events/events/EventQueue.js';
import type { Event } from '../../events/events/types.js';
import { SessionKeySchema } from '../../events/types/events.schema.js';

describe('EventQueue', () => {
  let eventQueue: EventQueue;
  const SESSION_KEY_A = SessionKeySchema.parse('user1:agent1:thread1');
  const SESSION_KEY_B = SessionKeySchema.parse('user2:agent2:thread2');

  beforeEach(() => {
    eventQueue = new EventQueue(10); // Fast interval for tests
  });

  afterEach(() => {
    eventQueue.stop();
  });

  const createEvent = (sessionKey: string, seq: number, text: string): Event => ({
    id: `event-${sessionKey}-${seq}`,
    session_key: sessionKey as typeof SESSION_KEY_A,
    seq,
    type: 'user_message',
    payload: { text, requestId: crypto.randomUUID() },
    created_at: new Date(),
  });

  describe('enqueue', () => {
    it('should enqueue event and resolve when processed', async () => {
      const processed: string[] = [];
      const processor = vi.fn(async (event: Event) => {
        processed.push(event.id);
      });

      eventQueue.start(processor);

      const event = createEvent(SESSION_KEY_A, 1, 'hello');
      await eventQueue.enqueue(event);

      expect(processed).toContain(event.id);
      expect(processor).toHaveBeenCalledWith(event);
    });

    it('should process events sequentially for same session', async () => {
      const processOrder: number[] = [];
      const processor = vi.fn(async (event: Event) => {
        processOrder.push(event.seq);
        await new Promise((resolve) => setTimeout(resolve, 20)); // Simulate work
      });

      eventQueue.start(processor);

      // Enqueue 3 events for same session rapidly
      const promises = [
        eventQueue.enqueue(createEvent(SESSION_KEY_A, 1, 'first')),
        eventQueue.enqueue(createEvent(SESSION_KEY_A, 2, 'second')),
        eventQueue.enqueue(createEvent(SESSION_KEY_A, 3, 'third')),
      ];

      await Promise.all(promises);

      // Should process in order
      expect(processOrder).toEqual([1, 2, 3]);
    });

    it('should process events concurrently for different sessions', async () => {
      const startTimes: Record<string, number> = {};
      const processor = vi.fn(async (event: Event) => {
        startTimes[event.id] = Date.now();
        await new Promise((resolve) => setTimeout(resolve, 50)); // Simulate work
      });

      eventQueue.start(processor);

      const eventA = createEvent(SESSION_KEY_A, 1, 'session A');
      const eventB = createEvent(SESSION_KEY_B, 1, 'session B');

      const start = Date.now();
      await Promise.all([eventQueue.enqueue(eventA), eventQueue.enqueue(eventB)]);
      const elapsed = Date.now() - start;

      // Both should start within 20ms of each other (concurrent)
      const timeDiff = Math.abs(startTimes[eventA.id] - startTimes[eventB.id]);
      expect(timeDiff).toBeLessThan(20);

      // Total time should be ~50ms (concurrent), not 100ms (sequential)
      expect(elapsed).toBeLessThan(80);
    });
  });

  describe('session isolation', () => {
    it('should maintain separate queues per session', async () => {
      const sessionAEvents: number[] = [];
      const sessionBEvents: number[] = [];

      const processor = vi.fn(async (event: Event) => {
        if (event.session_key === SESSION_KEY_A) {
          sessionAEvents.push(event.seq);
        } else {
          sessionBEvents.push(event.seq);
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      eventQueue.start(processor);

      // Interleave events from both sessions
      await Promise.all([
        eventQueue.enqueue(createEvent(SESSION_KEY_A, 1, 'A1')),
        eventQueue.enqueue(createEvent(SESSION_KEY_B, 1, 'B1')),
        eventQueue.enqueue(createEvent(SESSION_KEY_A, 2, 'A2')),
        eventQueue.enqueue(createEvent(SESSION_KEY_B, 2, 'B2')),
      ]);

      // Each session maintains order
      expect(sessionAEvents).toEqual([1, 2]);
      expect(sessionBEvents).toEqual([1, 2]);
    });
  });

  describe('error handling', () => {
    it('should reject promise when processor throws error', async () => {
      const processor = vi.fn(async () => {
        throw new Error('Processing failed');
      });

      eventQueue.start(processor);

      const event = createEvent(SESSION_KEY_A, 1, 'will fail');
      await expect(eventQueue.enqueue(event)).rejects.toThrow('Processing failed');
    });

    it('should continue processing other sessions after error in one session', async () => {
      const processed: string[] = [];
      const processor = vi.fn(async (event: Event) => {
        if (event.session_key === SESSION_KEY_A) {
          throw new Error('Session A failed');
        }
        processed.push(event.id);
      });

      eventQueue.start(processor);

      const eventA = createEvent(SESSION_KEY_A, 1, 'will fail');
      const eventB = createEvent(SESSION_KEY_B, 1, 'will succeed');

      await expect(eventQueue.enqueue(eventA)).rejects.toThrow();
      await eventQueue.enqueue(eventB);

      expect(processed).toContain(eventB.id);
    });
  });

  describe('lifecycle', () => {
    it('should not process events before start()', async () => {
      const processor = vi.fn();
      const event = createEvent(SESSION_KEY_A, 1, 'before start');

      // Enqueue without starting - promise should not resolve quickly
      const promise = eventQueue.enqueue(event);

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(processor).not.toHaveBeenCalled();

      // Start processing
      eventQueue.start(processor);
      await promise;

      expect(processor).toHaveBeenCalledWith(event);
    });

    it('should throw error when starting twice', () => {
      const processor = vi.fn();
      eventQueue.start(processor);

      expect(() => eventQueue.start(processor)).toThrow('EventQueue already started');
    });

    it('should stop processing after stop()', async () => {
      const processor = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      eventQueue.start(processor);
      eventQueue.stop();

      const callCount = processor.mock.calls.length;

      // Enqueue after stop
      const event = createEvent(SESSION_KEY_A, 1, 'after stop');
      const promise = eventQueue.enqueue(event);

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should not have processed new event
      expect(processor.mock.calls.length).toBe(callCount);

      // But can restart
      eventQueue.start(processor);
      await promise;
      expect(processor).toHaveBeenCalledWith(event);
    });
  });

  describe('monitoring', () => {
    it('should track queue depth per session', async () => {
      const processor = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100)); // Slow processing
      });

      eventQueue.start(processor);

      // Enqueue multiple events rapidly (don't await)
      void eventQueue.enqueue(createEvent(SESSION_KEY_A, 1, 'A1'));
      void eventQueue.enqueue(createEvent(SESSION_KEY_A, 2, 'A2'));
      void eventQueue.enqueue(createEvent(SESSION_KEY_B, 1, 'B1'));

      await new Promise((resolve) => setTimeout(resolve, 20)); // Let them queue up

      expect(eventQueue.getQueueDepth(SESSION_KEY_A)).toBeGreaterThan(0);
      expect(eventQueue.getTotalQueueDepth()).toBeGreaterThan(0);
    });

    it('should report started state', () => {
      expect(eventQueue.isStarted()).toBe(false);

      eventQueue.start(vi.fn());
      expect(eventQueue.isStarted()).toBe(true);

      eventQueue.stop();
      expect(eventQueue.isStarted()).toBe(false);
    });
  });
});
