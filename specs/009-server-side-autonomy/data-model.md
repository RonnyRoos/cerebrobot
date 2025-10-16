# Data Model: Server-Side Autonomy for Proactive Agent Follow-ups

**Feature**: 009-server-side-autonomy  
**Date**: 2025-10-15  
**Source**: Derived from spec.md entities and research.md decisions

## Overview

The autonomy system uses three core tables (events, effects, timers) plus extended checkpoint metadata to implement the Events & Effects pattern with transactional outbox guarantees.

## Entities

### 1. Event

**Purpose**: Immutable input to the conversation graph (user message, timer firing, or tool result)

**Attributes**:
- `id` (UUID, PK): Unique identifier
- `session_key` (TEXT, NOT NULL): Composite key `userId:agentId:threadId`
- `seq` (INTEGER, NOT NULL): Monotonically increasing sequence number per session
- `type` (TEXT, NOT NULL): Event type enum: `user_message`, `timer`, `tool_result`
- `payload` (JSONB, NOT NULL): Event-specific data
  - `user_message`: `{ text: string }`
  - `timer`: `{ timer_id: string, payload?: any }`
  - `tool_result`: `{ tool_id: string, payload: any }` (reserved)
- `created_at` (TIMESTAMPTZ, NOT NULL): Event creation timestamp

**Constraints**:
- UNIQUE(session_key, seq): Ensures strict ordering per session
- seq starts at 1 for each new session_key

**Indexes**:
- PRIMARY KEY (id)
- INDEX (session_key, seq): For ordered event retrieval

**Relationships**:
- One session_key → Many events (one-to-many)
- Events are immutable after creation (append-only log)

**Lifecycle**:
1. Created when user message arrives or timer fires
2. Processed by SessionProcessor in strict sequence order
3. Never updated or deleted (audit log)

---

### 2. Effect

**Purpose**: Output action from the graph awaiting execution (send message or schedule timer)

**Attributes**:
- `id` (UUID, PK): Unique identifier
- `session_key` (TEXT, NOT NULL): Composite key `userId:agentId:threadId`
- `checkpoint_id` (TEXT, NOT NULL): LangGraph checkpoint ID this effect was generated from
- `type` (TEXT, NOT NULL): Effect type enum: `send_message`, `schedule_timer`
- `payload` (JSONB, NOT NULL): Effect-specific data
  - `send_message`: `{ content: string }`
  - `schedule_timer`: `{ timer_id: string, fire_at: string (ISO), payload?: any }`
- `dedupe_key` (TEXT, UNIQUE, NOT NULL): Idempotency key (hash of checkpoint_id + type + payload fingerprint)
- `status` (TEXT, NOT NULL): Lifecycle status enum: `pending`, `executing`, `completed`, `failed`
- `created_at` (TIMESTAMPTZ, NOT NULL): Effect creation timestamp
- `updated_at` (TIMESTAMPTZ, NOT NULL): Last status update timestamp
- `attempt_count` (INTEGER, DEFAULT 0): Number of execution attempts (for observability)
- `last_attempt_at` (TIMESTAMPTZ, NULL): Timestamp of most recent execution attempt

**Constraints**:
- UNIQUE(dedupe_key): Prevents duplicate effect execution
- status transitions: pending → executing → completed/failed

**Indexes**:
- PRIMARY KEY (id)
- INDEX (status, created_at) WHERE status = 'pending': For EffectRunner polling
- INDEX (session_key): For session-specific queries

**Relationships**:
- One session_key → Many effects (one-to-many)
- One checkpoint_id → Many effects (one-to-many)
- Effects created atomically with checkpoint in single transaction

**Lifecycle**:
1. Created by SessionProcessor when graph returns effects
2. Persisted to outbox table atomically with checkpoint
3. EffectRunner polls pending effects
4. Status updated to `executing` → `completed` or `failed`
5. Retried on reconnect if status remains `pending` (durable delivery)

---

### 3. Timer

**Purpose**: Scheduled future action for a conversation session

**Attributes**:
- `id` (UUID, PK): Unique identifier
- `session_key` (TEXT, NOT NULL): Composite key `userId:agentId:threadId`
- `timer_id` (TEXT, NOT NULL): Application-defined timer identifier (unique within session)
- `fire_at` (TIMESTAMPTZ, NOT NULL): When timer should fire
- `payload` (JSONB, NULL): Optional data to include in timer event
- `status` (TEXT, NOT NULL): Lifecycle status enum: `pending`, `promoted`, `cancelled`
- `created_at` (TIMESTAMPTZ, NOT NULL): Timer creation timestamp
- `updated_at` (TIMESTAMPTZ, NOT NULL): Last status update timestamp

**Constraints**:
- UNIQUE(session_key, timer_id): Enables upsert semantics (replace existing timer)
- status transitions: pending → promoted/cancelled

**Indexes**:
- PRIMARY KEY (id)
- INDEX (fire_at) WHERE status = 'pending': For TimerWorker polling
- INDEX (session_key): For session-specific queries and cancellation

**Relationships**:
- One session_key → Many timers (one-to-many)
- Timer promotes to Event when fired

