# Feature Specification: Server-Side Autonomy for Proactive Agent Follow-ups

**Feature Branch**: `009-server-side-autonomy`  
**Created**: 2025-10-15  
**Status**: Draft  
**Prerequisite**: [008-migrate-to-events-effects](../008-migrate-to-events-effects/spec.md) MUST be complete  
**Input**: User description: "Server-Side Autonomy for Proactive Agent Follow-ups"

## Prerequisite

**This feature requires spec 008 (Migrate to Events & Effects Architecture) to be fully implemented and deployed first.**

Spec 008 provides:
- Events & Effects foundation (EventQueue, SessionProcessor, EffectRunner)
- Event and Effect tables in PostgreSQL
- user_message events and send_message effects working
- Durable outbox delivery pattern established

This spec (009) extends that foundation with:
- timer events and TimerWorker
- schedule_timer effects  
- PolicyGates with configurable limits (.env)
- Autonomy metadata in checkpoints

## Clarifications

### Session 2025-10-15

- Q: How should the system handle timers with `fire_at` timestamps that are already in the past when the Timer Worker processes them? → A: Fire immediately (promote to event right away)
- Q: When two events for the same SESSION_KEY arrive simultaneously (e.g., a user message while a timer is being processed), how should the system handle the race condition? → A: Queue events; process strictly one-at-a-time per SESSION_KEY
- Q: When the EffectRunner attempts to deliver an autonomous message but finds the WebSocket connection is closed, what should happen? → A: Keep in outbox; deliver on any future connection (using existing durable outbox pattern)
- Q: Should there be a maximum allowed duration for scheduled timers, and if so, what happens when an agent tries to schedule beyond that limit? → A: No limit; allow any duration
- Q: When a conversation thread is explicitly closed/ended, what should happen to all pending timers for that SESSION_KEY? → A: Let timers continue firing (no explicit close mechanism in MVP)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Agent Sends Scheduled Follow-up (Priority: P1)

A user starts a conversation with an agent, then stops responding. After a predetermined time (e.g., 30 seconds), the agent proactively sends a follow-up message to re-engage the user without requiring new user input.

**Why this priority**: This is the core capability that enables proactive agent behavior. Without this, no autonomous messaging is possible.

**Independent Test**: Can be fully tested by initiating a conversation, waiting for the scheduled time, and verifying the agent sends a follow-up message autonomously. Delivers immediate value by demonstrating basic autonomy.

**Acceptance Scenarios**:

1. **Given** a user has sent a message to an agent, **When** the agent's response includes scheduling a follow-up in 30 seconds, **Then** after 30 seconds elapse, the agent sends a proactive message without user input
2. **Given** an agent has scheduled a follow-up, **When** the scheduled time arrives, **Then** the follow-up appears in the conversation transcript tagged as "Agent follow-up"
3. **Given** multiple timers are scheduled, **When** they become due, **Then** they fire in the correct chronological order for that conversation session

---

### User Story 2 - User Message Cancels Pending Follow-ups (Priority: P1)

A user receives an agent response that schedules a follow-up. Before the follow-up fires, the user sends a new message. The system cancels all pending scheduled actions and processes the new user input fresh.

**Why this priority**: Critical safety feature preventing irrelevant autonomous messages. Ensures the agent remains responsive to user context changes.

**Independent Test**: Can be fully tested by scheduling a follow-up, sending a user message before it fires, and verifying no stale follow-up is sent. Prevents confusing user experiences.

**Acceptance Scenarios**:

1. **Given** an agent has scheduled a follow-up in 30 seconds, **When** the user sends a new message after 10 seconds, **Then** the original follow-up is cancelled and never fires
2. **Given** multiple follow-ups are scheduled, **When** a user message arrives, **Then** all pending timers and outbox effects for that conversation are cleared before processing the new message
3. **Given** a follow-up was cancelled by a user message, **When** the agent processes the new user input, **Then** the agent can schedule new follow-ups based on the updated context

---

### User Story 3 - Autonomy Hard Limits Prevent Message Storms (Priority: P1)

An agent attempts to send multiple autonomous follow-ups in succession. The system enforces a hard cap (3 consecutive autonomous messages) and cooldown period (15 seconds between autonomous sends) to prevent overwhelming the user.

**Why this priority**: Essential safety guardrail. Without limits, agents could spam users or create infinite loops.

**Independent Test**: Can be tested by triggering scenarios where an agent would attempt excessive autonomous sends, then verifying the caps are enforced. Protects user experience.

**Acceptance Scenarios**:

