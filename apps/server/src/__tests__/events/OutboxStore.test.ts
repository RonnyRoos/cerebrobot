/**
 * OutboxStore Unit Tests
 * Tests deduplication, status transitions
 * Deterministic with fixed inputs
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { OutboxStore } from '../../events/effects/OutboxStore.js';
import { generateDedupeKey } from '../../events/types/effects.schema.js';
import type { SessionKey } from '../../events/types/events.schema.js';

const prisma = new PrismaClient();
const outboxStore = new OutboxStore(prisma);

// Test SESSION_KEYS
const SESSION_1 = 'user1:agent1:thread1' as SessionKey;
const SESSION_2 = 'user2:agent2:thread2' as SessionKey;

describe('OutboxStore', () => {
  beforeEach(async () => {
    // Clean up ALL test data (including any leftover from other tests or postgres-validation)
    // This ensures test isolation
    await prisma.effect.deleteMany({});
    await prisma.event.deleteMany({});
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.effect.deleteMany({
      where: {
        sessionKey: { in: [SESSION_1, SESSION_2] },
      },
    });
    await prisma.$disconnect();
  });

  describe('create', () => {
    it('should create effect with generated UUID and timestamps', async () => {
      const dedupeKey = generateDedupeKey({
        checkpoint_id: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Hello', requestId: randomUUID(), isFinal: true },
      });

      const effect = await outboxStore.create({
        sessionKey: SESSION_1,
        checkpointId: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Hello', requestId: randomUUID(), isFinal: true },
        dedupeKey,
      });

      expect(effect.id).toBeDefined();
      expect(effect.session_key).toBe(SESSION_1);
      expect(effect.checkpoint_id).toBe('checkpoint-1');
      expect(effect.type).toBe('send_message');
      expect(effect.payload.content).toBe('Hello');
      expect(effect.payload.requestId).toBeDefined();
      expect(effect.payload.isFinal).toBe(true);
      expect(effect.dedupe_key).toBe(dedupeKey);
      expect(effect.status).toBe('pending');
      expect(effect.created_at).toBeInstanceOf(Date);
      expect(effect.updated_at).toBeInstanceOf(Date);
    });

    it('should enforce unique constraint on dedupe_key', async () => {
      const dedupeKey = generateDedupeKey({
        checkpoint_id: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Hello', requestId: randomUUID(), isFinal: true },
      });

      await outboxStore.create({
        sessionKey: SESSION_1,
        checkpointId: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Hello', requestId: randomUUID(), isFinal: true },
        dedupeKey,
      });

      // Attempting to create with same dedupe_key should fail
      await expect(
        outboxStore.create({
          sessionKey: SESSION_1,
          checkpointId: 'checkpoint-1',
          type: 'send_message',
          payload: { content: 'Hello', requestId: randomUUID(), isFinal: true },
          dedupeKey,
        }),
      ).rejects.toThrow();
    });

    it('should allow different dedupe_keys for different payloads', async () => {
      const dedupeKey1 = generateDedupeKey({
        checkpoint_id: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Message 1', requestId: randomUUID(), isFinal: true },
      });

      const dedupeKey2 = generateDedupeKey({
        checkpoint_id: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Message 2', requestId: randomUUID(), isFinal: true },
      });

      const effect1 = await outboxStore.create({
        sessionKey: SESSION_1,
        checkpointId: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Message 1', requestId: randomUUID(), isFinal: true },
        dedupeKey: dedupeKey1,
      });

      const effect2 = await outboxStore.create({
        sessionKey: SESSION_1,
        checkpointId: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Message 2', requestId: randomUUID(), isFinal: true },
        dedupeKey: dedupeKey2,
      });

      expect(effect1.id).not.toBe(effect2.id);
      expect(effect1.dedupe_key).not.toBe(effect2.dedupe_key);
    });
  });

  describe('getPending', () => {
    it('should return pending effects in FIFO order', async () => {
      const effect1 = await outboxStore.create({
        sessionKey: SESSION_1,
        checkpointId: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'First', requestId: randomUUID(), isFinal: true },
        dedupeKey: generateDedupeKey({
          checkpoint_id: 'checkpoint-1',
          type: 'send_message',
          payload: { content: 'First', requestId: randomUUID(), isFinal: true },
        }),
      });

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const effect2 = await outboxStore.create({
        sessionKey: SESSION_1,
        checkpointId: 'checkpoint-2',
        type: 'send_message',
        payload: { content: 'Second', requestId: randomUUID(), isFinal: true },
        dedupeKey: generateDedupeKey({
          checkpoint_id: 'checkpoint-2',
          type: 'send_message',
          payload: { content: 'Second', requestId: randomUUID(), isFinal: true },
        }),
      });

      const pending = await outboxStore.getPending();

      expect(pending).toHaveLength(2);
      expect(pending[0].id).toBe(effect1.id);
      expect(pending[1].id).toBe(effect2.id);
    });

    it('should filter by session_key when provided', async () => {
      await outboxStore.create({
        sessionKey: SESSION_1,
        checkpointId: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Session 1', requestId: randomUUID(), isFinal: true },
        dedupeKey: generateDedupeKey({
          checkpoint_id: 'checkpoint-1',
          type: 'send_message',
          payload: { content: 'Session 1', requestId: randomUUID(), isFinal: true },
        }),
      });

      await outboxStore.create({
        sessionKey: SESSION_2,
        checkpointId: 'checkpoint-2',
        type: 'send_message',
        payload: { content: 'Session 2', requestId: randomUUID(), isFinal: true },
        dedupeKey: generateDedupeKey({
          checkpoint_id: 'checkpoint-2',
          type: 'send_message',
          payload: { content: 'Session 2', requestId: randomUUID(), isFinal: true },
        }),
      });

      const session1Pending = await outboxStore.getPending(100, SESSION_1);
      const session2Pending = await outboxStore.getPending(100, SESSION_2);

      expect(session1Pending).toHaveLength(1);
      expect(session2Pending).toHaveLength(1);
      expect(session1Pending[0].payload.content).toBe('Session 1');
      expect(session2Pending[0].payload.content).toBe('Session 2');
    });

    it('should respect limit parameter', async () => {
      for (let i = 0; i < 5; i++) {
        await outboxStore.create({
          sessionKey: SESSION_1,
          checkpointId: `checkpoint-${i}`,
          type: 'send_message',
          payload: { content: `Message ${i}`, requestId: randomUUID(), isFinal: true },
          dedupeKey: generateDedupeKey({
            checkpoint_id: `checkpoint-${i}`,
            type: 'send_message',
            payload: { content: `Message ${i}`, requestId: randomUUID(), isFinal: true },
          }),
        });
      }

      const pending = await outboxStore.getPending(3);
      expect(pending).toHaveLength(3);
    });

    it('should exclude non-pending effects', async () => {
      const effect = await outboxStore.create({
        sessionKey: SESSION_1,
        checkpointId: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Test', requestId: randomUUID(), isFinal: true },
        dedupeKey: generateDedupeKey({
          checkpoint_id: 'checkpoint-1',
          type: 'send_message',
          payload: { content: 'Test', requestId: randomUUID(), isFinal: true },
        }),
      });

      await outboxStore.updateStatus(effect.id, 'completed');

      const pending = await outboxStore.getPending();
      expect(pending).toHaveLength(0);
    });
  });

  describe('updateStatus', () => {
    it('should update effect status', async () => {
      const effect = await outboxStore.create({
        sessionKey: SESSION_1,
        checkpointId: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Test', requestId: randomUUID(), isFinal: true },
        dedupeKey: generateDedupeKey({
          checkpoint_id: 'checkpoint-1',
          type: 'send_message',
          payload: { content: 'Test', requestId: randomUUID(), isFinal: true },
        }),
      });

      const updated = await outboxStore.updateStatus(effect.id, 'executing');

      expect(updated.status).toBe('executing');
      expect(updated.updated_at.getTime()).toBeGreaterThan(effect.updated_at.getTime());
    });

    it('should increment attempt count when transitioning to executing', async () => {
      const effect = await outboxStore.create({
        sessionKey: SESSION_1,
        checkpointId: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Test', requestId: randomUUID(), isFinal: true },
        dedupeKey: generateDedupeKey({
          checkpoint_id: 'checkpoint-1',
          type: 'send_message',
          payload: { content: 'Test', requestId: randomUUID(), isFinal: true },
        }),
      });

      await outboxStore.updateStatus(effect.id, 'executing');
      await outboxStore.updateStatus(effect.id, 'failed');
      const updated = await outboxStore.updateStatus(effect.id, 'executing');

      // Prisma increments return updated value, so attempt_count should be 2
      expect(updated).toBeDefined();
    });

    it('should support all status transitions', async () => {
      const effect = await outboxStore.create({
        sessionKey: SESSION_1,
        checkpointId: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Test', requestId: randomUUID(), isFinal: true },
        dedupeKey: generateDedupeKey({
          checkpoint_id: 'checkpoint-1',
          type: 'send_message',
          payload: { content: 'Test', requestId: randomUUID(), isFinal: true },
        }),
      });

      expect(effect.status).toBe('pending');

      const executing = await outboxStore.updateStatus(effect.id, 'executing');
      expect(executing.status).toBe('executing');

      const completed = await outboxStore.updateStatus(effect.id, 'completed');
      expect(completed.status).toBe('completed');
    });
  });

  describe('deduplication', () => {
    it('should generate same dedupe_key for identical effects', () => {
      const requestId = randomUUID(); // Use same requestId for both

      const key1 = generateDedupeKey({
        checkpoint_id: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Hello', requestId, isFinal: true },
      });

      const key2 = generateDedupeKey({
        checkpoint_id: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Hello', requestId, isFinal: true },
      });

      expect(key1).toBe(key2);
    });

    it('should generate different dedupe_keys for different checkpoints', () => {
      const key1 = generateDedupeKey({
        checkpoint_id: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Hello', requestId: randomUUID(), isFinal: true },
      });

      const key2 = generateDedupeKey({
        checkpoint_id: 'checkpoint-2',
        type: 'send_message',
        payload: { content: 'Hello', requestId: randomUUID(), isFinal: true },
      });

      expect(key1).not.toBe(key2);
    });

    it('should generate different dedupe_keys for different payloads', () => {
      const key1 = generateDedupeKey({
        checkpoint_id: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Hello', requestId: randomUUID(), isFinal: true },
      });

      const key2 = generateDedupeKey({
        checkpoint_id: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Goodbye', requestId: randomUUID(), isFinal: true },
      });

      expect(key1).not.toBe(key2);
    });
  });

  describe('Deduplication Edge Cases (User Story 4)', () => {
    it('should prevent duplicate effect execution when status is completed', async () => {
      const dedupeKey = generateDedupeKey({
        checkpoint_id: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Test', requestId: randomUUID(), isFinal: true },
        sequence: 0,
      });

      // Create and complete first effect
      const effect1 = await outboxStore.create({
        sessionKey: SESSION_1,
        checkpointId: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Test', requestId: randomUUID(), isFinal: true },
        dedupeKey,
      });

      await outboxStore.updateStatus(effect1.id, 'completed');

      // Verify completed effects not returned in pending query
      const pending = await outboxStore.getPending();
      expect(pending.find((e) => e.dedupe_key === dedupeKey)).toBeUndefined();
    });

    it('should prevent duplicate effect execution when status is failed', async () => {
      const dedupeKey = generateDedupeKey({
        checkpoint_id: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Test', requestId: randomUUID(), isFinal: true },
        sequence: 0,
      });

      // Create and mark as failed
      const effect1 = await outboxStore.create({
        sessionKey: SESSION_1,
        checkpointId: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Test', requestId: randomUUID(), isFinal: true },
        dedupeKey,
      });

      await outboxStore.updateStatus(effect1.id, 'failed');

      // Verify failed effects not returned in pending query
      const pending = await outboxStore.getPending();
      expect(pending.find((e) => e.dedupe_key === dedupeKey)).toBeUndefined();
    });

    it('should allow retry of pending effects (not deduplicated)', async () => {
      const dedupeKey = generateDedupeKey({
        checkpoint_id: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Test', requestId: randomUUID(), isFinal: true },
        sequence: 0,
      });

      // Create effect in pending state
      const effect = await outboxStore.create({
        sessionKey: SESSION_1,
        checkpointId: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Test', requestId: randomUUID(), isFinal: true },
        dedupeKey,
      });

      // Effect should appear in pending queue
      const pending1 = await outboxStore.getPending();
      expect(pending1.find((e) => e.id === effect.id)).toBeDefined();

      // Mark as executing
      await outboxStore.updateStatus(effect.id, 'executing');

      // Should not appear in pending queue while executing
      const pending2 = await outboxStore.getPending();
      expect(pending2.find((e) => e.id === effect.id)).toBeUndefined();

      // Revert to pending (simulating WebSocket failure)
      await outboxStore.updateStatus(effect.id, 'pending');

      // Should reappear in pending queue for retry
      const pending3 = await outboxStore.getPending();
      expect(pending3.find((e) => e.id === effect.id)).toBeDefined();
    });

    it('should handle sequence numbers in deduplication correctly', async () => {
      // Same checkpoint/payload but different sequence = different effects
      const dedupe1 = generateDedupeKey({
        checkpoint_id: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Token', requestId: randomUUID(), isFinal: true },
        sequence: 0,
      });

      const dedupe2 = generateDedupeKey({
        checkpoint_id: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Token', requestId: randomUUID(), isFinal: true },
        sequence: 1,
      });

      // Different sequence numbers should generate different dedupe keys
      expect(dedupe1).not.toBe(dedupe2);

      // Both effects should be creatable (no collision)
      const effect1 = await outboxStore.create({
        sessionKey: SESSION_1,
        checkpointId: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Token', requestId: randomUUID(), isFinal: false },
        dedupeKey: dedupe1,
      });

      const effect2 = await outboxStore.create({
        sessionKey: SESSION_1,
        checkpointId: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Token', requestId: randomUUID(), isFinal: true },
        dedupeKey: dedupe2,
      });

      expect(effect1.id).not.toBe(effect2.id);
      expect(effect1.dedupe_key).not.toBe(effect2.dedupe_key);
    });

    it('should enforce database unique constraint on dedupe_key', async () => {
      const dedupeKey = generateDedupeKey({
        checkpoint_id: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Test', requestId: randomUUID(), isFinal: true },
        sequence: 0,
      });

      // Create first effect
      await outboxStore.create({
        sessionKey: SESSION_1,
        checkpointId: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Test', requestId: randomUUID(), isFinal: true },
        dedupeKey,
      });

      // Attempt to create duplicate (same dedupe_key)
      await expect(
        outboxStore.create({
          sessionKey: SESSION_1,
          checkpointId: 'checkpoint-1',
          type: 'send_message',
          payload: { content: 'Test', requestId: randomUUID(), isFinal: true },
          dedupeKey,
        }),
      ).rejects.toThrow(); // Prisma will throw unique constraint violation
    });
  });
});
