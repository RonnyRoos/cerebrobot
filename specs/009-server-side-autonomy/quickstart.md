# Quickstart: Server-Side Autonomy Implementation

**Feature**: 008-server-side-autonomy  
**Date**: 2025-10-15  
**Audience**: Developers implementing the autonomy feature

## Overview

This guide walks you through implementing server-side autonomy for proactive agent follow-ups. The system uses Events & Effects architecture with PostgreSQL-backed persistence and strict ordering guarantees.

## Prerequisites

- Node.js ≥20
- PostgreSQL running (via Docker Compose)
- Existing Cerebrobot server with LangGraph integration
- Familiarity with Fastify, LangGraph, and Prisma

## Architecture Quick Reference

```
User Message ──┐
               │
Timer Fires ───┼──> EventQueue ──> SessionProcessor ──> Graph Nodes
               │                          │                    │
Tool Result ───┘                          │                    │
                                          ↓                    ↓
                                    Checkpoint            Effects[]
                                    (metadata)                 │
                                          │                    │
                                          └────────┬───────────┘
                                                   ↓
                                           (Transaction Commit)
                                                   │
                                          ┌────────┴───────────┐
                                          ↓                    ↓
                                    Checkpoint             Outbox
                                     Saved                 (effects)
                                                               │
                                                               ↓
                                                         EffectRunner
                                                               │
                                                ┌──────────────┼──────────────┐
                                                ↓                             ↓
                                         send_message                  schedule_timer
                                         (WebSocket)                    (TimerStore)
                                                                              │
                                                                              ↓
                                                                        TimerWorker
                                                                              │
                                                                              ↓
                                                                      (Timer Event)
```

## Step 1: Database Schema

### 1.1 Update Prisma Schema

Add to `prisma/schema.prisma`:

```prisma
model Event {
  id          String   @id @default(uuid()) @db.Uuid
  sessionKey  String   @map("session_key")
  seq         Int
  type        String
  payload     Json
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@unique([sessionKey, seq])
  @@index([sessionKey, seq])
  @@map("events")
}

model Effect {
  id             String    @id @default(uuid()) @db.Uuid
  sessionKey     String    @map("session_key")
  checkpointId   String    @map("checkpoint_id")
  type           String
  payload        Json
  dedupeKey      String    @unique @map("dedupe_key")
  status         String    @default("pending")
  createdAt      DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt      DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  attemptCount   Int       @default(0) @map("attempt_count")
  lastAttemptAt  DateTime? @map("last_attempt_at") @db.Timestamptz

  @@index([status, createdAt], map: "idx_effects_status_created")
  @@index([sessionKey])
  @@map("effects")
}

model Timer {
  id         String   @id @default(uuid()) @db.Uuid
  sessionKey String   @map("session_key")
  timerId    String   @map("timer_id")
  fireAt     DateTime @map("fire_at") @db.Timestamptz
  payload    Json?
  status     String   @default("pending")
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt  DateTime @updatedAt @map("updated_at") @db.Timestamptz

  @@unique([sessionKey, timerId])
  @@index([fireAt], map: "idx_timers_fire_at")
  @@index([sessionKey])
  @@map("autonomy_timers")
}
```

### 1.2 Create Migration

```bash
cd /Users/ronny.roos/dev/cerebrobot
pnpm prisma migrate dev --name add_autonomy_tables
pnpm prisma generate
```

## Step 2: Type Definitions & Contracts

### 2.1 Copy Contract Schemas

Copy schemas from `specs/008-server-side-autonomy/contracts/` to `apps/server/src/autonomy/types/`:

```bash
mkdir -p apps/server/src/autonomy/types
cp specs/008-server-side-autonomy/contracts/*.schema.ts apps/server/src/autonomy/types/
```

### 2.2 Create Checkpoint Metadata Type

`apps/server/src/autonomy/types/checkpoint.ts`:

```typescript
export interface AutonomyMetadata {
  event_seq: number;
  consecutive_autonomous_msgs: number;
  last_autonomous_at: string | null;
}

export function createInitialMetadata(): AutonomyMetadata {
  return {
    event_seq: 0,
    consecutive_autonomous_msgs: 0,
    last_autonomous_at: null,
  };
}

export function resetAutonomyCounters(meta: AutonomyMetadata): AutonomyMetadata {
  return {
    ...meta,
    consecutive_autonomous_msgs: 0,
    last_autonomous_at: null,
  };
}

export function incrementAutonomyCounters(meta: AutonomyMetadata): AutonomyMetadata {
  return {
    ...meta,
    consecutive_autonomous_msgs: meta.consecutive_autonomous_msgs + 1,
    last_autonomous_at: new Date().toISOString(),
  };
}
```

