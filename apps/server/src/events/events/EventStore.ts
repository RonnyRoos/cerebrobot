/**
 * EventStore - PostgreSQL persistence for events
 * Implements event sourcing storage with session-scoped sequential IDs
 */

import { PrismaClient } from '@prisma/client';
import type { SessionKey, EventType, UserMessagePayload } from './types.js';
import type { CreateEvent, Event } from './types.js';
import { SessionKeySchema } from '../types/events.schema.js';
import { randomUUID } from 'crypto';

export class EventStore {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Create a new event and persist to database
   * Generates UUID and timestamp automatically
   * Validates SESSION_KEY format before persisting
   */
  async create(event: CreateEvent): Promise<Event> {
    // Validate SESSION_KEY format
    SessionKeySchema.parse(event.sessionKey);

    const created = await this.prisma.event.create({
      data: {
        id: randomUUID(),
        sessionKey: event.sessionKey,
        seq: event.seq,
        type: event.type,
        payload: event.payload, // Prisma accepts plain objects for Json type
      },
    });

    return {
      id: created.id,
      session_key: created.sessionKey as SessionKey,
      seq: created.seq,
      type: created.type as EventType,
      payload: created.payload as UserMessagePayload,
      created_at: created.createdAt,
    };
  }

  /**
   * Get next sequence number for a session
   * Returns 1 for new sessions, max(seq) + 1 for existing
   */
  async getNextSeq(sessionKey: SessionKey): Promise<number> {
    const result = await this.prisma.event.aggregate({
      where: { sessionKey },
      _max: { seq: true },
    });

    return (result._max.seq ?? 0) + 1;
  }

  /**
   * Find all events for a session ordered by sequence
   * Used for session replay/debugging
   */
  async findBySession(sessionKey: SessionKey): Promise<Event[]> {
    const events = await this.prisma.event.findMany({
      where: { sessionKey },
      orderBy: { seq: 'asc' },
    });

    return events.map((e) => ({
      id: e.id,
      session_key: e.sessionKey as SessionKey,
      seq: e.seq,
      type: e.type as EventType,
      payload: e.payload as UserMessagePayload,
      created_at: e.createdAt,
    }));
  }
}