1. **Given** an agent has sent 3 consecutive autonomous messages, **When** it attempts to send a 4th autonomous message, **Then** the message is blocked and an internal note is logged
2. **Given** an agent sent an autonomous message, **When** less than 15 seconds have elapsed, **Then** any subsequent autonomous send attempt is blocked
3. **Given** an agent has hit the hard cap, **When** a user sends a message, **Then** the consecutive message counter resets to 0 and the agent can send autonomous messages again (within limits)
4. **Given** an autonomous message was blocked by cooldown, **When** the cooldown period expires and a user has not sent a message, **Then** the blocked message is dropped and logged (no automatic retry in MVP)

---

### User Story 4 - System Recovers from Failures (Priority: P2)

The system experiences a temporary failure (WebSocket disconnect, process restart). After recovery, pending timers and conversation state are preserved or safely discarded based on clear rules.

**Why this priority**: Important for reliability but can be simplified in MVP. Initial implementation can use conservative strategies (drop pending effects on restart).

**Independent Test**: Can be tested by simulating failures at different points in the autonomy flow and verifying the system handles them gracefully without data corruption or message duplication.

**Acceptance Scenarios**:

1. **Given** a timer is scheduled, **When** the system restarts before the timer fires, **Then** timers are cleared on restart (stateless restart policy for MVP)
2. **Given** a WebSocket send fails, **When** the EffectRunner processes the failure, **Then** the failure is logged but no retry storm occurs
3. **Given** an outbox effect has been executed, **When** the EffectRunner attempts to process it again, **Then** the effect is skipped due to deduplication

---

### User Story 5 - Multi-Session Isolation (Priority: P2)

Multiple users are simultaneously conversing with agents, potentially with the same agent across different conversation threads. The system ensures timers, effects, and state are isolated per conversation session.

**Why this priority**: Required for multi-user deployments but can be validated through systematic testing rather than complex runtime coordination in MVP.

**Independent Test**: Can be tested by running multiple concurrent conversation sessions and verifying their autonomy behaviors don't interfere with each other.

**Acceptance Scenarios**:

1. **Given** User A and User B are both conversing with Agent X in separate threads, **When** Agent X schedules follow-ups for both, **Then** each follow-up fires only in its correct conversation session
2. **Given** a user has multiple conversation threads open with the same agent, **When** timers fire in one thread, **Then** they do not affect the state or timers of other threads
3. **Given** a user message arrives in Session 1, **When** pending timers are cleared, **Then** only Session 1's timers are cleared, not timers from other sessions

---

### Edge Cases

- **Past-scheduled timers**: When a timer is scheduled for a time in the past (e.g., due to clock skew or system delay), the Timer Worker fires it immediately by promoting it to a timer event without delay
- **Concurrent SESSION_KEY processing**: When multiple events arrive for the same SESSION_KEY simultaneously (e.g., user message while timer is being processed), events are queued and processed strictly one-at-a-time per SESSION_KEY to guarantee ordering
- **Closed WebSocket during send**: When an autonomous message is ready to send but the WebSocket connection is closed, the message remains in the outbox queue and will be delivered when the client reconnects
- **Long-duration timers**: The system allows timers of any duration (hours or days) without imposed limits, providing maximum flexibility for agent scheduling patterns
- **Duplicate timer_id scheduling**: When an agent node schedules the same timer_id multiple times, the system upserts by (session_key, timer_id), replacing the previous timer with the new fire_at time and payload
- **Thread lifecycle**: MVP does not include explicit thread closure mechanism; timers continue to fire for their SESSION_KEY until cancelled by user messages or autonomy limits are reached

## Requirements *(mandatory)*

### Functional Requirements

#### Event Processing & Ordering
- **FR-001**: System MUST process events for each SESSION_KEY in strict sequential order based on sequence number
- **FR-002**: System MUST support three event types: `user_message`, `timer`, and `tool_result` (reserved for future)
- **FR-003**: System MUST assign a monotonically increasing sequence number to each event within a SESSION_KEY
- **FR-004**: System MUST store events with envelope fields: id (uuid), session_key, seq, type, payload, created_at
- **FR-005**: System MUST queue concurrent events for the same SESSION_KEY and process them one-at-a-time to prevent race conditions

#### Session Key Management
- **FR-006**: System MUST use SESSION_KEY format: `userId:agentId:threadId`
- **FR-007**: System MUST partition all timers, events, and outbox effects by SESSION_KEY
- **FR-008**: System MUST ensure userId and agentId are stable system identifiers
- **FR-009**: System MUST generate a unique threadId for each new conversation instance

#### Clear-on-User-Message Policy
- **FR-010**: System MUST cancel all pending timers for a SESSION_KEY when processing a user message
- **FR-011**: System MUST drop all not-yet-executed outbox effects for a SESSION_KEY when processing a user message
- **FR-012**: System MUST clear timers and effects before applying the new user message to the graph

