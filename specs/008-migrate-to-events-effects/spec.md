# Feature Specification: Migrate to Events & Effects Architecture

**Feature Branch**: `008-migrate-to-events-effects`  
**Created**: 2025-10-15  
**Status**: Draft  
**Purpose**: Migrate all existing message flows to Events & Effects architecture as foundation for future autonomy features

## Overview

This specification describes the migration of Cerebrobot's existing user message handling from direct WebSocket sends to a unified Events & Effects architecture with transactional outbox pattern. This migration preserves all current functionality while establishing the architectural foundation required for server-side autonomy (spec 009).

**Key Principle**: This is a MIGRATION, not a feature addition. User-visible behavior remains identical. The change is purely architectural.

## Goals

- Migrate user message handling to Events & Effects pattern without changing user-facing behavior
- Establish EventQueue for sequential event processing per SESSION_KEY
- Implement SessionProcessor for orchestrated event → graph → effects flow
- Implement EffectRunner for durable WebSocket message delivery via transactional outbox
- Provide full audit trail of all user messages and system responses through events/effects tables
- Verify multi-session isolation with Events & Effects architecture
- Enable future autonomy features (spec 009) through unified event processing foundation

## User Scenarios & Testing

### User Story 1 - User Message Streamed via Events & Effects (Priority: P1)

A user sends a message via WebSocket. The system processes it through the new Events & Effects architecture, streams the response back token-by-token, and the user sees identical behavior to the current implementation.

**Why this priority**: Core functionality preservation. If this doesn't work, nothing works.

**Independent Test**: Send a user message, verify streaming response arrives with same latency and format as current implementation. No user-visible changes.

**Acceptance Scenarios**:

1. **Given** a user sends a message via WebSocket, **When** the message arrives, **Then** it is converted to a `user_message` event and enqueued for processing
2. **Given** a `user_message` event is processed, **When** the LangGraph agent responds, **Then** a `send_message` effect is created and persisted atomically with the checkpoint
3. **Given** a `send_message` effect is in the outbox, **When** the EffectRunner polls, **Then** the message is delivered via WebSocket with token streaming
4. **Given** token streaming is in progress, **When** all tokens are sent, **Then** a final event is sent with latency and token usage metrics
5. **Given** the response completes successfully, **When** the effect status is updated, **Then** it is marked as `completed` and deduplication prevents re-execution

---

### User Story 2 - Durable Message Delivery on Reconnection (Priority: P1)

A user's WebSocket connection drops while the agent is generating a response. When the user reconnects, any pending messages in the outbox are delivered automatically.

**Why this priority**: Critical reliability improvement over current implementation. Prevents message loss on network issues.

**Independent Test**: Disconnect WebSocket mid-response, reconnect, verify pending message delivered automatically.

**Acceptance Scenarios**:

1. **Given** an agent response is being generated, **When** the WebSocket connection closes, **Then** the `send_message` effect remains in the outbox with status `pending`
2. **Given** a `send_message` effect is pending in the outbox, **When** the user reconnects, **Then** the EffectRunner detects the reconnection and delivers the queued message
3. **Given** multiple effects are pending, **When** reconnection occurs, **Then** effects are delivered in creation order
4. **Given** a pending effect is successfully delivered on reconnect, **When** delivery completes, **Then** the effect status is updated to `completed`

---

### User Story 3 - Multi-Session Event Isolation (Priority: P1)

Multiple users converse with agents simultaneously in different threads. The system ensures events, effects, and processing are strictly isolated by SESSION_KEY with no cross-contamination.

**Why this priority**: Verification that Events & Effects maintains existing isolation guarantees.

**Independent Test**: Run two concurrent conversations, verify each processes independently with no interference.

**Acceptance Scenarios**:

1. **Given** User A sends a message in Thread 1, **When** the event is created, **Then** it has SESSION_KEY `userId_A:agentId:threadId_1`
2. **Given** User B sends a message in Thread 2 simultaneously, **When** both events are enqueued, **Then** each is processed in its own EventQueue (separate Map entries)
3. **Given** responses are generated for both sessions, **When** effects are created, **Then** each effect is tagged with its correct SESSION_KEY
4. **Given** effects are being executed, **When** the EffectRunner processes them, **Then** each message is delivered only to the correct WebSocket connection

---

### User Story 4 - Effect Deduplication Prevents Duplicate Delivery (Priority: P2)

