# Feature Specification: Thread-Persistent WebSocket Connections

**Feature Branch**: `006-migrate-to-thread`  
**Created**: October 11, 2025  
**Status**: Draft  
**Input**: User description: "Migrate to Thread-Persistent WebSocket Connections - Replace the current one-message-per-connection WebSocket pattern with thread-persistent connections where a single WebSocket remains open for the lifetime of an active thread session."

## Clarifications

### Session 2025-10-11

**Q1: Connection Recovery Strategy**
- Question: When a connection drops mid-response, should the system attempt to resume the partial response from the last checkpoint, or should it discard the partial response and require the user to fully retry?
- Answer: Discard partial response and require full retry (KISS approach)
- Rationale: Simpler implementation; consistent with current error handling from spec 005; aligns with "discard on error" pattern; reduces complexity of checkpoint management

**Q2: Reconnection Attempt Policy**
- Question: What is the specific reconnection attempt policy (number of attempts, backoff timing, max wait time) for both initial connection failures and mid-session connection drops?
- Answer: Exponential backoff with 3 attempts at delays [1s, 2s, 4s], then manual retry only
- Rationale: Balanced approach; prevents overwhelming server during outages; gives network time to recover; clear user feedback after 7 seconds total; requires UI for "reconnecting" state and manual retry button

**Q3: Partial Response Display During Cancellation**
- Question: How should the UI display partial responses when a user cancels mid-stream?
- Answer: Remove partial response entirely from UI (KISS approach)
- Rationale: Cleaner interface; simpler implementation; consistent with Q1's discard-on-error pattern; matches current behavior from spec 005

**Q4: WebSocket Authentication Mechanism**
- Question: How should the WebSocket connection pass the user authentication token/session for server-side validation?
- Answer: No authentication mechanism exists yet; deferred to future work
- Rationale: Authentication not implemented in current system; WebSocket connections will operate without authentication in MVP; future authentication work will address this holistically

**Q5: Message Protocol Versioning**
- Question: Should the WebSocket message protocol include a version field to support future message format changes without breaking existing clients?
- Answer: No; handle breaking changes through API versioning or separate WebSocket endpoints
- Rationale: Keep protocol simple (KISS); single-user deployment reduces versioning complexity; future breaking changes can use new endpoint paths (e.g., `/api/chat/ws/v2`); avoids per-message overhead

**Q6: Rate Limiting and Message Throttling**
- Question: Should the system implement rate limiting or throttling for message sends over a WebSocket connection to prevent abuse or accidental rapid-fire submissions?
- Answer: No rate limiting; rely on isStreaming boolean to prevent double-submission during active responses
- Rationale: Single-user deployment eliminates abuse concerns; isStreaming flag (FR-013) already prevents concurrent requests; KISS approach avoids unnecessary complexity; future multi-user scenarios can add rate limiting if needed

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Continuous Thread Conversation (Priority: P1)

As a user engaged in a multi-turn conversation within a thread, I maintain a single persistent connection that handles all my messages and responses, eliminating repeated connection overhead and enabling faster message exchanges.

**Why this priority**: This is the core value proposition. It delivers the primary performance benefit (eliminating 100-300ms handshake overhead per message) and enables the foundation for all other thread-persistent features.

**Independent Test**: Can be fully tested by opening a thread, sending 3-5 sequential messages, and verifying via browser DevTools that only one WebSocket connection exists throughout the entire conversation, with all messages multiplexed over that single connection.

**Acceptance Scenarios**:

1. **Given** I open an existing conversation thread, **When** the thread view loads, **Then** a WebSocket connection is established to the server
2. **Given** I have an active thread connection, **When** I send my first message, **Then** the response streams over the existing connection without establishing a new connection
3. **Given** I have sent a message and received a response, **When** I send a second message, **Then** it uses the same WebSocket connection as the first message
4. **Given** I have an active thread with ongoing conversation, **When** I send 5 sequential messages, **Then** all requests and responses are handled over the same single connection
5. **Given** I navigate away from the thread, **When** I leave the thread view, **Then** the connection is properly closed

---

### User Story 2 - Response Interruption and Cancellation (Priority: P2)

As a user who wants to refine or change my question while the AI is responding, I can send a new message that immediately cancels the current streaming response, preventing wasted processing and allowing me to quickly iterate on my queries.

**Why this priority**: Critical for user control and resource efficiency. Users frequently realize they need to rephrase or add context mid-response. Without cancellation, they wait for completion or face confusing overlapping responses.

