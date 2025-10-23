/**
 * OutboxStore - PostgreSQL persistence for effects (transactional outbox pattern)
 *
 * Effects are agent outputs awaiting execution (send_message, schedule_timer).
 * Supports deduplication via dedupe_key and status tracking.
 */

import { PrismaClient } from '@prisma/client';
import type { SessionKey } from '../types/events.schema';
import { CreateEffect, Effect, EffectSchema, EffectStatus } from '../types/effects.schema';

export class OutboxStore {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Create effects atomically (typically within a transaction)
   * @throws if effect with same dedupe_key already exists
   */
  async createEffects(effects: CreateEffect[]): Promise<Effect[]> {
    if (effects.length === 0) return [];

    const created = await this.prisma.$transaction(
      effects.map((effect) =>
        this.prisma.effect.create({
          data: {
            sessionKey: effect.session_key,
            checkpointId: effect.checkpoint_id,
            type: effect.type,
            payload: effect.payload as object,
            dedupeKey: effect.dedupe_key,
            status: 'pending',
            attemptCount: 0,
          },
        }),
      ),
    );

    return created.map((e) => this.mapFromPrisma(e));
  }

  /**
   * Poll for pending effects ready for execution
   */
  async pollPending(options?: { limit?: number; types?: string[] }): Promise<Effect[]> {
    const effects = await this.prisma.effect.findMany({
      where: {
        status: 'pending',
        ...(options?.types && { type: { in: options.types } }),
      },
      orderBy: { createdAt: 'asc' },
      ...(options?.limit && { take: options.limit }),
    });

    return effects.map((e) => this.mapFromPrisma(e));
  }

  /**
   * Update effect status and attempt tracking
   */
  async updateStatus(
    effectId: string,
    status: EffectStatus,
    options?: { incrementAttempt?: boolean },
  ): Promise<Effect> {
    const updated = await this.prisma.effect.update({
      where: { id: effectId },
      data: {
        status,
        ...(options?.incrementAttempt && {
          attemptCount: { increment: 1 },
          lastAttemptAt: new Date(),
        }),
      },
    });

    return this.mapFromPrisma(updated);
  }

  /**
   * Clear all pending effects for a session (used on user message)
   */
  async clearPendingBySession(sessionKey: SessionKey): Promise<number> {
    const result = await this.prisma.effect.updateMany({
      where: {
        sessionKey,
        status: 'pending',
      },
      data: {
        status: 'failed', // Mark as failed rather than delete for audit trail
      },
    });

    return result.count;
  }

  /**
   * Check if dedupe_key exists
   */
  async existsByDedupeKey(dedupeKey: string): Promise<boolean> {
    const count = await this.prisma.effect.count({
      where: { dedupeKey },
    });
    return count > 0;
  }

  private mapFromPrisma(prismaEffect: {
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
  }): Effect {
    return EffectSchema.parse({
      id: prismaEffect.id,
      session_key: prismaEffect.sessionKey,
      checkpoint_id: prismaEffect.checkpointId,
      type: prismaEffect.type,
      payload: prismaEffect.payload,
      dedupe_key: prismaEffect.dedupeKey,
      status: prismaEffect.status,
      created_at: prismaEffect.createdAt,
      updated_at: prismaEffect.updatedAt,
      attempt_count: prismaEffect.attemptCount,
      last_attempt_at: prismaEffect.lastAttemptAt,
    });
  }
}
