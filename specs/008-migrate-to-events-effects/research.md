# Research: Events & Effects Architecture Foundation

**Feature**: 008-migrate-to-events-effects  
**Date**: 2025-10-15  
**Purpose**: Document core architectural decisions for migrating to Events & Effects pattern

## Decision 1: Events & Effects Pattern Selection

**Decision**: Implement Events & Effects architecture with transactional outbox for all message flows

**Rationale**:
- **Audit Trail**: Every user message and agent response logged permanently
- **Transactional Safety**: Atomically commit checkpoint + effects prevents message loss
- **Durable Delivery**: Failed WebSocket sends recoverable via outbox
- **Clean Separation**: Graph nodes stay pure, side effects in workers
- **Future-Proof**: Foundation for autonomy (timers), multi-agent, brain UI

**Alternatives Considered**:
- Keep current direct WebSocket sends: Rejected - no audit trail, duplicate architectures with autonomy
- Event sourcing only (no outbox): Rejected - no durability for WebSocket failures
- Queue all messages in Redis: Rejected - overengineering for single-process MVP

---

## Decision 2: PostgreSQL Schema for Events & Effects

**Decision**: Two tables with JSONB payloads, partial indexes for polling

**Schema**:
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key TEXT NOT NULL,
  seq INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'user_message' only for 008
  payload JSONB NOT NULL, -- { text: string }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_key, seq)
);
CREATE INDEX idx_events_session_seq ON events(session_key, seq);

CREATE TABLE effects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key TEXT NOT NULL,
  checkpoint_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'send_message' only for 008
  payload JSONB NOT NULL, -- { content: string }
  dedupe_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_effects_status_created ON effects(status, created_at) WHERE status = 'pending';
CREATE INDEX idx_effects_session ON effects(session_key);
```

**Rationale**:
- JSONB allows schema evolution without migrations (spec 009 adds timer/schedule_timer types)
- Unique constraints ensure ordering (events) and idempotency (effects)
- Partial indexes optimize worker polling (only pending effects)

---

## Decision 3: In-Process EventQueue vs External Queue

**Decision**: Use in-process `Map<SESSION_KEY, Queue<Event>>` for MVP

**Rationale**:
- **KISS**: Simpler than Redis/RabbitMQ for single-process deployment
- **Performance**: No network hops, sub-millisecond enqueue/dequeue
- **Sufficient**: Handles 100+ concurrent sessions with Map partitioning
- **Upgradeable**: Can swap to Redis later if distributed processing needed

**Trade-offs Accepted**:
- Events lost on process crash (acceptable - they're logged in DB, can replay)
- No cross-process coordination (not needed for single-process deployment)

---

## Decision 4: SESSION_KEY Format & Validation

**Decision**: Use branded Zod type for `userId:agentId:threadId` format

**Implementation**:
```typescript
const SessionKeySchema = z.string()
  .regex(/^[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+$/)
  .brand<'SessionKey'>();
type SessionKey = z.infer<typeof SessionKeySchema>;

function parseSessionKey(sessionKey: SessionKey): {
  userId: string;
  agentId: string;
  threadId: string;
} {
  const [userId, agentId, threadId] = sessionKey.split(':');
  return { userId, agentId, threadId };
}
```

**Rationale**:
- Type safety prevents passing raw strings
- Validation at edge (event creation) prevents malformed keys
- Parsing helper centralizes split logic

---

## Decision 5: Effect Deduplication Strategy

**Decision**: Use `checkpoint_id + type + payload hash` as dedupe_key

**Implementation**:
```typescript
function generateDedupeKey(effect: Omit<Effect, 'dedupe_key'>): string {
  const fingerprint = JSON.stringify({
    checkpoint_id: effect.checkpoint_id,
    type: effect.type,
    payload: effect.payload,
  });
  return createHash('sha256').update(fingerprint).digest('hex');
}
```

**Rationale**:
- Prevents duplicate sends if graph generates same effect twice
- checkpoint_id ties effect to specific conversation state
- Payload hash ensures content changes create new dedupe_key
- Unique constraint enforces exactly-once execution

---

## Decision 6: EffectRunner Polling vs Push

**Decision**: EffectRunner polls outbox every 250-500ms

**Rationale**:
- **Simplicity**: No need for publish-subscribe infrastructure
- **Acceptable Latency**: 250ms max delay for reconnection delivery (imperceptible to users)
- **Scalability**: Single query polls all pending effects efficiently
- **Flexibility**: Polling interval configurable via env var

**Alternatives Considered**:
- Push via PostgreSQL LISTEN/NOTIFY: Rejected - adds complexity, limited scalability
- Event-driven via database triggers: Rejected - harder to test and debug

---

## Decision 7: Token Streaming Preservation

**Decision**: EffectRunner sends tokens incrementally from effect payload, not batched

**Implementation**:
```typescript
async function executeSendMessage(effect: Effect) {
  const { content } = SendMessagePayloadSchema.parse(effect.payload);
  const tokens = content.split(''); // Or more sophisticated tokenization
  
  for (const token of tokens) {
    socket.send(JSON.stringify({ type: 'token', requestId, value: token }));
    await sleep(10); // Simulate streaming delay
  }
  
  socket.send(JSON.stringify({ type: 'final', requestId, message: content }));
}
```

**Rationale**:
- Preserves existing user experience (streaming feels responsive)
- Effect payload contains full message, EffectRunner chunks it for delivery
- Allows reconnection to continue streaming from last delivered token (future enhancement)

---

## Decision 8: Migration vs Feature Flag

**Decision**: All-or-nothing migration (no feature flag)

**Rationale**:
- **Simplicity**: Two codepaths harder to maintain than single migration
- **Testing**: Easier to test single architecture than toggled behavior
- **Risk Mitigation**: Comprehensive testing before deployment reduces rollback risk
- **Clean Cutover**: Deploy to staging → verify → deploy to production

**Contingency**: Keep current routes.ts in git history for emergency rollback if needed.

---

**References**:
- Transactional Outbox Pattern: https://microservices.io/patterns/data/transactional-outbox.html
- Event Sourcing: https://martinfowler.com/eaaDev/EventSourcing.html
- LangGraph Checkpointer: Uses PostgreSQL transactions for atomic state updates

**Next**: [data-model.md](./data-model.md) - Entity definitions and Prisma schema