**Independent Test**: Can be tested by sending a message that triggers a long response, then sending a second message mid-stream. Verify that: (1) the first response stops streaming immediately, (2) a cancellation acknowledgment is received, (3) the second request begins processing, and (4) no tokens from the first response appear after the second request starts.

**Acceptance Scenarios**:

1. **Given** the AI is streaming a response to my first message, **When** I type and send a second message, **Then** the first response stops streaming immediately
2. **Given** I send a cancellation signal, **When** the server receives it, **Then** it terminates the in-progress LangGraph stream and sends a cancellation acknowledgment
3. **Given** a response was cancelled, **When** I check the UI, **Then** the partial response is removed from the conversation view
4. **Given** I cancelled a response and sent a new message, **When** the new response begins, **Then** it is clearly associated with my new request and not confused with the cancelled one
5. **Given** a cancellation signal is sent, **When** it arrives after the response naturally completed, **Then** the server handles the race condition gracefully without error

---

### User Story 3 - Multi-Thread Concurrent Connections (Priority: P3)

As a user working across multiple conversation threads simultaneously (e.g., in different browser tabs), each thread maintains its own independent persistent connection, allowing me to interact with multiple conversations without interference.

**Why this priority**: Enables advanced multi-tasking workflows for power users. Less critical than basic thread persistence, but important for scalability and user flexibility within single-user deployment constraints.

**Independent Test**: Can be tested by opening 3 separate thread views (different threads) simultaneously and verifying via DevTools that each has its own WebSocket connection (3 total connections). Send messages in each thread and verify responses are correctly routed without cross-talk.

**Acceptance Scenarios**:

1. **Given** I have thread A open with an active connection, **When** I open thread B in a new tab, **Then** a second independent WebSocket connection is established
2. **Given** I have connections to threads A, B, and C, **When** I send messages to each thread, **Then** each response is correctly routed to the originating thread without confusion
3. **Given** I have 5 thread connections open (deployment limit), **When** all threads are actively sending/receiving messages, **Then** the system handles concurrent traffic without performance degradation
4. **Given** I close one thread tab, **When** the tab closes, **Then** only that thread's connection is terminated while others remain active

---

### User Story 4 - Connection Recovery After Disruption (Priority: P2)

As a user experiencing a network interruption during an active conversation, I receive clear feedback about the connection loss and can retry my last message to continue the conversation.

**Why this priority**: Essential for production reliability. Network disruptions are common, and without graceful recovery, users lose context and trust in the system. This directly impacts user satisfaction during inevitable failure scenarios.

**Independent Test**: Can be tested by establishing a thread connection, sending a message, then simulating network disconnection (disable WiFi or use DevTools to drop connection) mid-stream. Verify error message appears, reconnection attempts occur with exponential backoff, and user is presented with retry option after auto-reconnection fails.

**Acceptance Scenarios**:

1. **Given** I am in an active thread conversation, **When** my network connection drops, **Then** I see a clear notification that the connection was lost
2. **Given** the connection dropped mid-response, **When** the system detects the failure, **Then** the partial response is discarded and I see an option to retry my last message
3. **Given** connection is lost, **When** automatic reconnection attempts begin, **Then** I see reconnection progress with attempt count (up to 3 attempts with 1s, 2s, 4s delays)
4. **Given** automatic reconnection attempts fail, **When** all 3 attempts are exhausted (7 seconds total), **Then** I see a manual retry button with clear messaging
5. **Given** the connection is successfully re-established (auto or manual), **When** I retry my message, **Then** it is sent from scratch and the response begins streaming normally

---

### Edge Cases