#### Autonomy Limits & Safety
- **FR-013**: System MUST enforce a hard cap of 3 consecutive autonomous messages without user input
- **FR-014**: System MUST enforce a cooldown of 15 seconds between autonomous message sends
- **FR-015**: System MUST reset the consecutive autonomous message counter to 0 when a user message is processed
- **FR-016**: System MUST persist autonomy counters (consecutive_autonomous_msgs, last_autonomous_at) in checkpoint metadata
- **FR-017**: System MUST block autonomous sends that would violate hard cap or cooldown rules
- **FR-018**: System MUST log internal notes when autonomous sends are blocked by policy gates

#### Effects & Outbox
- **FR-019**: System MUST support effect types: `send_message` and `schedule_timer` in MVP
- **FR-020**: System MUST store effects with envelope fields: id (uuid), session_key, checkpoint_id, type, payload, dedupe_key, status, created_at
- **FR-021**: System MUST generate a stable dedupe_key for each effect based on checkpoint_id, type, and payload fingerprint
- **FR-022**: System MUST skip execution of effects with duplicate dedupe_keys (idempotency)
- **FR-023**: System MUST execute effects in a separate EffectRunner process (not inside LangGraph nodes)

#### Timer Management
- **FR-024**: System MUST store timers with fields: session_key, timer_id, fire_at, payload, status
- **FR-025**: System MUST upsert timers by (session_key, timer_id) to prevent duplicates
- **FR-026**: System MUST have a Timer Worker that checks for due timers every 250-500ms
- **FR-027**: System MUST promote due timers to `timer` events in the event queue
- **FR-028**: System MUST mark promoted timers as processed to prevent re-firing
- **FR-029**: System MUST immediately promote timers with `fire_at` timestamps in the past (fire immediately without delay)
- **FR-030**: System MUST allow timers of any duration without imposed maximum limits

#### LangGraph Integration
- **FR-031**: Graph nodes MUST NOT perform I/O operations directly
- **FR-032**: Graph nodes MUST return state deltas and effects (not execute side effects)
- **FR-033**: System MUST use PostgresCheckpointSaver to persist conversation state
- **FR-034**: System MUST update checkpoint metadata with event_seq, consecutive_autonomous_msgs, and last_autonomous_at after processing each event
- **FR-035**: System MUST persist checkpoint, enqueue outbox effects, and update counters in a single database transaction

#### WebSocket Delivery
- **FR-036**: System MUST deliver autonomous messages via WebSocket to connected clients
- **FR-037**: System MUST tag messages originating from timer events as "Agent follow-up" in the transcript
- **FR-038**: System MUST keep failed send attempts in the outbox queue for delivery on client reconnection (durable delivery)
- **FR-039**: System MUST log delivery outcomes (success or failure)

- **FR-040**: System MUST support environment variable AUTONOMY_ENABLED to enable/disable autonomy features (default: false)
- **FR-041**: System MUST support configurable environment variables for autonomy limits:
  - `AUTONOMY_MAX_CONSECUTIVE` (default: 3) - Hard cap for consecutive autonomous messages
  - `AUTONOMY_COOLDOWN_MS` (default: 15000) - Cooldown between autonomous sends in milliseconds
  - `TIMER_POLL_INTERVAL_MS` (default: 250) - Timer worker polling frequency
  - `EFFECT_POLL_INTERVAL_MS` (default: 250) - Effect runner polling frequency

### Key Entities *(include if feature involves data)*

- **Event**: Represents an input to the conversation graph (user message, timer firing, or tool result). Contains session_key, sequence number, type, payload, and timestamp. Events are ordered per session and immutable once created.

- **Effect**: Represents an output action from the graph (send message or schedule timer). Contains session_key, checkpoint_id, type, payload, dedupe_key for idempotency, status (pending/executed), and timestamp. Effects are executed by separate workers outside the graph.

- **Timer**: Represents a scheduled future action for a conversation session. Contains session_key, timer_id (unique within session), fire_at timestamp, optional payload, and status. Timers are promoted to events when due.

- **SESSION_KEY**: A composite identifier (userId:agentId:threadId) that uniquely identifies a conversation thread. Used to partition and order all events, effects, and timers. Ensures isolation between different conversations.

- **Checkpoint**: Persistent snapshot of conversation state managed by PostgresCheckpointSaver. Contains the graph state, metadata including autonomy counters (consecutive_autonomous_msgs, last_autonomous_at, event_seq), and links to the last processed event.