## Step 3: Storage Layer

### 3.1 EventStore

`apps/server/src/autonomy/events/EventStore.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import type { Event, CreateEvent, SessionKey } from '../types/events.schema';

export class EventStore {
  constructor(private prisma: PrismaClient) {}

  async create(event: CreateEvent): Promise<Event> {
    const created = await this.prisma.event.create({
      data: {
        sessionKey: event.session_key,
        seq: event.seq,
        type: event.type,
        payload: event.payload as any,
      },
    });

    return {
      id: created.id,
      session_key: created.sessionKey as SessionKey,
      seq: created.seq,
      type: created.type as any,
      payload: created.payload as any,
      created_at: created.createdAt,
    };
  }

  async getNextSeq(sessionKey: SessionKey): Promise<number> {
    const latest = await this.prisma.event.findFirst({
      where: { sessionKey },
      orderBy: { seq: 'desc' },
      select: { seq: true },
    });
    return (latest?.seq ?? 0) + 1;
  }

  async findBySession(sessionKey: SessionKey, fromSeq: number = 1): Promise<Event[]> {
    const events = await this.prisma.event.findMany({
      where: { sessionKey, seq: { gte: fromSeq } },
      orderBy: { seq: 'asc' },
    });

    return events.map(e => ({
      id: e.id,
      session_key: e.sessionKey as SessionKey,
      seq: e.seq,
      type: e.type as any,
      payload: e.payload as any,
      created_at: e.createdAt,
    }));
  }
}
```

### 3.2 OutboxStore

`apps/server/src/autonomy/effects/OutboxStore.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import type { Effect, CreateEffect, EffectStatus } from '../types/effects.schema';
import { generateDedupeKey } from '../types/effects.schema';

export class OutboxStore {
  constructor(private prisma: PrismaClient) {}

  async create(effect: Omit<CreateEffect, 'dedupe_key'>): Promise<Effect> {
    const dedupeKey = generateDedupeKey(
      effect.checkpoint_id,
      effect.type,
      effect.payload
    );

    const created = await this.prisma.effect.create({
      data: {
        sessionKey: effect.session_key,
        checkpointId: effect.checkpoint_id,
        type: effect.type,
        payload: effect.payload as any,
        dedupeKey,
      },
    });

    return this.mapToEffect(created);
  }

  async getPending(limit: number = 10): Promise<Effect[]> {
    const effects = await this.prisma.effect.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    return effects.map(e => this.mapToEffect(e));
  }

  async updateStatus(id: string, status: EffectStatus): Promise<void> {
    await this.prisma.effect.update({
      where: { id },
      data: {
        status,
        attemptCount: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    });
  }

  private mapToEffect(raw: any): Effect {
    return {
      id: raw.id,
      session_key: raw.sessionKey,
      checkpoint_id: raw.checkpointId,
      type: raw.type,
      payload: raw.payload,
      dedupe_key: raw.dedupeKey,
      status: raw.status,
      created_at: raw.createdAt,
      updated_at: raw.updatedAt,
      attempt_count: raw.attemptCount,
      last_attempt_at: raw.lastAttemptAt,
    };
  }
}
```

### 3.3 TimerStore