- What happens when a new message is sent while the previous response is still streaming? → Client sends cancellation signal with previous requestId, server terminates in-progress stream, acknowledges cancellation, partial response is discarded from UI, then new message is processed
- How does the system handle connection drops during the initial handshake (before thread is fully loaded)? → Automatic reconnection with exponential backoff (3 attempts: 1s, 2s, 4s), then display connection error with manual retry button
- What happens if the server restarts while connections are active? → All connections are dropped, clients detect closure and attempt automatic reconnection (3 attempts with backoff), users see "reconnecting" indicator, manual retry available after auto-reconnection exhausted
- How does the system handle message ordering when rapid-fire messages are sent? → Each message has a requestId; server processes messages sequentially per connection; responses are correlated via requestId echo
- What happens if a cancellation signal arrives after the response has naturally completed? → Server checks if request is still active; if completed, ignores cancellation gracefully without error
- How does the system behave when a user has 5 connections open (deployment limit) and tries to open a sixth thread? → System allows the new connection but logs warning; operator monitoring shows connection count trending; future work may implement per-user connection limits
- What happens if the client receives response events with an unrecognized requestId? → Client logs error with details for debugging, ignores the orphaned response events, displays user-facing error if no valid response received within timeout
- How does the system handle very long idle periods (hours) on an open connection? → Connection remains open without automatic timeout per FR-016; relies on server/infrastructure defaults for TCP keepalive
- What happens if a connection drops mid-response and reconnection succeeds? → Partial response is discarded; user must manually retry their last message from scratch (no checkpoint resume per clarification)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST establish a WebSocket connection when a thread component mounts (user opens existing thread or creates new thread)
- **FR-002**: System MUST maintain the same connection across multiple request/response cycles within a single thread session
- **FR-003**: System MUST close the thread connection only on thread unmount events (navigation away, thread deletion, or explicit user close action)
- **FR-004**: Client MUST include a unique requestId field in all messages sent to the server over the thread connection
- **FR-005**: Server MUST echo the requestId in all response events (token, final, error, cancelled) to enable request/response correlation
- **FR-006**: System MUST maintain backward compatibility with existing event types (token/final/error) and message structures
- **FR-007**: Client MUST send an explicit cancellation message containing the previous requestId when sending a new message while a response is streaming
- **FR-008**: Server MUST use AbortController pattern to terminate in-progress LangGraph streams when receiving a cancellation message
- **FR-009**: Server MUST send a cancellation acknowledgment event after successfully terminating a cancelled request
- **FR-010**: System MUST prevent race conditions where cancellation arrives after natural response completion by checking request active state
- **FR-011**: Server MUST maintain per-connection state tracking the current active requestId (if any)
- **FR-012**: Client MUST maintain the WebSocket connection reference in a React useRef to persist across component renders
- **FR-013**: Client MUST track an isStreaming boolean to prevent double-submission during active responses
- **FR-014**: System MUST clean up abort controllers and request tracking on both natural completion and forced cancellation
- **FR-015**: Client MUST detect mid-stream connection drops and provide clear user feedback distinguishing retryable network errors from non-retryable server errors
- **FR-016**: System MUST NOT implement automatic idle timeout; connections remain open until explicit closure or infrastructure-level timeout
- **FR-017**: System MUST support 1-5 concurrent thread connections (one per open thread tab/view) for single-user deployment
- **FR-018**: Client MUST properly clean up WebSocket connections in React useEffect cleanup functions on component unmount
- **FR-019**: System MUST log connection lifecycle events (established, messages sent/received, cancelled, reconnected, closed) with structured logging
- **FR-020**: System MUST implement dual-ID correlation: connectionId for connection lifecycle tracking + requestId for individual request/response pairs
- **FR-021**: System MUST track metrics: average messages per connection, cancellation rate, reconnection frequency, connection duration

### Key Entities

- **Thread Connection**: Represents the persistent WebSocket connection for a single conversation thread. Key attributes include connectionId (UUID), threadId, userId, connection state (connecting/connected/disconnecting/closed), current active requestId, connection timestamp, and message count. Lifecycle spans from thread component mount to unmount.

- **Request Correlation**: Represents the tracking information for a single request/response exchange over a multiplexed connection. Key attributes include requestId (UUID), connectionId, timestamp, and request status (pending/streaming/completed/cancelled/error).

- **Cancellation Signal**: Represents an explicit cancellation command sent from client to server. Contains requestId of the request to cancel and timestamp. Triggers AbortController termination on server side.

- **Connection State**: Represents the server-side state maintained per WebSocket connection. Contains connectionId, associated threadId and userId, currently active requestId (nullable), abort controller for active request (nullable), message count, and connection metrics.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Second and subsequent messages in a thread session show response streaming start within 50ms of message send (eliminating 100-300ms connection handshake overhead)
- **SC-002**: System successfully maintains a single connection for 90% of multi-turn conversations (5+ messages) without unintended disconnections
- **SC-003**: When user sends a new message during active streaming, the previous response terminates within 200ms and the cancellation is acknowledged before the new response begins
- **SC-004**: Connection drops are detected within 2 seconds and user receives clear error feedback indicating whether retry is recommended
- **SC-005**: System supports 5 concurrent thread connections without performance degradation (measured by <100ms additional latency per connection under simultaneous load)
- **SC-006**: WebSocket connections are properly cleaned up within 500ms of thread component unmount, verified by zero memory leaks in 30-minute stress test
- **SC-007**: Average messages per connection increases to ≥3 (from current 1-per-connection), demonstrating successful connection reuse
- **SC-008**: Cancellation rate (cancelled requests / total requests) is measurable and logged for operational monitoring
- **SC-009**: Reconnection attempts succeed within 5 seconds for 95% of transient network failures (temporary drops <10 seconds)
- **SC-010**: Structured logs enable debugging of multiplexed requests with clear correlation between connectionId and requestId visible in every log entry

