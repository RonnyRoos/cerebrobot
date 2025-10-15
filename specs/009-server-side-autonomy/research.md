# Research: Server-Side Autonomy for Proactive Agent Follow-ups

**Feature**: 009-server-side-autonomy  
**Date**: 2025-10-15  
**Prerequisite**: [008-migrate-to-events-effects](../008-migrate-to-events-effects/spec.md) complete  
**Purpose**: Resolve technical unknowns for autonomy features (timers, PolicyGates) building on 008 foundation

## Foundation from 008

**This spec builds on architectural decisions made in 008. For core Events & Effects decisions, see**:
- [008 Research: Events & Effects Pattern](../008-migrate-to-events-effects/research.md#decision-1-events--effects-pattern-selection)
- [008 Research: PostgreSQL Schema](../008-migrate-to-events-effects/research.md#decision-2-postgresql-schema-for-events--effects)
- [008 Research: EventQueue](../008-migrate-to-events-effects/research.md#decision-3-in-process-eventqueue-vs-external-queue)
- [008 Research: SESSION_KEY](../008-migrate-to-events-effects/research.md#decision-4-session_key-format--validation)
- [008 Research: Effect Deduplication](../008-migrate-to-events-effects/research.md#decision-5-effect-deduplication-strategy)
- [008 Research: EffectRunner Polling](../008-migrate-to-events-effects/research.md#decision-6-effectrunner-polling-vs-push)

**Assumed from 008**:
- ✅ EventQueue exists and handles sequential processing per SESSION_KEY
- ✅ SessionProcessor orchestrates event → graph → effect flow
- ✅ EffectRunner polls outbox and executes send_message effects
- ✅ Transactional outbox pattern working for durable delivery
- ✅ Events and effects tables exist in PostgreSQL

**This spec (009) adds**:
- Timer events and TimerWorker
- schedule_timer effects (extends EffectRunner)
- PolicyGates for autonomy limits
- Checkpoint metadata extensions
- Clear-on-user-message logic

## Research Tasks

### 1. Timer Infrastructure Design

**Decision**: Use dedicated TimerWorker with 250ms polling + timer events promoted to EventQueue

**Rationale**:
- **Reuses 008 Foundation**: Timer events flow through existing EventQueue → SessionProcessor → graph
- **Polling Simplicity**: 250ms polling acceptable latency for scheduled messages (vs cron-style scheduling)
- **Database-Backed**: Timers persist in PostgreSQL, survive restarts (though MVP clears on restart per spec)
- **Event Promotion**: When timer fires → create timer event → enqueue → process like user_message

**Schema** (extends 008):
```sql
CREATE TABLE autonomy_timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key TEXT NOT NULL,
  timer_id TEXT NOT NULL,
  fire_at TIMESTAMPTZ NOT NULL,
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'promoted' | 'cancelled'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_key, timer_id)
);
CREATE INDEX idx_timers_fire_at ON autonomy_timers(fire_at) WHERE status = 'pending';
```

**Flow**:
1. Graph node returns schedule_timer effect
2. EffectRunner executes → writes to timers table
3. TimerWorker polls for `fire_at <= NOW() AND status = 'pending'`
4. For each due timer: create timer event, enqueue, mark timer as 'promoted'

---

### 2. PostgreSQL Schema Design for Timers

**Decision**: Three tables with JSONB payloads and appropriate indexes

**Schema**:

```sql
-- Events table (immutable append-only log)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key TEXT NOT NULL,
  seq INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'user_message' | 'timer' | 'tool_result'
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_key, seq)
);
CREATE INDEX idx_events_session_seq ON events(session_key, seq);

-- Effects table (transactional outbox)
CREATE TABLE effects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key TEXT NOT NULL,
  checkpoint_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'send_message' | 'schedule_timer'
  payload JSONB NOT NULL,
  dedupe_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'executing' | 'completed' | 'failed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_effects_status_created ON effects(status, created_at) WHERE status = 'pending';
CREATE INDEX idx_effects_session ON effects(session_key);

-- Timers table (scheduled future actions)
CREATE TABLE autonomy_timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key TEXT NOT NULL,
  timer_id TEXT NOT NULL,
  fire_at TIMESTAMPTZ NOT NULL,
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'promoted' | 'cancelled'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_key, timer_id)
);
CREATE INDEX idx_timers_fire_at ON autonomy_timers(fire_at) WHERE status = 'pending';
CREATE INDEX idx_timers_session ON autonomy_timers(session_key);
```

**Rationale**:
- **JSONB for payloads**: Schema evolution without migrations, efficient querying with GIN indexes if needed
- **Unique constraints**: (session_key, seq) for events ensures ordering, (session_key, timer_id) enables upsert semantics
- **Partial indexes**: `WHERE status = 'pending'` reduces index size and speeds up worker queries
- **session_key partitioning**: All queries filtered by session_key for isolation

**Alternatives Considered**:
- **Separate columns for payload fields**: Rejected—requires migration for every payload schema change
- **Single events table with union type**: Rejected—mixing concerns, harder to query efficiently
- **No dedupe_key**: Rejected—idempotency critical for reliability

**Best Practices**:
- Use Prisma schema to define tables, generate TypeScript types
- Add `updated_at` triggers or use Prisma's `@updatedAt`
- Consider adding `processed_at` timestamp for observability

---

### 3. In-Process Event Queue Implementation (Per SESSION_KEY)

**Decision**: Map<SESSION_KEY, Queue<Event>> with async processing loop

**Implementation Pattern**:

```typescript
class EventQueue {
  private queues = new Map<SessionKey, AsyncQueue<Event>>();
  
  async enqueue(sessionKey: SessionKey, event: Event): Promise<void> {
    let queue = this.queues.get(sessionKey);
    if (!queue) {
      queue = new AsyncQueue<Event>();
      this.queues.set(sessionKey, queue);
      this.startProcessor(sessionKey, queue); // Start dedicated processor
    }
    await queue.push(event);
  }
  
  private async startProcessor(sessionKey: SessionKey, queue: AsyncQueue<Event>) {
    while (true) {
      const event = await queue.pop(); // Blocks until event available
      await this.sessionProcessor.process(sessionKey, event);
    }
  }
}
```

**Rationale**:
- **Single-writer guarantee**: Only one event processed at a time per SESSION_KEY
- **Simple concurrency**: No locks needed, queue serializes access
- **Session isolation**: Different SESSION_KEYs processed concurrently
- **Backpressure natural**: If processing slow, queue grows but maintains order

**Alternatives Considered**:
- **PostgreSQL LISTEN/NOTIFY**: Rejected—adds complexity, not needed for single process
- **Bull/BullMQ job queue**: Rejected—requires Redis, overengineering for MVP
- **Mutex locks per SESSION_KEY**: Rejected—more complex than queue, potential deadlocks

**Best Practices**:
- Implement bounded queue size to prevent memory exhaustion
- Add metrics: queue depth, processing time per event
- Graceful shutdown: drain queues before exit

---

### 4. Timer Worker Polling Strategy

**Decision**: Single worker with 250ms tick, batch query for due timers

**Implementation**:

```typescript
class TimerWorker {
  private pollInterval = 250; // ms
  
  async start() {
    while (this.running) {
      const dueTimers = await this.timerStore.findDue(new Date());
      for (const timer of dueTimers) {
        await this.promoteToEvent(timer);
      }
      await sleep(this.pollInterval);
    }
  }
  
  private async promoteToEvent(timer: Timer) {
    // Atomic: mark timer as promoted + create event
    await this.db.transaction(async (tx) => {
      await tx.timers.update({ where: { id: timer.id }, data: { status: 'promoted' } });
      await tx.events.create({
        data: {
          session_key: timer.session_key,
          seq: await this.getNextSeq(timer.session_key),
          type: 'timer',
          payload: { timer_id: timer.timer_id, ...timer.payload }
        }
      });
    });
  }
}
```

**Rationale**:
- **Simple & reliable**: No distributed coordination needed
- **Batching**: Single query finds all due timers, processes in batch
- **Acceptable latency**: 250ms average lag (spec allows 250-500ms resolution)
- **Transaction safety**: Timer promotion atomic, prevents double-firing

**Alternatives Considered**:
- **PostgreSQL pg_cron**: Rejected—limited to one timer per cron interval, not flexible
- **Separate timer per SESSION_KEY**: Rejected—doesn't scale, wakes up unnecessarily
- **Heap-based priority queue in memory**: Rejected—loses timers on restart unless persisted

**Best Practices**:
- Configurable poll interval via environment variable
- Add jitter to prevent thundering herd if scaling to multiple workers later
- Index on `fire_at WHERE status = 'pending'` critical for query performance

---

### 5. WebSocket Delivery with Durable Outbox

**Decision**: EffectRunner polls outbox, attempts delivery, retries on reconnect

**Flow**:

1. **Effect Creation**: Graph nodes return `send_message` effect → persisted to outbox atomically with checkpoint
2. **EffectRunner Poll**: Queries `WHERE status = 'pending' ORDER BY created_at LIMIT 10`
3. **Delivery Attempt**:
   - If WebSocket connected: send message, mark effect `completed`
   - If WebSocket disconnected: leave status `pending`, log failure
4. **Reconnection**: Client reconnects → EffectRunner processes pending effects for that SESSION_KEY

**Implementation**:

```typescript
class EffectRunner {
  async start() {
    while (this.running) {
      const effects = await this.outboxStore.getPending(10);
      for (const effect of effects) {
        await this.execute(effect);
      }
      await sleep(100); // Poll interval
    }
  }
  
  private async execute(effect: Effect) {
    if (effect.type === 'send_message') {
      const ws = this.getWebSocket(effect.session_key);
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'agent_follow_up', content: effect.payload.content }));
        await this.outboxStore.markCompleted(effect.id);
      } else {
        // Leave pending, will retry on next poll or reconnect
        await this.outboxStore.recordAttempt(effect.id, 'websocket_closed');
      }
    } else if (effect.type === 'schedule_timer') {
      await this.timerStore.upsert(effect.payload);
      await this.outboxStore.markCompleted(effect.id);
    }
  }
}
```

**Rationale**:
- **Durable by default**: Outbox persists effects, survives process restart
- **No retry storms**: Single poll loop, doesn't spam on failure
- **Eventual consistency**: Pending effects delivered when client reconnects
- **Simple**: No complex retry backoff, dead letter queues, or circuit breakers

**Alternatives Considered**:
- **Immediate retry on failure**: Rejected—creates retry storms, violates spec
- **Time-based expiration**: Rejected—spec clarifies no time limit in MVP (Q3 clarification)
- **Separate delivery queue per SESSION_KEY**: Rejected—YAGNI, outbox status sufficient

**Best Practices**:
- Add `attempt_count` and `last_attempt_at` columns for debugging
- Log all delivery outcomes (success/failure/reason) per FR-039
- WebSocket reconnection handler triggers immediate outbox poll for that SESSION_KEY

---

### 6. SESSION_KEY Format and Validation

**Decision**: Use branded type `userId:agentId:threadId` with Zod validation

**Implementation**:

```typescript
import { z } from 'zod';

const SessionKeySchema = z.string()
  .regex(/^[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+$/)
  .brand<'SessionKey'>();

type SessionKey = z.infer<typeof SessionKeySchema>;

function parseSessionKey(raw: string): { userId: string; agentId: string; threadId: string } {
  const [userId, agentId, threadId] = raw.split(':');
  return { userId, agentId, threadId };
}
```

**Rationale**:
- **Type safety**: Branded type prevents accidental string mixing
- **Validation**: Zod schema enforces format at runtime
- **Parseable**: Simple split(':') extracts components when needed
- **Stable**: Format defined in spec (FR-006)

**Best Practices**:
- Validate SESSION_KEY at API boundary (when creating events)
- Include SESSION_KEY in all logs for traceability
- Consider adding checksum/version prefix for future evolution (e.g., `v1:userId:agentId:threadId`)

---

### 7. Autonomy Policy Gates (Hard Cap & Cooldown)

**Decision**: PolicyGates class enforces rules before effect creation

**Implementation**:

```typescript
class PolicyGates {
  canSendAutonomousMessage(checkpoint: Checkpoint, effect: SendMessageEffect): PolicyResult {
    const meta = checkpoint.metadata;
    
    // Check hard cap
    if (meta.consecutive_autonomous_msgs >= 3) {
      return { allowed: false, reason: 'hard_cap_reached' };
    }
    
    // Check cooldown
    const lastSendAt = meta.last_autonomous_at ? new Date(meta.last_autonomous_at) : null;
    const cooldownMs = 15000;
    if (lastSendAt && (Date.now() - lastSendAt.getTime()) < cooldownMs) {
      return { allowed: false, reason: 'cooldown_active' };
    }
    
    return { allowed: true };
  }
  
  incrementCounters(meta: CheckpointMetadata): CheckpointMetadata {
    return {
      ...meta,
      consecutive_autonomous_msgs: meta.consecutive_autonomous_msgs + 1,
      last_autonomous_at: new Date().toISOString()
    };
  }
  
  resetCounters(meta: CheckpointMetadata): CheckpointMetadata {
    return {
      ...meta,
      consecutive_autonomous_msgs: 0,
      last_autonomous_at: null
    };
  }
}
```

**Rationale**:
- **Pre-execution check**: Gates evaluated before effect enters outbox
- **Logged rejections**: Blocked messages logged per FR-018
- **Stateless logic**: All state in checkpoint metadata, gates are pure functions
- **Testable**: Easy to unit test with mock checkpoint metadata

**Best Practices**:
- Make hard cap and cooldown configurable via environment variables
- Log blocked attempts with full context (SESSION_KEY, checkpoint_id, reason)
- Consider soft warnings at 50% of limits for observability

---

### 8. Checkpoint Metadata Extension

**Decision**: Extend LangGraph PostgresCheckpointSaver metadata with autonomy fields

**Schema Addition**:

```typescript
interface CheckpointMetadata {
  // Existing LangGraph fields
  step: number;
  writes: Record<string, any>;
  
  // Autonomy additions
  event_seq: number;                      // Last processed event sequence
  consecutive_autonomous_msgs: number;    // Counter for hard cap
  last_autonomous_at: string | null;      // ISO timestamp for cooldown
}
```

**Implementation**:

```typescript
await checkpointer.put({
  checkpoint: state,
  metadata: {
    ...existingMetadata,
    event_seq: event.seq,
    consecutive_autonomous_msgs: eventType === 'user_message' ? 0 : meta.consecutive_autonomous_msgs,
    last_autonomous_at: eventType === 'timer' ? new Date().toISOString() : meta.last_autonomous_at
  },
  // ...
});
```

**Rationale**:
- **Leverages existing persistence**: No separate counter table needed
- **Atomic updates**: Metadata updated in same transaction as checkpoint
- **Recovery friendly**: Counters survive process restart (unlike in-memory)
- **LangGraph compatible**: Metadata is opaque to LangGraph, we control schema

**Best Practices**:
- Document metadata schema in types file
- Validate metadata structure on checkpoint load (Zod schema)
- Consider versioning metadata schema for future evolution

---

## Summary

All technical decisions align with constitution principles:
- **KISS**: In-process queues, polling workers, no distributed systems
- **Transparency**: Events table provides full audit log
- **Testability**: Pure functions (PolicyGates), deterministic unit tests
- **Stack Discipline**: Uses approved Fastify, PostgreSQL, LangGraph, Zod
- **Operator-Centric**: Single-process deployment, durable by default

No unknowns remain. Ready for Phase 1 design.
