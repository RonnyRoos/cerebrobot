/**
 * Multi-Session Isolation Unit Tests (User Story 3)
 * Tests that events, effects, and processing are strictly isolated by SESSION_KEY
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { randomUUID } from 'crypto';
import { EventQueue } from '../../events/events/EventQueue.js';
import { EffectRunner } from '../../events/effects/EffectRunner.js';
import type { OutboxStore } from '../../events/effects/OutboxStore.js';
import type { SessionProcessor } from '../../events/session/SessionProcessor.js';
import type { Event } from '../../events/events/types.js';
import type { Effect } from '../../events/effects/types.js';
import { SessionKeySchema } from '../../events/types/events.schema.js';

describe('Multi-Session Isolation (User Story 3)', () => {
  let eventQueue: EventQueue;
  let effectRunner: EffectRunner;
  let mockOutboxStore: OutboxStore;
  let mockSessionProcessor: SessionProcessor;
  let processedEvents: Map<string, Event[]>;
  let deliveredEffects: Map<string, Effect[]>;

  const SESSION_1 = SessionKeySchema.parse('user1:agent1:thread1');
  const SESSION_2 = SessionKeySchema.parse('user2:agent2:thread2');

  beforeEach(() => {
    processedEvents = new Map();
    deliveredEffects = new Map();

    // Mock OutboxStore
    mockOutboxStore = {
      create: vi.fn(async (effect) => ({
        ...effect,
        id: randomUUID(),
        status: 'pending' as const,
        created_at: new Date(),
        updated_at: new Date(),
      })),
      getPending: vi.fn(async () => []),
      updateStatus: vi.fn(async (id: string) => ({
        id,
        session_key: SESSION_1,
        checkpoint_id: 'ckpt-1',
        type: 'send_message' as const,
        payload: { content: 'test', requestId: randomUUID(), isFinal: true },
        dedupe_key: 'dedupe-1',
        status: 'completed' as const,
        created_at: new Date(),
        updated_at: new Date(),
      })),
    } as unknown as OutboxStore;

    // Mock SessionProcessor that tracks which sessions it processes
    mockSessionProcessor = {
      processEvent: vi.fn(async (event: Event) => {
        const sessionKey = event.session_key;
        if (!processedEvents.has(sessionKey)) {
          processedEvents.set(sessionKey, []);
        }
        processedEvents.get(sessionKey)!.push(event);
      }),
    } as unknown as SessionProcessor;

    // Create EventQueue
    eventQueue = new EventQueue(10); // intervalMs

    // Start EventQueue with processor function
    eventQueue.start(async (event: Event) => {
      await mockSessionProcessor.processEvent(event);
    });

    // Create EffectRunner
    effectRunner = new EffectRunner(mockOutboxStore, { pollIntervalMs: 10 });

    // Start EffectRunner with handler that tracks deliveries per session
    effectRunner.start(async (effect: Effect) => {
      const sessionKey = effect.session_key;
      if (!deliveredEffects.has(sessionKey)) {
        deliveredEffects.set(sessionKey, []);
      }
      deliveredEffects.get(sessionKey)!.push(effect);
      return true;
    });
  });

  afterEach(() => {
    eventQueue.stop();
    effectRunner.stop();
  });

  it('should process events for different sessions independently', async () => {
    // Create events for two different sessions
    const event1 = createEvent(SESSION_1, 'Message from session 1');
    const event2 = createEvent(SESSION_2, 'Message from session 2');
    const event3 = createEvent(SESSION_1, 'Another message from session 1');

    // Enqueue events
    eventQueue.enqueue(event1);
    eventQueue.enqueue(event2);
    eventQueue.enqueue(event3);

    // Wait for processing
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify each session processed its own events
    expect(processedEvents.has(SESSION_1)).toBe(true);
    expect(processedEvents.has(SESSION_2)).toBe(true);

    const session1Events = processedEvents.get(SESSION_1)!;
    const session2Events = processedEvents.get(SESSION_2)!;

    // Session 1 should have 2 events
    expect(session1Events.length).toBe(2);
    expect(session1Events[0].payload.text).toBe('Message from session 1');
    expect(session1Events[1].payload.text).toBe('Another message from session 1');

    // Session 2 should have 1 event
    expect(session2Events.length).toBe(1);
    expect(session2Events[0].payload.text).toBe('Message from session 2');
  });

  it('should deliver effects only to correct session', async () => {
    const effect1 = createMockEffect('effect-1', SESSION_1, 'Response for session 1');
    const effect2 = createMockEffect('effect-2', SESSION_2, 'Response for session 2');

    // Mock getPending to return effects for both sessions
    vi.mocked(mockOutboxStore.getPending).mockResolvedValue([effect1, effect2]);

    // Process effects
    await effectRunner.processEffects();

    // Verify effects were delivered to their respective sessions
    expect(deliveredEffects.has(SESSION_1)).toBe(true);
    expect(deliveredEffects.has(SESSION_2)).toBe(true);

    // Session 1 should receive only its effect
    const session1Effects = deliveredEffects.get(SESSION_1)!;
    expect(session1Effects.length).toBe(1);
    expect(session1Effects[0].id).toBe('effect-1');

    // Session 2 should receive only its effect
    const session2Effects = deliveredEffects.get(SESSION_2)!;
    expect(session2Effects.length).toBe(1);
    expect(session2Effects[0].id).toBe('effect-2');
  });

  it('should maintain separate event queues per session', async () => {
    // Create multiple events for each session
    const events = [
      createEvent(SESSION_1, 'S1-M1'),
      createEvent(SESSION_2, 'S2-M1'),
      createEvent(SESSION_1, 'S1-M2'),
      createEvent(SESSION_2, 'S2-M2'),
      createEvent(SESSION_1, 'S1-M3'),
    ];

    // Enqueue all events
    events.forEach((e) => eventQueue.enqueue(e));

    // Wait for processing
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Verify events processed in order within each session
    const session1Events = processedEvents.get(SESSION_1)!;
    expect(session1Events.map((e) => e.payload.text)).toEqual(['S1-M1', 'S1-M2', 'S1-M3']);

    const session2Events = processedEvents.get(SESSION_2)!;
    expect(session2Events.map((e) => e.payload.text)).toEqual(['S2-M1', 'S2-M2']);
  });

  it('should not allow cross-session event contamination', async () => {
    // Create events with different session keys
    const event1 = createEvent(SESSION_1, 'Private message for session 1');
    const event2 = createEvent(SESSION_2, 'Private message for session 2');

    eventQueue.enqueue(event1);
    eventQueue.enqueue(event2);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify no cross-contamination
    const session1Events = processedEvents.get(SESSION_1)!;
    const session2Events = processedEvents.get(SESSION_2)!;

    // Session 1 should only see its own event
    expect(session1Events.every((e) => e.session_key === SESSION_1)).toBe(true);

    // Session 2 should only see its own event
    expect(session2Events.every((e) => e.session_key === SESSION_2)).toBe(true);

    // Verify no overlap
    const session1Ids = new Set(session1Events.map((e) => e.id));
    const session2Ids = new Set(session2Events.map((e) => e.id));
    const intersection = [...session1Ids].filter((id) => session2Ids.has(id));
    expect(intersection.length).toBe(0);
  });

  it('should handle concurrent session processing without interference', async () => {
    // Create many events for both sessions to simulate concurrent load
    const events: Event[] = [];
    for (let i = 0; i < 10; i++) {
      events.push(createEvent(SESSION_1, `Session 1 - Message ${i}`));
      events.push(createEvent(SESSION_2, `Session 2 - Message ${i}`));
    }

    // Enqueue all at once
    events.forEach((e) => eventQueue.enqueue(e));

    // Wait for all processing
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Verify counts
    expect(processedEvents.get(SESSION_1)!.length).toBe(10);
    expect(processedEvents.get(SESSION_2)!.length).toBe(10);

    // Verify ordering within each session
    const session1Events = processedEvents.get(SESSION_1)!;
    for (let i = 0; i < 10; i++) {
      expect(session1Events[i].payload.text).toBe(`Session 1 - Message ${i}`);
    }

    const session2Events = processedEvents.get(SESSION_2)!;
    for (let i = 0; i < 10; i++) {
      expect(session2Events[i].payload.text).toBe(`Session 2 - Message ${i}`);
    }
  });
});

// Helper functions
function createEvent(sessionKey: string, text: string): Event {
  return {
    id: randomUUID(),
    session_key: sessionKey as ReturnType<typeof SessionKeySchema.parse>,
    seq: 1,
    type: 'user_message',
    payload: { text, requestId: randomUUID() },
    created_at: new Date(),
  };
}

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