`apps/server/src/autonomy/timers/TimerStore.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import type { Timer, UpsertTimer, SessionKey } from '../types/timers.schema';

export class TimerStore {
  constructor(private prisma: PrismaClient) {}

  async upsert(timer: UpsertTimer): Promise<Timer> {
    const upserted = await this.prisma.autonomyTimer.upsert({
      where: {
        sessionKey_timerId: {
          sessionKey: timer.session_key,
          timerId: timer.timer_id,
        },
      },
      create: {
        sessionKey: timer.session_key,
        timerId: timer.timer_id,
        fireAt: timer.fire_at,
        payload: timer.payload as any,
      },
      update: {
        fireAt: timer.fire_at,
        payload: timer.payload as any,
        status: 'pending', // Reset if previously promoted
      },
    });

    return this.mapToTimer(upserted);
  }

  async findDue(before: Date): Promise<Timer[]> {
    const timers = await this.prisma.autonomyTimer.findMany({
      where: {
        status: 'pending',
        fireAt: { lte: before },
      },
      orderBy: { fireAt: 'asc' },
    });

    return timers.map(t => this.mapToTimer(t));
  }

  async cancelBySession(sessionKey: SessionKey): Promise<number> {
    const result = await this.prisma.autonomyTimer.updateMany({
      where: {
        sessionKey,
        status: 'pending',
      },
      data: { status: 'cancelled' },
    });

    return result.count;
  }

  async markPromoted(id: string): Promise<void> {
    await this.prisma.autonomyTimer.update({
      where: { id },
      data: { status: 'promoted' },
    });
  }

  private mapToTimer(raw: any): Timer {
    return {
      id: raw.id,
      session_key: raw.sessionKey,
      timer_id: raw.timerId,
      fire_at: raw.fireAt,
      payload: raw.payload,
      status: raw.status,
      created_at: raw.createdAt,
      updated_at: raw.updatedAt,
    };
  }
}
```

## Step 4: Core Components

### 4.1 EventQueue

`apps/server/src/autonomy/events/EventQueue.ts`:

```typescript
import type { Event, SessionKey } from '../types/events.schema';

class AsyncQueue<T> {
  private items: T[] = [];
  private resolvers: Array<(value: T) => void> = [];

  push(item: T): void {
    if (this.resolvers.length > 0) {
      const resolve = this.resolvers.shift()!;
      resolve(item);
    } else {
      this.items.push(item);
    }
  }

  pop(): Promise<T> {
    if (this.items.length > 0) {
      return Promise.resolve(this.items.shift()!);
    }
    return new Promise(resolve => this.resolvers.push(resolve));
  }

  get length(): number {
    return this.items.length;
  }
}

export class EventQueue {
  private queues = new Map<SessionKey, AsyncQueue<Event>>();
  private processors = new Map<SessionKey, Promise<void>>();

  constructor(private processEvent: (sessionKey: SessionKey, event: Event) => Promise<void>) {}

  async enqueue(event: Event): Promise<void> {
    const sessionKey = event.session_key;
    let queue = this.queues.get(sessionKey);
    
    if (!queue) {
      queue = new AsyncQueue<Event>();
      this.queues.set(sessionKey, queue);
      this.startProcessor(sessionKey, queue);
    }

    queue.push(event);
  }

  private startProcessor(sessionKey: SessionKey, queue: AsyncQueue<Event>): void {
    const processor = (async () => {
      while (true) {
        const event = await queue.pop();
        await this.processEvent(sessionKey, event);
      }
    })();

    this.processors.set(sessionKey, processor);
  }

  getQueueDepth(sessionKey: SessionKey): number {
    return this.queues.get(sessionKey)?.length ?? 0;
  }
}
```

### 4.2 PolicyGates

`apps/server/src/autonomy/session/PolicyGates.ts`:

```typescript
import type { AutonomyMetadata } from '../types/checkpoint';

export interface PolicyResult {
  allowed: boolean;
  reason?: string;
}

export class PolicyGates {
  constructor(
    private maxConsecutive: number = 3,
    private cooldownMs: number = 15000
  ) {}

  canSendAutonomousMessage(metadata: AutonomyMetadata): PolicyResult {
    // Check hard cap
    if (metadata.consecutive_autonomous_msgs >= this.maxConsecutive) {
      return { allowed: false, reason: 'hard_cap_reached' };
    }

    // Check cooldown
    if (metadata.last_autonomous_at) {
      const lastSendAt = new Date(metadata.last_autonomous_at);
      const elapsed = Date.now() - lastSendAt.getTime();
      if (elapsed < this.cooldownMs) {
        return { allowed: false, reason: 'cooldown_active' };
      }
    }

    return { allowed: true };
  }
}
```

## Step 5: Workers

### 5.1 TimerWorker

`apps/server/src/autonomy/timers/TimerWorker.ts`:

```typescript
import { EventStore } from '../events/EventStore';
import { TimerStore } from './TimerStore';
import { createTimerEvent } from '../types/events.schema';
import type { Logger } from 'pino';

export class TimerWorker {
  private running = false;
  private pollInterval = 250; // ms

  constructor(
    private timerStore: TimerStore,
    private eventStore: EventStore,
    private logger: Logger
  ) {}

  async start(): Promise<void> {
    this.running = true;
    this.logger.info('TimerWorker started');

    while (this.running) {
      try {
        const dueTimers = await this.timerStore.findDue(new Date());
        
        for (const timer of dueTimers) {
          await this.promoteToEvent(timer);
        }

        await this.sleep(this.pollInterval);
      } catch (error) {
        this.logger.error({ error }, 'TimerWorker poll error');
        await this.sleep(this.pollInterval);
      }
    }
  }

  stop(): void {
    this.running = false;
    this.logger.info('TimerWorker stopped');
  }

  private async promoteToEvent(timer: any): Promise<void> {
    const seq = await this.eventStore.getNextSeq(timer.session_key);
    const event = createTimerEvent(
      timer.session_key,
      seq,
      timer.timer_id,
      timer.payload
    );

    await this.eventStore.create(event);
    await this.timerStore.markPromoted(timer.id);

    this.logger.info(
      { sessionKey: timer.session_key, timerId: timer.timer_id },
      'Timer promoted to event'
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 5.2 EffectRunner

`apps/server/src/autonomy/effects/EffectRunner.ts`:

```typescript
import { OutboxStore } from './OutboxStore';
import { TimerStore } from '../timers/TimerStore';
import type { Logger } from 'pino';
import type { WebSocket } from 'ws';

export class EffectRunner {
  private running = false;
  private pollInterval = 100; // ms

  constructor(
    private outboxStore: OutboxStore,
    private timerStore: TimerStore,
    private getWebSocket: (sessionKey: string) => WebSocket | undefined,
    private logger: Logger
  ) {}

  async start(): Promise<void> {
    this.running = true;
    this.logger.info('EffectRunner started');

    while (this.running) {
      try {
        const effects = await this.outboxStore.getPending(10);

        for (const effect of effects) {
          await this.execute(effect);
        }

        await this.sleep(this.pollInterval);
      } catch (error) {
        this.logger.error({ error }, 'EffectRunner poll error');
        await this.sleep(this.pollInterval);
      }
    }
  }

  stop(): void {
    this.running = false;
    this.logger.info('EffectRunner stopped');
  }

  private async execute(effect: any): Promise<void> {
    if (effect.type === 'send_message') {
      await this.executeSendMessage(effect);
    } else if (effect.type === 'schedule_timer') {
      await this.executeScheduleTimer(effect);
    }
  }

  private async executeSendMessage(effect: any): Promise<void> {
    const ws = this.getWebSocket(effect.session_key);

    if (ws && ws.readyState === 1 /* OPEN */) {
      ws.send(JSON.stringify({
        type: 'agent_follow_up',
        content: effect.payload.content,
      }));

      await this.outboxStore.updateStatus(effect.id, 'completed');
      this.logger.info({ effectId: effect.id }, 'Message sent');
    } else {
      // Leave pending for reconnection
      this.logger.warn({ effectId: effect.id }, 'WebSocket closed, effect pending');
    }
  }

