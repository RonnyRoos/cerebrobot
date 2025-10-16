# Database Schema

**Status**: Production (Spec 008 implemented)  
**Last Updated**: 2025-01-15  
**ORM**: Prisma 5.x  

## Overview

Cerebrobot uses PostgreSQL with pgvector extension for:
- **User memory storage** (embeddings + metadata)
- **LangGraph checkpoints** (conversation state)
- **Events & Effects** (transactional outbox pattern)
- **Thread management** (conversation sessions)

This document focuses on the **Events & Effects** tables introduced in spec 008.

## Events Table

The `events` table stores immutable facts about user actions.

### Schema

```sql
CREATE TABLE events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key   TEXT NOT NULL,                    -- userId:agentId:threadId
  seq           INTEGER NOT NULL,                 -- Auto-incrementing per session
  type          TEXT NOT NULL,                    -- Event type (e.g., 'user_message')
  payload       JSONB NOT NULL,                   -- Event-specific data
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE (session_key, seq)                       -- Prevent duplicate sequence numbers
);
```

### Columns

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key (auto-generated) |
| `session_key` | TEXT | No | Composite key: userId:agentId:threadId |
| `seq` | INTEGER | No | Sequence number within session (1, 2, 3, ...) |
| `type` | TEXT | No | Event type ('user_message', future: 'user_edit', etc.) |
| `payload` | JSONB | No | Event-specific data (schema depends on type) |
| `created_at` | TIMESTAMP WITH TIME ZONE | No | Server-side timestamp (auto-generated) |

### Indexes

```sql
-- Unique index on (session_key, seq) for FIFO ordering and duplicate prevention
CREATE UNIQUE INDEX events_session_key_seq_idx ON events (session_key, seq);
```

**Purpose**: 
- **FIFO ordering**: Query events for a session in chronological order (`ORDER BY seq`)
- **Uniqueness**: Prevent duplicate events with same (session_key, seq)
- **Performance**: Fast lookup of events by session

### Constraints

- **Primary key**: `id` (UUID)
- **Unique constraint**: `(session_key, seq)` - enforces one event per sequence number per session
- **Not null**: All columns except none (all required)

### Payload Schema by Type

#### `user_message`
```json
{
  "text": "User's message text",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Effects Table

The `effects` table stores mutable commands that must be executed.

### Schema

```sql
CREATE TABLE effects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key     TEXT NOT NULL,                    -- userId:agentId:threadId
  checkpoint_id   TEXT NOT NULL,                    -- LangGraph checkpoint ID
  type            TEXT NOT NULL,                    -- Effect type (e.g., 'send_message')
  payload         JSONB NOT NULL,                   -- Effect-specific data
  dedupe_key      TEXT NOT NULL UNIQUE,             -- SHA-256 hash for deduplication
  status          TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'executing' | 'completed' | 'failed'
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  attempt_count   INTEGER NOT NULL DEFAULT 0,       -- Number of delivery attempts
  last_attempt_at TIMESTAMP WITH TIME ZONE,         -- When last attempt occurred (NULL if never attempted)
  
  UNIQUE (dedupe_key)                               -- Prevent duplicate effects
);
```

### Columns

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key (auto-generated) |
| `session_key` | TEXT | No | Composite key: userId:agentId:threadId |
| `checkpoint_id` | TEXT | No | LangGraph checkpoint ID (graph state snapshot) |
| `type` | TEXT | No | Effect type ('send_message', future: 'send_notification', etc.) |
| `payload` | JSONB | No | Effect-specific data (schema depends on type) |
| `dedupe_key` | TEXT | No | SHA-256(checkpoint_id + type + payload JSON) |
| `status` | TEXT | No | Lifecycle state ('pending', 'executing', 'completed', 'failed') |
| `created_at` | TIMESTAMP WITH TIME ZONE | No | When effect was created |
| `updated_at` | TIMESTAMP WITH TIME ZONE | No | When effect was last modified |
| `attempt_count` | INTEGER | No | Number of delivery attempts (for retry logic) |
| `last_attempt_at` | TIMESTAMP WITH TIME ZONE | Yes | When last attempt occurred (NULL before first attempt) |

### Indexes

```sql
-- Index on (status, created_at) for polling pending effects in FIFO order
CREATE INDEX effects_status_created_at_idx ON effects (status, created_at);

-- Index on session_key for filtering effects by session
CREATE INDEX effects_session_key_idx ON effects (session_key);
```

**Purpose**: 
- **Polling efficiency**: `WHERE status = 'pending' ORDER BY created_at` uses (status, created_at) index
- **Session filtering**: `WHERE session_key = ? AND status = 'pending'` uses session_key index
- **FIFO delivery**: Older pending effects are delivered first

### Constraints

- **Primary key**: `id` (UUID)
- **Unique constraint**: `dedupe_key` - prevents duplicate effects
- **Not null**: All columns except `last_attempt_at` (NULL until first attempt)
- **Check constraint** (application-level): `status` must be one of: 'pending', 'executing', 'completed', 'failed'

### Payload Schema by Type

#### `send_message`
```json
{
  "content": "Complete agent response message",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "isFinal": true
}
```

**Fields**:
- `content`: Complete message text (accumulated from streaming)
- `requestId`: Original request ID from user_message event (for client-side correlation)
- `isFinal`: Whether this is the final message in the response (always true in single-effect-per-message architecture)

## Deduplication Strategy

Effects use a **dedupe_key** to prevent duplicate execution.

### Algorithm

```typescript
dedupe_key = SHA-256(checkpoint_id + type + JSON.stringify(payload))
```

### Examples

**Same effect (deduplicated)**:
```typescript
// Effect 1
checkpoint_id: "checkpoint-123"
type: "send_message"
payload: { content: "Hello", requestId: "uuid-1", isFinal: true }
dedupe_key: "abc123..."

