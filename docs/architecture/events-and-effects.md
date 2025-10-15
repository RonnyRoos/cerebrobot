# Events & Effects Architecture

**Status**: Implemented in spec 008  
**Last Updated**: 2025-01-15  

## Overview

Cerebrobot uses an **Events & Effects** architecture with a **transactional outbox pattern** to ensure durable message delivery even when clients disconnect during LLM streaming. This architecture separates concerns:

- **Events**: Immutable facts representing what happened (inbound user messages)
- **Effects**: Mutable commands representing what must happen (outbound agent responses)

This separation enables:
- **Durable delivery**: Effects persist in database until successfully delivered
- **Reconnection handling**: Disconnected clients receive pending effects on reconnection
- **Session isolation**: Each conversation operates independently
- **Deduplication**: Prevent duplicate message delivery via unique dedupe keys
- **Observability**: Audit trail of all events and effects

## SESSION_KEY Format

Every conversation has a unique `SESSION_KEY` with the format:

```
userId:agentId:threadId
```

**Components**:
- **userId**: Unique identifier for the user (UUID format)
- **agentId**: Unique identifier for the agent configuration (UUID format)
- **threadId**: Unique identifier for the conversation thread (UUID format)

**Example**:
```
550e8400-e29b-41d4-a716-446655440000:7c9e6679-7425-40de-944b-e07fc1f90ae7:21ffbfcd-225e-4d73-be7e-9fb6aaf3f9d5
```

**Validation**:
- Must contain exactly 2 colons (3 components)
- Each component must be non-empty
- Components may not contain special characters (colons, semicolons, etc.)
- Validation enforced by `parseSessionKey` in `apps/server/src/events/session/types.ts`

## Events (Inbound Facts)

Events represent **immutable facts** about what has happened. They are written once and never modified.

### Characteristics

- **Past tense**: Events describe actions that already occurred ("user sent message")
- **Immutable**: Once created, events are never updated or deleted
- **Sequenced**: Each event has a sequence number (`seq`) within its session
- **Persisted first**: Events are written to database BEFORE processing begins

### Event Types

Currently supported:
- **`user_message`**: User sent a message in the conversation

Future extensibility:
- `user_edit`: User edited a previous message
- `user_delete`: User deleted a message
- `system_event`: System-triggered events (e.g., timeout)

### Event Schema

```typescript
{
  id: string;              // UUID
  session_key: string;     // userId:agentId:threadId
  seq: number;             // Sequence number (auto-incrementing per session)
  type: 'user_message';    // Event type
  payload: {
    text: string;          // User's message text
    requestId: string;     // Client-provided request ID for deduplication
  };
  created_at: Date;        // Timestamp (server-side)
}
```

### EventStore

The `EventStore` class (in `apps/server/src/events/events/EventStore.ts`) provides:

- **`create(event)`**: Insert event into database, auto-generate `seq` and timestamps
- **`getNextSeq(sessionKey)`**: Get next sequence number for session
- **`findBySession(sessionKey)`**: Retrieve all events for a session (for debugging/audit)

## Effects (Outbound Commands)

Effects represent **mutable commands** that must be executed. They have a lifecycle and are updated as they transition through states.

### Characteristics

- **Future tense**: Effects describe actions that must happen ("send message to user")
- **Mutable**: Effects transition through lifecycle states (pending → executing → completed/failed)
- **Retryable**: Failed effects can be retried with attempt tracking
- **Deduplicated**: Unique `dedupe_key` prevents duplicate execution

### Effect Types

Currently supported:
- **`send_message`**: Send agent response to user via WebSocket

Future extensibility:
- `send_notification`: Send push notification
- `update_ui`: Update UI element (e.g., typing indicator)
- `trigger_webhook`: Call external webhook

### Effect Lifecycle

Effects transition through the following states:

```
pending → executing → completed
                  ↘ failed (retryable)
```