**Lifecycle**:
1. Created by EffectRunner when processing `schedule_timer` effect
2. Upserted by (session_key, timer_id): new timer replaces old if same timer_id
3. TimerWorker polls for `fire_at <= NOW()` and `status = 'pending'`
4. Promoted to `timer` event (status → `promoted`)
5. Cancelled if user message arrives (all pending timers for session_key → `cancelled`)

---

### 4. Checkpoint Metadata Extension

**Purpose**: Augment LangGraph checkpoint metadata with autonomy state

**Attributes** (added to existing checkpoint metadata):
- `event_seq` (number): Sequence number of last processed event
- `consecutive_autonomous_msgs` (number): Counter for hard cap enforcement (max 3)
- `last_autonomous_at` (string | null): ISO timestamp of last autonomous message send (for cooldown)

**Storage**: Within LangGraph `checkpoints` table metadata JSONB column

**Lifecycle**:
1. Initialized on first event for session_key
2. Updated atomically with checkpoint after each event processing
3. `consecutive_autonomous_msgs` reset to 0 on user message
4. `consecutive_autonomous_msgs` incremented on autonomous send
5. `last_autonomous_at` updated on autonomous send

---

### 5. SESSION_KEY (Branded Type)

**Purpose**: Uniquely identify a conversation thread

**Format**: `userId:agentId:threadId` (colon-separated)

**Components**:
- `userId`: Stable user identifier from upstream auth
- `agentId`: Stable agent identifier from agent registry
- `threadId`: Unique conversation instance identifier

**Validation**:
```typescript
const SessionKeySchema = z.string()
  .regex(/^[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+$/)
  .brand<'SessionKey'>();
```

**Usage**:
- Partition key for all tables (events, effects, timers)
- Key for in-process event queues
- Session isolation boundary

---

## Relationships Summary

```
SESSION_KEY (partition key)
  ↓ 1:N
  ├─→ Events (ordered by seq)
  │     └─→ processed by SessionProcessor
  │           └─→ creates Effects (transactional)
  │
  ├─→ Effects (ordered by created_at)
  │     ├─→ send_message: delivered via WebSocket
  │     └─→ schedule_timer: creates Timer
  │
  ├─→ Timers (keyed by timer_id)
  │     └─→ promoted to Events (by TimerWorker)
  │
  └─→ Checkpoint Metadata (autonomy state)
        ├─→ event_seq (track progress)
        ├─→ consecutive_autonomous_msgs (hard cap)
        └─→ last_autonomous_at (cooldown)
```

---

## State Transitions

### Event Status
- **Created**: Immutable, never changes state
- Events processed in order but never marked as "processed" (seq tracking in checkpoint metadata instead)

### Effect Status
```
pending → executing → completed
                  └→ failed
```
- **pending**: Waiting for EffectRunner
- **executing**: Currently being processed
- **completed**: Successfully executed
- **failed**: Execution failed (logged, not retried automatically)

### Timer Status
```
pending → promoted
      └→ cancelled
```
- **pending**: Waiting for fire_at timestamp
- **promoted**: Converted to timer event
- **cancelled**: User message arrived, timer invalidated

---

## Invariants

1. **Event Ordering**: For any session_key, events.seq is monotonically increasing without gaps
2. **Idempotency**: Effects with same dedupe_key execute at most once
3. **Session Isolation**: Events/Effects/Timers for different session_keys never interfere
4. **Atomicity**: Checkpoint + Effects creation happens in single transaction
5. **Timer Uniqueness**: Only one pending timer per (session_key, timer_id) at any time
6. **Hard Cap**: consecutive_autonomous_msgs never exceeds 3 for autonomous sends
7. **Cooldown**: Time between consecutive autonomous sends never less than 15 seconds (unless user message resets)

---

## Prisma Schema

```prisma
model Event {
  id          String   @id @default(uuid()) @db.Uuid
  sessionKey  String   @map("session_key")
  seq         Int
  type        String   // 'user_message' | 'timer' | 'tool_result'
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
  type           String    // 'send_message' | 'schedule_timer'
  payload        Json
  dedupeKey      String    @unique @map("dedupe_key")
  status         String    @default("pending") // 'pending' | 'executing' | 'completed' | 'failed'
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
  status     String   @default("pending") // 'pending' | 'promoted' | 'cancelled'
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt  DateTime @updatedAt @map("updated_at") @db.Timestamptz

  @@unique([sessionKey, timerId])
  @@index([fireAt], map: "idx_timers_fire_at")
  @@index([sessionKey])
  @@map("autonomy_timers")
}
```

---

## Migration Strategy

1. Create migration: `pnpm prisma migrate dev --name add_autonomy_tables`
2. Apply migration: Auto-applied in dev, manual review for production
3. No data migration needed (new tables start empty)
4. Rollback plan: Drop tables if feature disabled via `AUTONOMY_ENABLED=false`

---

## Data Volume Estimates

**Assumptions** (per spec):
- 100 concurrent sessions
- Average 10 events/session/hour
- Average 2 effects/event
- Average 1 timer/session active

**Daily Volume**:
- Events: 100 × 10 × 24 = 24,000 rows/day
- Effects: 100 × 20 × 24 = 48,000 rows/day
- Timers: ~100 rows (steady state, replaced via upsert)

**Retention Strategy** (future):
- Archive events/effects older than 30 days
- Keep timers only while pending/active
- Checkpoint metadata follows LangGraph retention policy