  private async executeScheduleTimer(effect: any): Promise<void> {
    await this.timerStore.upsert({
      session_key: effect.session_key,
      timer_id: effect.payload.timer_id,
      fire_at: new Date(effect.payload.fire_at),
      payload: effect.payload.payload,
    });

    await this.outboxStore.updateStatus(effect.id, 'completed');
    this.logger.info({ effectId: effect.id, timerId: effect.payload.timer_id }, 'Timer scheduled');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Step 6: Integration

### 6.1 Initialize Autonomy System

`apps/server/src/autonomy/index.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { EventStore } from './events/EventStore';
import { EventQueue } from './events/EventQueue';
import { OutboxStore } from './effects/OutboxStore';
import { TimerStore } from './timers/TimerStore';
import { TimerWorker } from './timers/TimerWorker';
import { EffectRunner } from './effects/EffectRunner';
import { SessionProcessor } from './session/SessionProcessor';
import type { Logger } from 'pino';
import type { WebSocket } from 'ws';

export interface AutonomySystem {
  eventQueue: EventQueue;
  timerWorker: TimerWorker;
  effectRunner: EffectRunner;
  start: () => Promise<void>;
  stop: () => void;
}

export function createAutonomySystem(
  prisma: PrismaClient,
  getWebSocket: (sessionKey: string) => WebSocket | undefined,
  logger: Logger
): AutonomySystem {
  const eventStore = new EventStore(prisma);
  const outboxStore = new OutboxStore(prisma);
  const timerStore = new TimerStore(prisma);

  const sessionProcessor = new SessionProcessor(
    eventStore,
    outboxStore,
    timerStore,
    logger
  );

  const eventQueue = new EventQueue(
    (sessionKey, event) => sessionProcessor.process(sessionKey, event)
  );

  const timerWorker = new TimerWorker(timerStore, eventStore, logger);
  const effectRunner = new EffectRunner(outboxStore, timerStore, getWebSocket, logger);

  return {
    eventQueue,
    timerWorker,
    effectRunner,
    async start() {
      await Promise.all([
        timerWorker.start(),
        effectRunner.start(),
      ]);
    },
    stop() {
      timerWorker.stop();
      effectRunner.stop();
    },
  };
}
```

### 6.2 Update Server Initialization

In `apps/server/src/index.ts` or main server file:

```typescript
import { createAutonomySystem } from './autonomy';

// After Fastify server creation
const autonomy = createAutonomySystem(
  prisma,
  (sessionKey) => websocketConnections.get(sessionKey),
  logger
);

await autonomy.start();

// On shutdown
fastify.addHook('onClose', () => {
  autonomy.stop();
});
```

## Step 7: Testing

### 7.1 Unit Test Example

`tests/autonomy/PolicyGates.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { PolicyGates } from '../apps/server/src/autonomy/session/PolicyGates';
import { createInitialMetadata } from '../apps/server/src/autonomy/types/checkpoint';

describe('PolicyGates', () => {
  it('allows first autonomous message', () => {
    const gates = new PolicyGates(3, 15000);
    const metadata = createInitialMetadata();

    const result = gates.canSendAutonomousMessage(metadata);

    expect(result.allowed).toBe(true);
  });

  it('blocks after hard cap reached', () => {
    const gates = new PolicyGates(3, 15000);
    const metadata = {
      event_seq: 10,
      consecutive_autonomous_msgs: 3,
      last_autonomous_at: new Date().toISOString(),
    };

    const result = gates.canSendAutonomousMessage(metadata);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('hard_cap_reached');
  });

  it('blocks during cooldown period', () => {
    const gates = new PolicyGates(3, 15000);
    const metadata = {
      event_seq: 5,
      consecutive_autonomous_msgs: 1,
      last_autonomous_at: new Date(Date.now() - 5000).toISOString(), // 5 seconds ago
    };

    const result = gates.canSendAutonomousMessage(metadata);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('cooldown_active');
  });
});
```

### 7.2 Run Tests

```bash
pnpm test
```

## Step 8: Configuration

### 8.1 Environment Variables

Add to `.env`:

```env
# Autonomy Feature
AUTONOMY_ENABLED=true
AUTONOMY_MAX_CONSECUTIVE=3
AUTONOMY_COOLDOWN_MS=15000
TIMER_POLL_INTERVAL_MS=250
EFFECT_POLL_INTERVAL_MS=100
```

## Next Steps

1. Implement `SessionProcessor` (orchestrates event → graph → effects)
2. Extend LangGraph nodes to return effects instead of performing I/O
3. Update WebSocket route to handle reconnection and outbox delivery
4. Add observability (metrics, structured logging)
5. Write integration tests for full event flow
6. Update manual smoke test checklist

See `tasks.md` (generated by `/speckit.tasks`) for detailed implementation breakdown.

## Troubleshooting

**Q: Timers not firing?**
- Check TimerWorker is running: look for "TimerWorker started" in logs
- Verify timer status is 'pending' and fire_at is in the past
- Check index exists: `idx_timers_fire_at`

**Q: Effects not being delivered?**
- Check EffectRunner is running
- Verify WebSocket connection is open for session_key
- Check effect status is 'pending'
- Look for "effect pending" warnings in logs

**Q: Events processed out of order?**
- Verify unique constraint on (session_key, seq)
- Check EventQueue is using correct session_key
- Look for duplicate seq errors

**Q: Hard cap/cooldown not working?**
- Verify checkpoint metadata is being updated
- Check PolicyGates configuration (max_consecutive, cooldown_ms)
- Look for policy rejection logs