**States**:
1. **pending**: Effect created but not yet attempted
2. **executing**: Effect delivery in progress
3. **completed**: Effect successfully delivered (terminal state)
4. **failed**: Effect delivery failed after retries (terminal state)

### Effect Schema

```typescript
{
  id: string;              // UUID
  session_key: string;     // userId:agentId:threadId
  checkpoint_id: string;   // LangGraph checkpoint ID (graph state snapshot)
  type: 'send_message';    // Effect type
  payload: {
    content: string;       // Complete message content
    requestId: string;     // Original request ID (from event)
    isFinal: boolean;      // Is this the final message in response?
  };
  dedupe_key: string;      // SHA-256(checkpoint_id + type + payload JSON)
  status: 'pending' | 'executing' | 'completed' | 'failed';
  created_at: Date;        // When effect was created
  updated_at: Date;        // When effect was last modified
  attempt_count: number;   // Number of delivery attempts (for retry logic)
  last_attempt_at: Date | null;  // When last attempt occurred
}
```

### OutboxStore

The `OutboxStore` class (in `apps/server/src/events/effects/OutboxStore.ts`) provides:

- **`create(effect)`**: Insert effect into database with generated dedupe_key
- **`getPending(sessionKey?, limit?)`**: Fetch pending effects (optionally filtered by session, ordered by created_at)
- **`updateStatus(effectId, status, attemptIncrement?)`**: Transition effect to new state

### Deduplication Strategy

Effects use a **dedupe_key** to prevent duplicate execution:

```typescript
dedupe_key = SHA-256(checkpoint_id + type + JSON.stringify(payload))
```

**Why this works**:
- Same LangGraph checkpoint + same effect type + same payload = same effect
- Database unique constraint on `dedupe_key` prevents duplicate INSERTs
- Completed/failed effects are never re-executed (checked before creation)
- Pending effects can be retried (idempotent delivery)

**Edge cases handled**:
- Different checkpoint IDs → different dedupe_keys (sequence numbers prevent collisions)
- Different payloads → different dedupe_keys (content changes)
- Different effect types → different dedupe_keys (action changes)

## Flow Diagram

### Normal Flow (User Connected)

```
User WebSocket
    |
    | (1) Send message
    ↓
Chat Route
    |
    | (2) Create event
    ↓
EventStore (Postgres)
    |
    | (3) Enqueue
    ↓
EventQueue (in-memory FIFO per session)
    |
    | (4) Dequeue + process (50ms interval)
    ↓
SessionProcessor
    |
    | (5) Load checkpoint → invoke LangGraph → stream tokens
    ↓
LangGraph Agent (LLM streaming)
    |
    | (6) Stream tokens directly to WebSocket (real-time)
    ↓
User WebSocket (tokens appear immediately)
    |
    | (7) After streaming completes, create effect with complete message
    ↓
OutboxStore (Postgres)
    |
    | (8) Poll for pending effects (500ms interval)
    ↓
EffectRunner
    |
    | (9) Find active connection, send effect
    ↓
User WebSocket (effect delivered synchronously)
    |
    | (10) Mark effect as completed
    ↓
OutboxStore (status='completed')
```

### Reconnection Flow (User Disconnected During Streaming)

```
User disconnects mid-stream
    |
    | SessionProcessor completes streaming
    ↓
OutboxStore (effect with status='pending')
    |
    | User reconnects later
    ↓
User WebSocket reconnects
    |
    | User sends new message
    ↓
Chat Route
    |
    | Trigger pollForSession(sessionKey)
    ↓
EffectRunner
    |
    | Fetch pending effects for session
    ↓
OutboxStore.getPending(sessionKey)
    |
    | Deliver all pending effects
    ↓
User WebSocket (receives all missed messages)
    |
    | Mark effects as completed
    ↓
OutboxStore (status='completed')
```

## Transactional Outbox Pattern

The **transactional outbox pattern** ensures that:

1. **Events are persisted BEFORE processing**: No message loss if system crashes
2. **Effects are persisted BEFORE delivery**: No message loss if client disconnects
3. **Polling ensures delivery**: EffectRunner continuously retries pending effects
4. **Idempotency prevents duplication**: Dedupe_key ensures exactly-once semantics

**Why not direct WebSocket delivery?**
- WebSocket connections are transient (users disconnect frequently)
- Direct delivery = message loss on disconnect
- Outbox pattern = durable delivery with retry logic

**Performance considerations**:
- Tokens stream directly to WebSocket (no database latency)
- Effects created AFTER streaming completes (off critical path)
- Polling interval tuned for low latency (500ms) without overwhelming database

## Key Components

### EventStore
**Location**: `apps/server/src/events/events/EventStore.ts`  
**Responsibility**: Persist events to database, manage sequence numbers  
**Key Methods**: `create`, `getNextSeq`, `findBySession`

### OutboxStore
**Location**: `apps/server/src/events/effects/OutboxStore.ts`  
**Responsibility**: Persist effects to database, manage lifecycle, deduplication  
**Key Methods**: `create`, `getPending`, `updateStatus`

### EventQueue
**Location**: `apps/server/src/events/session/EventQueue.ts`  
**Responsibility**: In-memory FIFO queue per SESSION_KEY, 50ms processing interval  
**Key Behavior**: Dequeues events and triggers SessionProcessor

### SessionProcessor
**Location**: `apps/server/src/events/session/SessionProcessor.ts`  
**Responsibility**: Orchestrate event → LangGraph → effect flow  
**Key Steps**:
1. Load checkpoint from database
2. Invoke LangGraph with event
3. Stream tokens to active WebSocket (real-time)
4. Create effect with complete message (durable)

### EffectRunner
**Location**: `apps/server/src/events/effects/EffectRunner.ts`  
**Responsibility**: Poll for pending effects (500ms), deliver to WebSocket  
**Key Methods**:
- `start()`: Begin polling loop
- `stop()`: Stop polling loop
- `pollForSession(sessionKey)`: Trigger immediate delivery for specific session

## Architecture Decisions

### Single Effect Per Message (ADR-008)

**Decision**: Create ONE effect with the complete message AFTER streaming completes, not one effect per token.

**Rationale**:
- Effects represent **state transitions** (message delivery), not streaming data (tokens)
- 1 database INSERT vs ~95 INSERTs per message (performance)
- Simpler deduplication (one dedupe_key per message)
- Aligns with transactional outbox pattern intent

**Implementation**:
- Tokens stream directly from SessionProcessor to WebSocket (real-time, no latency)
- Effect created after streaming completes (durable, off critical path)
- Reconnection delivers complete messages (not token-by-token)

**See**: [ADR-008: Single Effect Per Message](../decisions/adr/008-single-effect-per-message.md)

## Database Schema

For detailed schema documentation including tables, indexes, and constraints, see:
- [Database Schema Documentation](./database.md)
- [Prisma Schema](../../prisma/schema.prisma)

## Testing Strategy

Per [Engineering Best Practices](../best-practices.md):

- **Unit tests**: Deterministic with fixed inputs (EventStore, OutboxStore, EventQueue, SessionProcessor, EffectRunner)
- **Postgres validation test**: One integration test per subsystem with real database, mocked embeddings
- **Manual smoke tests**: Validate real LLM streaming, real reconnection, real concurrency

**Test locations**:
- `apps/server/src/__tests__/events/` - Unit tests for Events & Effects subsystem
- `apps/server/src/agent/__tests__/postgres-validation.test.ts` - Integration tests for database schema

## References

- [Spec 008: Events & Effects Migration](../../specs/008-migrate-to-events-effects/spec.md)
- [Implementation Progress](../../specs/008-migrate-to-events-effects/IMPLEMENTATION_PROGRESS.md)
- [ADR-008: Single Effect Per Message](../decisions/adr/008-single-effect-per-message.md)
- [Database Schema](./database.md)
- [Engineering Best Practices](../best-practices.md)
