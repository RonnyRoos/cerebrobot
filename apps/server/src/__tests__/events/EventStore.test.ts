/**
 * EventStore Unit Tests
 * Tests sequence generation, session isolation, SESSION_KEY validation
 * Deterministic with fixed inputs
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { EventStore } from '../../events/events/EventStore.js';
import type { SessionKey } from '../../events/events/types.js';

const prisma = new PrismaClient();
const eventStore = new EventStore(prisma);

// Test SESSION_KEYS
const SESSION_1 = 'user1:agent1:thread1' as SessionKey;
const SESSION_2 = 'user2:agent2:thread2' as SessionKey;

describe('EventStore', () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.event.deleteMany({
      where: {
        sessionKey: { in: [SESSION_1, SESSION_2] },
      },
    });
  });

  afterAll(async () => {
    await prisma.event.deleteMany({
      where: {
        sessionKey: { in: [SESSION_1, SESSION_2] },
      },
    });
    await prisma.$disconnect();
  });

  describe('create', () => {
    it('should create event with generated UUID and timestamp', async () => {
      const event = await eventStore.create({
        sessionKey: SESSION_1,
        seq: 1,
        type: 'user_message',
        payload: { text: 'Hello world' },
      });

      expect(event.id).toBeDefined();
      expect(event.session_key).toBe(SESSION_1);
      expect(event.seq).toBe(1);
      expect(event.type).toBe('user_message');
      expect(event.payload).toEqual({ text: 'Hello world' });
      expect(event.created_at).toBeInstanceOf(Date);
    });

    it('should enforce unique constraint on (session_key, seq)', async () => {
      await eventStore.create({
        sessionKey: SESSION_1,
        seq: 1,
        type: 'user_message',
        payload: { text: 'First' },
      });

      // Attempting to create with same session_key + seq should fail
      await expect(
        eventStore.create({
          sessionKey: SESSION_1,
          seq: 1,
          type: 'user_message',
          payload: { text: 'Duplicate' },
        })
      ).rejects.toThrow();
    });
  });

  describe('getNextSeq', () => {
    it('should return 1 for new session', async () => {
      const nextSeq = await eventStore.getNextSeq(SESSION_1);
      expect(nextSeq).toBe(1);
    });

    it('should return max(seq) + 1 for existing session', async () => {
      await eventStore.create({
        sessionKey: SESSION_1,
        seq: 1,
        type: 'user_message',
        payload: { text: 'First' },
      });
      await eventStore.create({
        sessionKey: SESSION_1,
        seq: 2,
        type: 'user_message',
        payload: { text: 'Second' },
      });

      const nextSeq = await eventStore.getNextSeq(SESSION_1);
      expect(nextSeq).toBe(3);
    });

    it('should isolate sequences by session_key', async () => {
      await eventStore.create({
        sessionKey: SESSION_1,
        seq: 1,
        type: 'user_message',
        payload: { text: 'Session 1' },
      });
      await eventStore.create({
        sessionKey: SESSION_2,
        seq: 1,
        type: 'user_message',
        payload: { text: 'Session 2' },
      });

      expect(await eventStore.getNextSeq(SESSION_1)).toBe(2);
      expect(await eventStore.getNextSeq(SESSION_2)).toBe(2);
    });
  });

  describe('findBySession', () => {
    it('should return events ordered by sequence', async () => {
      await eventStore.create({
        sessionKey: SESSION_1,
        seq: 2,
        type: 'user_message',
        payload: { text: 'Second' },
      });
      await eventStore.create({
        sessionKey: SESSION_1,
        seq: 1,
        type: 'user_message',
        payload: { text: 'First' },
      });
      await eventStore.create({
        sessionKey: SESSION_1,
        seq: 3,
        type: 'user_message',
        payload: { text: 'Third' },
      });

      const events = await eventStore.findBySession(SESSION_1);

      expect(events).toHaveLength(3);
      expect(events[0].seq).toBe(1);
      expect(events[1].seq).toBe(2);
      expect(events[2].seq).toBe(3);
      expect(events[0].payload).toEqual({ text: 'First' });
    });

    it('should isolate events by session_key', async () => {
      await eventStore.create({
        sessionKey: SESSION_1,
        seq: 1,
        type: 'user_message',
        payload: { text: 'Session 1 message' },
      });
      await eventStore.create({
        sessionKey: SESSION_2,
        seq: 1,
        type: 'user_message',
        payload: { text: 'Session 2 message' },
      });

      const session1Events = await eventStore.findBySession(SESSION_1);
      const session2Events = await eventStore.findBySession(SESSION_2);

      expect(session1Events).toHaveLength(1);
      expect(session2Events).toHaveLength(1);
      expect(session1Events[0].payload).toEqual({ text: 'Session 1 message' });
      expect(session2Events[0].payload).toEqual({ text: 'Session 2 message' });
    });

    it('should return empty array for session with no events', async () => {
      const events = await eventStore.findBySession(SESSION_1);
      expect(events).toEqual([]);
    });
  });

  describe('SESSION_KEY validation', () => {
    it('should reject SESSION_KEY with missing colon separators', async () => {
      const invalidKey = 'user1agent1thread1' as SessionKey;
      
      await expect(
        eventStore.create({
          sessionKey: invalidKey,
          seq: 1,
          type: 'user_message',
          payload: { text: 'Test' },
        })
      ).rejects.toThrow();
    });

    it('should reject SESSION_KEY with empty components', async () => {
      const invalidKey = 'user1::thread1' as SessionKey;
      
      await expect(
        eventStore.create({
          sessionKey: invalidKey,
          seq: 1,
          type: 'user_message',
          payload: { text: 'Test' },
        })
      ).rejects.toThrow();
    });

    it('should reject SESSION_KEY with special characters', async () => {
      const invalidKey = 'user@1:agent#1:thread$1' as SessionKey;
      
      await expect(
        eventStore.create({
          sessionKey: invalidKey,
          seq: 1,
          type: 'user_message',
          payload: { text: 'Test' },
        })
      ).rejects.toThrow();
    });
  });
});
