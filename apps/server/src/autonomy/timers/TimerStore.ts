/**
 * TimerStore - PostgreSQL persistence for timers
 *
 * Timers represent scheduled future actions that will be promoted to timer events.
 * Supports upsert by (session_key, timer_id) to prevent duplicates.
 */

import { PrismaClient } from '@prisma/client';
import type { SessionKey } from '../../events/types/events.schema.js';
import { Timer, TimerSchema, TimerStatus, UpsertTimer } from '../types/timers.schema';

export class TimerStore {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Upsert timer by (session_key, timer_id)
   * Replaces existing timer if present
   */
  async upsertTimer(timer: UpsertTimer): Promise<Timer> {
    const upserted = await this.prisma.timer.upsert({
      where: {
        sessionKey_timerId: {
          sessionKey: timer.session_key,
          timerId: timer.timer_id,
        },
      },
      create: {
        sessionKey: timer.session_key,
        timerId: timer.timer_id,
        fireAtMs: BigInt(timer.fire_at_ms),
        payload: timer.payload ?? null,
        status: 'pending',
      },
      update: {
        fireAtMs: BigInt(timer.fire_at_ms),
        payload: timer.payload ?? null,
        status: 'pending', // Reset status on update
      },
    });

    return this.mapFromPrisma(upserted);
  }

  /**
   * Find due timers (fire_at_ms <= before_ms)
   * Includes past-scheduled timers
   */
  async findDueTimers(beforeMs: number, limit?: number): Promise<Timer[]> {
    const timers = await this.prisma.timer.findMany({
      where: {
        status: 'pending',
        fireAtMs: { lte: BigInt(beforeMs) },
      },
      orderBy: { fireAtMs: 'asc' },
      ...(limit && { take: limit }),
    });

    return timers.map((t) => this.mapFromPrisma(t));
  }

  /**
   * Mark timer as promoted after creating timer event
   */
  async markPromoted(timerId: string): Promise<Timer> {
    const updated = await this.prisma.timer.update({
      where: { id: timerId },
      data: { status: 'promoted' },
    });

    return this.mapFromPrisma(updated);
  }

  /**
   * Cancel all pending timers for a session
   */
  async cancelBySession(sessionKey: SessionKey): Promise<number> {
    const result = await this.prisma.timer.updateMany({
      where: {
        sessionKey,
        status: 'pending',
      },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(), // Soft delete audit trail
      },
    });

    return result.count;
  }

  /**
   * Get timer by session_key and timer_id
   */
  async getTimer(sessionKey: SessionKey, timerId: string): Promise<Timer | null> {
    const timer = await this.prisma.timer.findUnique({
      where: {
        sessionKey_timerId: {
          sessionKey,
          timerId,
        },
      },
    });

    return timer ? this.mapFromPrisma(timer) : null;
  }

  private mapFromPrisma(prismaTimer: {
    id: string;
    sessionKey: string;
    timerId: string;
    fireAtMs: bigint;
    payload: unknown;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): Timer {
    return TimerSchema.parse({
      id: prismaTimer.id,
      session_key: prismaTimer.sessionKey,
      timer_id: prismaTimer.timerId,
      fire_at_ms: Number(prismaTimer.fireAtMs), // Convert BigInt to number
      payload: prismaTimer.payload,
      status: prismaTimer.status as TimerStatus,
      created_at: prismaTimer.createdAt,
      updated_at: prismaTimer.updatedAt,
    });
  }
}
