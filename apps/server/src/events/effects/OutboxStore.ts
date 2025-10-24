/**
 * OutboxStore - PostgreSQL persistence for effects (transactional outbox pattern)
 * Implements effect lifecycle management with deduplication and status tracking
 */

import { PrismaClient } from '@prisma/client';
import type { SessionKey } from '../types/events.schema.js';
import type {
  CreateEffect,
  Effect,
  EffectStatus,
  EffectType,
  SendMessagePayload,
} from './types.js';
import { randomUUID } from 'crypto';

// Type for Prisma Effect model result
interface PrismaEffect {
  id: string;
  sessionKey: string;
  checkpointId: string;
  type: string;
  payload: unknown;
  dedupeKey: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  attemptCount: number;
  lastAttemptAt: Date | null;
}

export class OutboxStore {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Create a new effect (outbox entry)
   * Deduplication enforced by unique constraint on dedupe_key
   * @returns Created effect or throws if duplicate
   */
  async create(effect: CreateEffect & { status?: EffectStatus }): Promise<Effect> {
    const created = await this.prisma.effect.create({
      data: {
        id: randomUUID(),
        sessionKey: effect.sessionKey,
        checkpointId: effect.checkpointId,
        type: effect.type,
        payload: effect.payload as object, // Type assertion: payload is always serializable object
        dedupeKey: effect.dedupeKey,
        status: effect.status ?? 'pending', // Allow caller to specify status
        attemptCount: 0,
      },
    });

    return this.toDomainEffect(created);
  }

  /**
   * Get pending effects ordered by creation time (FIFO)
   * Optionally filter by session_key for targeted polling
   * @param limit Maximum number of effects to retrieve
   * @param sessionKey Optional session filter for reconnection scenarios
   */
  async getPending(limit = 100, sessionKey?: SessionKey): Promise<Effect[]> {
    const effects = await this.prisma.effect.findMany({
      where: {
        status: 'pending',
        ...(sessionKey ? { sessionKey } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    return effects.map((e) => this.toDomainEffect(e));
  }

  /**
   * Update effect status atomically
   * Increments attempt count and updates last_attempt_at on status change
   */
  async updateStatus(id: string, status: EffectStatus): Promise<Effect> {
    const updated = await this.prisma.effect.update({
      where: { id },
      data: {
        status,
        attemptCount: { increment: status === 'executing' ? 1 : 0 },
        lastAttemptAt: status === 'executing' ? new Date() : undefined,
      },
    });

    return this.toDomainEffect(updated);
  }

  /**
   * Clear all pending effects for a session (used on user message to cancel scheduled follow-ups)
   * @returns Number of effects deleted
   */
  async clearPendingBySession(sessionKey: SessionKey): Promise<number> {
    const result = await this.prisma.effect.deleteMany({
      where: {
        sessionKey,
        status: 'pending',
      },
    });

    return result.count;
  }

  /**
   * Check if effect with dedupe_key already completed (idempotency check)
   * @param dedupeKey The deduplication key to check
   * @returns true if effect with this dedupe_key is already completed
   */
  async isCompletedByDedupeKey(dedupeKey: string): Promise<boolean> {
    const effect = await this.prisma.effect.findFirst({
      where: { dedupeKey, status: 'completed' },
      select: { id: true },
    });

    return effect !== null;
  }

  /**
   * Convert Prisma model to domain Effect type
   * Handles Prisma's camelCase to schema's snake_case mapping
   */
  private toDomainEffect(prismaEffect: PrismaEffect): Effect {
    return {
      id: prismaEffect.id,
      session_key: prismaEffect.sessionKey as SessionKey,
      checkpoint_id: prismaEffect.checkpointId,
      type: prismaEffect.type as EffectType,
      payload: prismaEffect.payload as SendMessagePayload,
      dedupe_key: prismaEffect.dedupeKey,
      status: prismaEffect.status as EffectStatus,
      created_at: prismaEffect.createdAt,
      updated_at: prismaEffect.updatedAt,
    };
  }
}