The system restarts or an effect execution is retried. Deduplication ensures each effect executes exactly once, preventing duplicate messages to users.

**Why this priority**: Important for production reliability but not MVP-blocking.

**Independent Test**: Simulate effect retry scenario, verify dedupe_key prevents re-execution.

**Acceptance Scenarios**:

1. **Given** an effect is created with a dedupe_key, **When** the same checkpoint generates the same effect again, **Then** the duplicate is detected and skipped
2. **Given** an effect has status `completed`, **When** the EffectRunner attempts to process it again, **Then** it is skipped based on status check
3. **Given** multiple effects with unique dedupe_keys, **When** processed, **Then** all execute (deduplication is per-effect, not global)

---

## Requirements

### Functional Requirements

#### Event Processing
- **FR-001**: System MUST convert incoming user WebSocket messages to `user_message` events
- **FR-002**: System MUST assign monotonically increasing sequence numbers to events per SESSION_KEY
- **FR-003**: System MUST store events in PostgreSQL events table with fields: id, session_key, seq, type (`user_message`), payload, created_at
- **FR-004**: System MUST process events for each SESSION_KEY in strict sequential order

#### Session Key Management
- **FR-005**: System MUST use SESSION_KEY format: `userId:agentId:threadId`
- **FR-006**: System MUST partition all events and effects by SESSION_KEY
- **FR-007**: System MUST validate SESSION_KEY components on event creation

#### EventQueue
- **FR-008**: System MUST maintain an in-process EventQueue with Map<SESSION_KEY, Queue<Event>> structure
- **FR-009**: System MUST enqueue events and process one-at-a-time per SESSION_KEY to prevent race conditions
- **FR-010**: System MUST support concurrent processing of events from different SESSION_KEYs

#### SessionProcessor
- **FR-011**: System MUST implement SessionProcessor to orchestrate: event → checkpoint load → graph execution → effect generation → transaction commit
- **FR-012**: System MUST load LangGraph checkpoint state before processing each event
- **FR-013**: System MUST invoke LangGraph agent with user message from event payload
- **FR-014**: System MUST collect streaming tokens and generate `send_message` effect with complete message content
- **FR-015**: System MUST persist checkpoint + effects in a single database transaction (atomicity)

#### Effects & Outbox
- **FR-016**: System MUST create `send_message` effects for agent responses
- **FR-017**: System MUST store effects in PostgreSQL effects table with fields: id, session_key, checkpoint_id, type (`send_message`), payload, dedupe_key, status, created_at, updated_at, attempt_count, last_attempt_at
- **FR-018**: System MUST generate stable dedupe_key for each effect based on checkpoint_id + type + payload hash
- **FR-019**: System MUST prevent duplicate effect execution using dedupe_key uniqueness constraint

#### EffectRunner
- **FR-020**: System MUST implement EffectRunner background worker that polls for pending effects
- **FR-021**: System MUST execute `send_message` effects by delivering messages via WebSocket
- **FR-022**: System MUST update effect status through lifecycle: pending → executing → completed/failed
- **FR-023**: System MUST preserve token streaming behavior (send tokens incrementally, not batched)
- **FR-024**: System MUST handle WebSocket send failures gracefully (log error with Pino, set status=pending, increment attempt_count, update last_attempt_at timestamp for reconnection retry)

#### WebSocket Integration
- **FR-025**: System MUST detect WebSocket reconnection events
- **FR-026**: System MUST trigger EffectRunner poll for pending effects on reconnection
- **FR-027**: System MUST deliver pending effects in creation order on reconnection
- **FR-028**: System MUST maintain existing WebSocket message protocol (ChatStreamEvent types unchanged)

#### Migration Safety
- **FR-029**: System MUST preserve all existing user-facing behavior (streaming latency, token delivery, error messages) verified by manual smoke tests
- **FR-030**: System MUST NOT introduce new failure modes visible to users, verified by manual smoke tests comparing pre/post migration behavior
- **FR-031**: System MUST maintain existing performance characteristics (first token latency, throughput)

### Key Entities

- **Event**: Immutable input representing a user message. Contains session_key, seq, type (`user_message`), payload (`{ text: string }`), created_at. Stored in events table as append-only log.

- **Effect**: Output action representing an agent response to deliver. Contains session_key, checkpoint_id, type (`send_message`), payload (`{ content: string }`), dedupe_key, status (pending/executing/completed/failed), created_at. Stored in effects table (transactional outbox).