- **Outbox Entry**: An effect awaiting execution. Contains all effect fields plus processing status. Enables transactional outbox pattern where effects are atomically committed with checkpoints, then asynchronously executed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Agents can send proactive follow-up messages after a specified delay (e.g., 30 seconds) without requiring user input, with delivery latency under 1 second from scheduled time
- **SC-002**: When a user sends a new message, all previously scheduled follow-ups for that conversation are cancelled within 100ms, preventing irrelevant autonomous messages in 100% of cases
- **SC-003**: System enforces hard cap of 3 consecutive autonomous messages and 15-second cooldown with 100% accuracy, preventing any violations
- **SC-004**: System maintains strict event ordering per conversation session, with zero out-of-order processing events under normal operation
- **SC-005**: Autonomous messaging operates reliably across at least 100 concurrent conversation sessions without cross-session interference
- **SC-006**: System recovers gracefully from failures (process restart, WebSocket disconnect) without message duplication or data corruption, as verified by manual smoke tests
- **SC-007**: All autonomous messages are clearly tagged as "Agent follow-up" in the conversation transcript, enabling users to distinguish them from direct responses
- **SC-008**: Effect deduplication prevents duplicate side effects in 100% of retry scenarios, as verified by idempotency tests

## Assumptions *(mandatory)*

- The system operates as a single-process Node.js application in the MVP (no distributed coordination required)
- PostgreSQL is the persistence layer for events, effects, timers, and checkpoints
- WebSocket is the primary transport for real-time message delivery to clients
- The LangGraph framework's PostgresCheckpointSaver is used for state persistence
- Hard cap (3 messages) and cooldown (15 seconds) values are sufficient for MVP and can be made configurable later
- The outbox pattern provides durable delivery: messages remain queued until successfully delivered to clients (no time-based expiration in MVP)
- Timer precision of 250-500ms polling interval is sufficient for user experience
- Conversation threads are explicitly created and have stable threadId identifiers
- User authentication and authorization are handled upstream (SESSION_KEY components are already validated)
- Brain UI visualization is deferred to future phases and not required for autonomy to function
- Clock skew between server instances is negligible in single-process deployment

## Out of Scope *(mandatory)*

The following are explicitly NOT included in this feature:

- **Brain UI visualization**: No frontend components for visualizing or managing autonomous agent behavior
- **SSE/WebSocket for brain updates**: No separate real-time channels for brain state updates
- **Offline message coalescing**: No queuing or batching of messages when users are offline
- **Multi-tenant features**: No tenant isolation, per-tenant configuration, or resource quotas
- **Metrics dashboards**: No built-in analytics or monitoring UI for autonomy behavior
- **Distributed deployment**: No sharding, leader election, or cross-process coordination
- **Advanced retry logic**: No exponential backoff, dead letter queues, or complex failure handling for message delivery
- **Tool result processing**: tool_result event type is defined but not implemented in MVP
- **Timer persistence across restarts**: Timers are cleared on system restart in MVP
- **Per-agent autonomy configuration**: All agents use the same hard cap and cooldown settings
- **User preference controls**: No user-facing settings to adjust or disable autonomous messages
- **A/B testing infrastructure**: No built-in experimentation framework for autonomy parameters
- **Thread lifecycle management**: No explicit thread closure, archival, or deletion mechanisms in MVP

## Dependencies & Constraints *(if applicable)*

### Dependencies

- **PostgreSQL with Transactions**: Required for atomic checkpoint + effect commits and event ordering guarantees
- **LangGraph PostgresCheckpointSaver**: Required for conversation state persistence with metadata support
- **Fastify with WebSocket Plugin**: Required for real-time message delivery to clients
- **Existing SESSION_KEY Format**: Requires userId, agentId, and threadId to be stable and generated upstream

### Constraints

- **Single-Process Deployment**: MVP architecture assumes single Node.js process; concurrent event processing per SESSION_KEY must use in-process locking or queuing
- **No Retry Storms**: Failed WebSocket sends must not trigger automatic retries (single-attempt policy)
- **No Infinite Loops**: Autonomy gates must prevent any scenario where agents continuously send messages without user input
- **I/O Separation**: LangGraph nodes cannot perform I/O; all side effects must go through the outbox/effect runner pattern
- **Timer Resolution Limit**: 250-500ms polling means timers may fire up to 500ms late (acceptable trade-off for simplicity)
- **Schema Evolution**: Events and effects tables must support forward-compatible schema changes (payload as JSONB)

## Security & Privacy Considerations *(if applicable)*

- **Session Isolation**: SESSION_KEY must be validated to ensure users cannot trigger autonomous actions in other users' conversations
- **Rate Limiting**: Hard cap and cooldown serve as basic rate limits; additional upstream rate limiting may be needed for public deployments
- **Audit Logging**: All blocked autonomous sends should be logged for security monitoring and debugging
- **Payload Sanitization**: Timer and effect payloads must be sanitized to prevent injection attacks when executed
- **WebSocket Authentication**: Autonomous messages delivered via WebSocket must only be sent to authenticated connections for the correct SESSION_KEY
- **Data Retention**: Events, effects, and timers should respect user data retention policies (cleanup mechanism needed post-MVP)

## Open Questions for Clarification *(if applicable)*

*All critical clarifications have been resolved through reasonable defaults documented in Assumptions. No [NEEDS CLARIFICATION] markers remain in the specification.*
