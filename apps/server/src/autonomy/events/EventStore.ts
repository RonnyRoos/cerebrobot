/**
 * EventStore - PostgreSQL persistence for events
 *
 * Events are immutable input records (user messages, timer firings, tool results).
 * Strict ordering per SESSION_KEY via sequence numbers.
 */

import { PrismaClient } from '@prisma/client';
import type { SessionKey } from '../types/events.schema';
import { CreateEvent, Event, EventSchema } from '../types/events.schema';

export class EventStore {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Create a new event
   * @throws if event with same (session_key, seq) already exists
   */
  async createEvent(event: CreateEvent): Promise<Event> {
    const created = await this.prisma.event.create({
      data: {
        sessionKey: event.session_key,
        seq: event.seq,
        type: event.type,
        payload: event.payload as object, // Prisma Json type
      },
    });

    return this.mapFromPrisma(created);
  }

  /**
   * Get the next sequence number for a session
   * Returns 0 if no events exist yet
   */
  async getNextSeq(sessionKey: SessionKey): Promise<number> {
    const latest = await this.prisma.event.findFirst({
      where: { sessionKey },
      orderBy: { seq: 'desc' },
      select: { seq: true },
    });

    return latest ? latest.seq + 1 : 0;
  }

  /**
   * List events for a session in sequence order
   */
  async listEvents(
    sessionKey: SessionKey,
    options?: {
      limit?: number;
      afterSeq?: number;
    },
  ): Promise<Event[]> {
    const events = await this.prisma.event.findMany({
      where: {
        sessionKey,
        ...(options?.afterSeq !== undefined && { seq: { gt: options.afterSeq } }),
      },
      orderBy: { seq: 'asc' },
      ...(options?.limit && { take: options.limit }),
    });

    return events.map((e) => this.mapFromPrisma(e));
  }

  /**
   * Get total event count for a session
   */
  async getEventCount(sessionKey: SessionKey): Promise<number> {
    return this.prisma.event.count({
      where: { sessionKey },
    });
  }

  private mapFromPrisma(prismaEvent: {
    id: string;
    sessionKey: string;
    seq: number;
    type: string;
    payload: unknown;
    createdAt: Date;
  }): Event {
    return EventSchema.parse({
      id: prismaEvent.id,
      session_key: prismaEvent.sessionKey,
      seq: prismaEvent.seq,
      type: prismaEvent.type,
      payload: prismaEvent.payload,
      created_at: prismaEvent.createdAt,
    });
  }
}