## Assumptions

1. **Thread Identification**: Thread ID is available in the component props/context when the thread view mounts
2. **User Authentication**: No authentication mechanism exists in current system; WebSocket connections will operate without authentication in MVP (deferred to future work)
3. **Connection Limits**: Single-user deployment assumption holds; 1-5 concurrent connections is sufficient for MVP
4. **Browser Support**: Modern browsers (Chrome, Firefox, Safari, Edge) support WebSocket API and AbortController
5. **LangGraph Cancellation**: LangGraph streaming can be terminated via AbortController/signal pattern (verify with LangGraph documentation)
6. **React Component Lifecycle**: Thread view is implemented as a React component with standard mount/unmount lifecycle
7. **RequestId Generation**: UUID v4 or similar is acceptable for requestId uniqueness (collision probability negligible for single-user deployment)
8. **Infrastructure Defaults**: Underlying infrastructure (load balancers, proxies) supports long-lived WebSocket connections without aggressive timeouts
9. **Recovery Strategy**: Discard-and-retry approach is acceptable for connection failures; users can re-send messages without checkpoint resume complexity
10. **Reconnection Policy**: 3 automatic reconnection attempts with exponential backoff [1s, 2s, 4s] provides sufficient coverage for transient network issues
11. **Monitoring Infrastructure**: Structured logging infrastructure (Pino) is already configured and can accommodate additional connection/request tracking fields
12. **Protocol Versioning**: No per-message version field required; future breaking changes will use separate WebSocket endpoint paths (e.g., `/api/chat/ws/v2`) to maintain simplicity

## Dependencies

### Internal Dependencies

- Existing WebSocket route implementation (`GET /api/chat/ws`)
- Current message event types (token/final/error) and schemas
- LangGraph streaming implementation with AbortController support
- React chat UI components (thread view, message list, input)
- Structured logging setup (Pino)

### External Dependencies

- Browser WebSocket API (native)
- React useRef and useEffect hooks (already in use)
- UUID generation library (for requestId generation)
- LangGraph abort/cancellation support (verify compatibility)
- `vitest-websocket-mock` or `mock-socket` for testing multiplexed connections

## Out of Scope

The following items are explicitly **not** included in this feature:

- **WebSocket Authentication/Authorization**: User authentication and session validation for WebSocket connections (no auth mechanism exists in current system; deferred to future work)
- **Message Rate Limiting/Throttling**: Explicit rate limits or throttling mechanisms beyond isStreaming flag (single-user deployment eliminates abuse concerns; deferred to future multi-user scenarios)
- **Server-Initiated Thread Events**: Proactive server notifications (e.g., "new message in another thread") or server-driven thread updates
- **Multi-User Thread Synchronization**: Collaborative threads where multiple users share a single thread connection
- **Cross-Thread Message Ordering**: Global ordering of messages across multiple concurrent threads
- **Checkpoint-Based Resume**: Resuming partial responses from LangGraph checkpoints after connection failures (decided against per clarification - using discard-and-retry instead)
- **Partial Response Preservation**: UI display or storage of cancelled/interrupted partial responses (decided against per clarification - partial responses are discarded)
- **Advanced Reconnection Strategies**: Reconnection policies beyond 3-attempt exponential backoff (decided against per clarification)
- **Message Persistence Queue**: Offline message queuing for delivery when connection is restored
- **Connection Pooling**: Server-side connection pooling or load balancing across multiple backend instances
- **Binary Message Support**: Non-text message types (images, files) over WebSocket
- **Custom Compression**: Message-level compression beyond default WebSocket compression (if enabled)
- **Connection Analytics Dashboard**: Real-time UI displaying connection health, metrics, or active connection count (logs only for MVP)
- **Per-User Connection Limits Enforcement**: Hard enforcement of connection count limits per user (monitoring/logging only for MVP)
- **Guaranteed Message Delivery**: Exactly-once or at-least-once delivery guarantees for messages during connection instability
