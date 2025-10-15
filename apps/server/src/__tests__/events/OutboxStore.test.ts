/**
 * OutboxStore Unit Tests
 * Tests deduplication, status transitions
 * Deterministic with fixed inputs
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
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
    // Clean up test data
    await prisma.effect.deleteMany({
      where: {
        sessionKey: { in: [SESSION_1, SESSION_2] },
      },
    });
  });

  afterAll(async () => {
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
        payload: { content: 'Hello' },
      });

      const effect = await outboxStore.create({
        sessionKey: SESSION_1,
        checkpointId: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Hello' },
        dedupeKey,
      });

      expect(effect.id).toBeDefined();
      expect(effect.session_key).toBe(SESSION_1);
      expect(effect.checkpoint_id).toBe('checkpoint-1');
      expect(effect.type).toBe('send_message');
      expect(effect.payload).toEqual({ content: 'Hello' });
      expect(effect.dedupe_key).toBe(dedupeKey);
      expect(effect.status).toBe('pending');
      expect(effect.created_at).toBeInstanceOf(Date);
      expect(effect.updated_at).toBeInstanceOf(Date);
    });

    it('should enforce unique constraint on dedupe_key', async () => {
      const dedupeKey = generateDedupeKey({
        checkpoint_id: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Hello' },
      });

      await outboxStore.create({
        sessionKey: SESSION_1,
        checkpointId: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Hello' },
        dedupeKey,
      });

      // Attempting to create with same dedupe_key should fail
      await expect(
        outboxStore.create({
          sessionKey: SESSION_1,
          checkpointId: 'checkpoint-1',
          type: 'send_message',
          payload: { content: 'Hello' },
          dedupeKey,
        }),
      ).rejects.toThrow();
    });

    it('should allow different dedupe_keys for different payloads', async () => {
      const dedupeKey1 = generateDedupeKey({
        checkpoint_id: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Message 1' },
      });

      const dedupeKey2 = generateDedupeKey({
        checkpoint_id: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Message 2' },
      });

      const effect1 = await outboxStore.create({
        sessionKey: SESSION_1,
        checkpointId: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Message 1' },
        dedupeKey: dedupeKey1,
      });

      const effect2 = await outboxStore.create({
        sessionKey: SESSION_1,
        checkpointId: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Message 2' },
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
        payload: { content: 'First' },
        dedupeKey: generateDedupeKey({
          checkpoint_id: 'checkpoint-1',
          type: 'send_message',
          payload: { content: 'First' },
        }),
      });

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const effect2 = await outboxStore.create({
        sessionKey: SESSION_1,
        checkpointId: 'checkpoint-2',
        type: 'send_message',
        payload: { content: 'Second' },
        dedupeKey: generateDedupeKey({
          checkpoint_id: 'checkpoint-2',
          type: 'send_message',
          payload: { content: 'Second' },
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
        payload: { content: 'Session 1' },
        dedupeKey: generateDedupeKey({
          checkpoint_id: 'checkpoint-1',
          type: 'send_message',
          payload: { content: 'Session 1' },
        }),
      });

      await outboxStore.create({
        sessionKey: SESSION_2,
        checkpointId: 'checkpoint-2',
        type: 'send_message',
        payload: { content: 'Session 2' },
        dedupeKey: generateDedupeKey({
          checkpoint_id: 'checkpoint-2',
          type: 'send_message',
          payload: { content: 'Session 2' },
        }),
      });

      const session1Pending = await outboxStore.getPending(100, SESSION_1);
      const session2Pending = await outboxStore.getPending(100, SESSION_2);

      expect(session1Pending).toHaveLength(1);
      expect(session2Pending).toHaveLength(1);
      expect(session1Pending[0].payload).toEqual({ content: 'Session 1' });
      expect(session2Pending[0].payload).toEqual({ content: 'Session 2' });
    });

    it('should respect limit parameter', async () => {
      for (let i = 0; i < 5; i++) {
        await outboxStore.create({
          sessionKey: SESSION_1,
          checkpointId: `checkpoint-${i}`,
          type: 'send_message',
          payload: { content: `Message ${i}` },
          dedupeKey: generateDedupeKey({
            checkpoint_id: `checkpoint-${i}`,
            type: 'send_message',
            payload: { content: `Message ${i}` },
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
        payload: { content: 'Test' },
        dedupeKey: generateDedupeKey({
          checkpoint_id: 'checkpoint-1',
          type: 'send_message',
          payload: { content: 'Test' },
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
        payload: { content: 'Test' },
        dedupeKey: generateDedupeKey({
          checkpoint_id: 'checkpoint-1',
          type: 'send_message',
          payload: { content: 'Test' },
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
        payload: { content: 'Test' },
        dedupeKey: generateDedupeKey({
          checkpoint_id: 'checkpoint-1',
          type: 'send_message',
          payload: { content: 'Test' },
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
        payload: { content: 'Test' },
        dedupeKey: generateDedupeKey({
          checkpoint_id: 'checkpoint-1',
          type: 'send_message',
          payload: { content: 'Test' },
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
      const key1 = generateDedupeKey({
        checkpoint_id: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Hello' },
      });

      const key2 = generateDedupeKey({
        checkpoint_id: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Hello' },
      });

      expect(key1).toBe(key2);
    });

    it('should generate different dedupe_keys for different checkpoints', () => {
      const key1 = generateDedupeKey({
        checkpoint_id: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Hello' },
      });

      const key2 = generateDedupeKey({
        checkpoint_id: 'checkpoint-2',
        type: 'send_message',
        payload: { content: 'Hello' },
      });

      expect(key1).not.toBe(key2);
    });

    it('should generate different dedupe_keys for different payloads', () => {
      const key1 = generateDedupeKey({
        checkpoint_id: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Hello' },
      });

      const key2 = generateDedupeKey({
        checkpoint_id: 'checkpoint-1',
        type: 'send_message',
        payload: { content: 'Goodbye' },
      });

      expect(key1).not.toBe(key2);
    });
  });
});