- **SESSION_KEY**: Composite identifier (`userId:agentId:threadId`) uniquely identifying a conversation thread. Used to partition events and effects for isolation.

- **EventQueue**: In-process data structure (Map<SESSION_KEY, Queue<Event>>) ensuring sequential event processing per session while allowing concurrent processing across sessions.

- **SessionProcessor**: Orchestration component that processes events: loads checkpoint, invokes graph, collects response, generates effects, commits transaction atomically.

- **EffectRunner**: Background worker that polls outbox for pending effects, executes them (WebSocket delivery), updates status. Enables durable delivery and reconnection handling.

- **Checkpoint**: LangGraph conversation state snapshot persisted by PostgresCheckpointSaver. Contains graph state, messages, summary. Referenced by checkpoint_id in effects for transactional consistency.

## Success Criteria

- **SC-001**: User messages processed via Events & Effects with zero behavioral changes visible to users (streaming works identically)
- **SC-002**: All user messages and agent responses logged in events/effects tables (full audit trail)
- **SC-003**: WebSocket disconnection during response → pending effects delivered on reconnection (0% message loss)
- **SC-004**: Concurrent users in separate threads → zero cross-session contamination (verified by integration tests)
- **SC-005**: Effect deduplication prevents 100% of duplicate message deliveries (verified by idempotency tests)
- **SC-006**: First token latency remains within 10% of current implementation (performance preserved)
- **SC-007**: System handles 100 concurrent sessions without event ordering violations (scalability maintained)

## Assumptions

- PostgreSQL is the persistence layer (existing LangGraph checkpointer already uses Postgres)
- WebSocket is the message transport (existing implementation)
- LangGraph agent interface remains unchanged (`streamChat` generator)
- SESSION_KEY components (userId, agentId, threadId) are validated upstream and available in WebSocket context
- Single-process Node.js deployment (no distributed coordination required for MVP)
- EventQueue uses in-process Map (no Redis or external queue for MVP)
- Effect polling interval can be 250-500ms (acceptable latency for reconnection delivery)

## Out of Scope

The following are explicitly NOT included in this migration:

- **Autonomous agent messaging**: No timer-driven events, no autonomous follow-ups (deferred to spec 009)
- **Timer infrastructure**: No timer events, no TimerWorker, no timers table (deferred to spec 009)
- **Policy gates**: No hard caps, no cooldowns, no autonomy limits (deferred to spec 009)
- **Tool result events**: NOT in scope for 008 (deferred to future spec)
- **Schedule timer effects**: `schedule_timer` effect type not used in this migration
- **Configuration changes**: No new environment variables (autonomy config in spec 009)
- **Frontend changes**: No UI modifications, existing chat interface unchanged
- **Brain UI**: No memory visualization, no event log UI (future phases)
- **Advanced retry logic**: No exponential backoff, no dead letter queue (simple reconnection delivery only)

## Dependencies & Constraints

### Dependencies

- **PostgreSQL with Transactions**: Required for atomic checkpoint + effect commits
- **LangGraph PostgresCheckpointSaver**: Existing checkpoint persistence must continue working
- **Fastify with WebSocket Plugin**: Existing WebSocket infrastructure
- **Existing SESSION_KEY Format**: Migration assumes userId, agentId, threadId are available

### Constraints

- **Zero User-Visible Changes**: Migration must be transparent to users
- **No Breaking Changes**: Existing WebSocket protocol unchanged
- **Single-Process Architecture**: In-process EventQueue, no distributed coordination
- **Performance Parity**: First token latency must not regress
- **Backward Compatibility**: Existing checkpoints must continue working (no checkpoint migration)

## Security & Privacy Considerations

- **Session Isolation**: SESSION_KEY validation prevents cross-user event/effect access
- **Audit Logging**: All events/effects logged for security monitoring and debugging
- **WebSocket Authentication**: Events created only for authenticated WebSocket connections (existing auth unchanged)
- **Payload Sanitization**: Event/effect payloads sanitized to prevent injection attacks
- **Data Retention**: Events/effects tables should respect user data retention policies (cleanup mechanism post-migration)

## Open Questions for Clarification

*All critical clarifications resolved through architecture analysis and split decision. No [NEEDS CLARIFICATION] markers remain.*

---

**Next Spec**: [009-server-side-autonomy](../009-server-side-autonomy/spec.md) - Adds timer-driven autonomous messaging on top of this foundation.