// Effect 2 (duplicate - prevented by unique constraint)
checkpoint_id: "checkpoint-123"
type: "send_message"
payload: { content: "Hello", requestId: "uuid-1", isFinal: true }
dedupe_key: "abc123..."  // Same dedupe_key → INSERT fails
```

**Different effects (not deduplicated)**:
```typescript
// Effect 1
checkpoint_id: "checkpoint-123"
dedupe_key: "abc123..."

// Effect 2 (different checkpoint → different effect)
checkpoint_id: "checkpoint-124"
dedupe_key: "def456..."  // Different dedupe_key → INSERT succeeds

// Effect 3 (different payload → different effect)
checkpoint_id: "checkpoint-123"
payload: { content: "Goodbye", ... }
dedupe_key: "ghi789..."  // Different dedupe_key → INSERT succeeds
```

### Database Enforcement

The unique constraint on `dedupe_key` enforces deduplication at the database level:

```sql
UNIQUE (dedupe_key)
```

**Error on duplicate**:
```
ERROR: duplicate key value violates unique constraint "effects_dedupe_key_key"
DETAIL: Key (dedupe_key)=(abc123...) already exists.
```

## Query Patterns

### Fetch Pending Effects (EffectRunner Polling)

```sql
SELECT *
FROM effects
WHERE status = 'pending'
ORDER BY created_at ASC
LIMIT 100;
```

**Index used**: `effects_status_created_at_idx`  
**Performance**: O(log n) index scan + sequential read of matching rows

### Fetch Pending Effects for Session (Reconnection)

```sql
SELECT *
FROM effects
WHERE session_key = 'userId:agentId:threadId'
  AND status = 'pending'
ORDER BY created_at ASC;
```

**Index used**: `effects_session_key_idx` (filtered by session, then checked for status)  
**Performance**: O(log n) index scan + sequential read of session's effects

### Insert Effect with Deduplication

```sql
INSERT INTO effects (
  id, session_key, checkpoint_id, type, payload, dedupe_key, status, created_at, updated_at
)
VALUES (
  gen_random_uuid(),
  'userId:agentId:threadId',
  'checkpoint-123',
  'send_message',
  '{"content":"Hello","requestId":"uuid-1","isFinal":true}',
  'abc123...',  -- SHA-256 hash
  'pending',
  NOW(),
  NOW()
)
ON CONFLICT (dedupe_key) DO NOTHING;  -- Silently ignore duplicates
```

**Performance**: O(1) hash lookup for dedupe_key uniqueness check

### Update Effect Status

```sql
UPDATE effects
SET status = 'completed',
    updated_at = NOW()
WHERE id = 'effect-uuid';
```

**Performance**: O(1) primary key lookup

### Fetch All Events for Session (Audit/Debug)

```sql
SELECT *
FROM events
WHERE session_key = 'userId:agentId:threadId'
ORDER BY seq ASC;
```

**Index used**: `events_session_key_seq_idx`  
**Performance**: O(log n) index scan + sequential read of session's events

## Migration Strategy

### Phase 1: Add Tables (Spec 008)

```bash
pnpm prisma migrate dev --name add_events_effects_tables
```

Creates:
- `events` table with unique (session_key, seq) index
- `effects` table with unique dedupe_key constraint
- Indexes: (status, created_at), (session_key)

### Phase 2: Backfill (Future)

If migrating existing data:
1. Create events from historical user messages (assign seq based on timestamp)
2. DO NOT create effects for historical messages (effects are for future delivery only)

### Phase 3: Cleanup (Future)

Consider archiving old completed effects:
```sql
DELETE FROM effects
WHERE status IN ('completed', 'failed')
  AND updated_at < NOW() - INTERVAL '30 days';
```

**Retention policy**: TBD (effects may be kept indefinitely for audit, or archived after N days)

## Performance Considerations

### Index Selectivity

- **events_session_key_seq_idx**: High selectivity (few events per session)
- **effects_status_created_at_idx**: Medium selectivity (pending effects are ~1-10% of total)
- **effects_session_key_idx**: High selectivity (few effects per session)

### Query Optimization

- **Polling query** (`status = 'pending' ORDER BY created_at`): Composite index avoids sort
- **Session filtering** (`session_key = ?`): Single-column index sufficient
- **Deduplication** (`dedupe_key` unique constraint): Hash index for O(1) lookups

### Scaling Considerations

- **Effects table growth**: Linear with message volume (1 effect per message)
- **Events table growth**: Linear with message volume (1 event per user message)
- **Archival strategy**: Consider moving completed/failed effects to cold storage after 30-90 days

## Testing

### Postgres Validation Tests

Location: `apps/server/src/agent/__tests__/postgres-validation.test.ts`

**Tests**:
1. Events table structure (columns, types)
2. Events unique constraint on (session_key, seq)
3. Events index on (session_key, seq)
4. Effects table structure (columns, types)
5. Effects unique constraint on dedupe_key
6. Effects indexes on (status, created_at) and (session_key)
7. Query performance validation

**Test data**: Deterministic with fixed timestamps and UUIDs  
**Test approach**: Real Postgres connection, no mocking

## References

- [Events & Effects Architecture](./events-and-effects.md)
- [Prisma Schema](../../prisma/schema.prisma)
- [Spec 008: Events & Effects Migration](../../specs/008-migrate-to-events-effects/spec.md)
- [ADR-008: Single Effect Per Message](../decisions/adr/008-single-effect-per-message.md)
