# Tasks: Thread-Persistent WebSocket Connections

**Input**: Design documents from `/Users/ronny/dev/cerebrobot/specs/006-migrate-to-thread/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: NOT included (no test requirement in feature spec; manual smoke tests per constitution)

**Organization**: Tasks grouped by user story to enable independent implementation and testing

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and shared type definitions

- [X] T001 [P] Create shared WebSocket message schemas in `packages/chat-shared/src/schemas/connection.ts`
  - Add `ChatMessage` interface (`{ type: 'message', requestId: string, threadId: string, content: string }`)
  - Add `CancellationSignal` interface (`{ type: 'cancel', requestId: string }`)
  - Add `ClientMessage` union type
  - Export Zod schemas: `chatMessageSchema`, `cancellationSignalSchema`, `clientMessageSchema`

- [X] T002 [P] Update existing event schemas in `packages/chat-shared/src/schemas/chat.ts`
  - Add `requestId: string` field to `TokenEvent` interface and schema
  - Add `requestId: string` field to `FinalEvent` interface and schema
  - Add `requestId: string` field to `ErrorEvent` interface and schema
  - Add new `CancelledEvent` interface (`{ type: 'cancelled', requestId: string }`)
  - Update `ServerEvent` union type to include `CancelledEvent`
  - Export `cancelledEventSchema` Zod validator

- [X] T003 Create TypeScript types for connection state in `packages/chat-shared/src/types/connection.ts`
  - Export `ConnectionState` type: `'connecting' | 'connected' | 'disconnecting' | 'closed'`
  - Export `ConnectionInfo` interface with `connectionId`, `threadId`, `activeRequestId`, `connectedAt`, `messageCount`
  - Export `RequestStatus` type: `'pending' | 'streaming' | 'completed' | 'cancelled' | 'error'`

**Checkpoint**: Shared types available for both client and server implementation

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core connection management infrastructure that MUST be complete before ANY user story can start

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create server-side ConnectionManager class in `apps/server/src/chat/connection-manager.ts`
  - Export `ConnectionState` interface with `connectionId`, `threadId`, `socket`, `activeRequestId`, `abortController`, `messageCount`
  - Implement `ConnectionManager` class with private `Map<string, ConnectionState>`
  - Implement `register(connectionId, threadId, socket)` method
  - Implement `get(connectionId)` method returning `ConnectionState | undefined`
  - Implement `setActiveRequest(connectionId, requestId, controller)` method
  - Implement `clearActiveRequest(connectionId)` method
  - Implement `abort(connectionId, requestId)` method returning boolean (true if cancelled)
  - Implement `unregister(connectionId)` method with cleanup (abort active request if any)
  - Add Pino logging for all connection lifecycle events

- [X] T005 Create client-side useThreadConnection hook in `apps/client/src/hooks/useThreadConnection.ts`
  - Accept `threadId: string` parameter
  - Create `wsRef` using `useRef<WebSocket | null>(null)`
  - Create `inflightRequests` using `useRef<Map<string, ResponseHandler>>(new Map())`
  - Create `isConnected` state using `useState<boolean>(false)`
  - Implement `useEffect` with threadId dependency:
    - Create WebSocket with URL `/api/chat/ws?threadId=${threadId}`
    - Setup `onopen` handler → `setIsConnected(true)`, log connection
    - Setup `onclose` handler → `setIsConnected(false)`, log disconnection
    - Setup `onerror` handler → log error
    - Setup `onmessage` handler → parse JSON, extract requestId, route to handler from inflightRequests Map
    - Return cleanup function → close WebSocket, clear inflightRequests
  - Implement `sendMessage(content, onToken, onComplete, onError)` function:
    - Generate requestId via `crypto.randomUUID()`
    - Create handler function routing events to callbacks based on type
    - Add handler to inflightRequests Map
    - Send JSON message `{ type: 'message', requestId, threadId, content }`
    - Return requestId for cancellation tracking
  - Implement `cancelMessage(requestId)` function:
    - Send JSON cancellation signal `{ type: 'cancel', requestId }`
  - Return object `{ sendMessage, cancelMessage, isConnected }`

- [X] T006 Create client-side useReconnection hook in `apps/client/src/hooks/useReconnection.ts`
  - Export `RECONNECT_DELAYS` constant: `[1000, 2000, 4000]` (1s, 2s, 4s)
  - Export `MAX_ATTEMPTS` constant: `3`
  - Accept `isConnected: boolean` and `reconnectFn: () => void` parameters
  - Create `attemptRef` using `useRef<number>(0)`
  - Create `timerRef` using `useRef<NodeJS.Timeout | null>(null)`
  - Implement `useEffect` with isConnected dependency:
    - If connected: reset attemptRef to 0, clear timer
    - If disconnected: start reconnection attempts with exponential backoff
    - Each attempt: log attempt number, wait RECONNECT_DELAYS[attempt], call reconnectFn
    - Stop after MAX_ATTEMPTS reached
    - Return cleanup function → clear timer

**Checkpoint**: Foundation ready - connection management infrastructure complete, user story implementation can now begin

---

## Phase 3: User Story 1 - Continuous Thread Conversation (Priority: P1) 🎯 MVP

**Goal**: Single persistent connection handles multiple request/response cycles within a thread, eliminating connection handshake overhead

**Independent Test**: Open thread, send 3-5 sequential messages, verify via DevTools that only one WebSocket connection exists, all messages multiplexed over same connection

### Implementation for User Story 1

- [X] T007 [US1] Update WebSocket route in `apps/server/src/chat/routes.ts` for thread-persistent connections
  - Import `ConnectionManager` from `./connection-manager`
  - Create singleton `connectionManager` instance
  - Modify `/api/chat/ws` route handler:
    - Extract `threadId` from query parameters
    - Validate threadId exists (close with code 1008 if missing)
    - Generate `connectionId` via `crypto.randomUUID()`
    - Call `connectionManager.register(connectionId, threadId, connection.socket)`
    - Log connection established with connectionId and threadId
    - Setup `connection.socket.on('message')` handler → parse JSON, route based on message type
    - Setup `connection.socket.on('close')` handler → call `connectionManager.unregister(connectionId)`, log closure
  - Remove any existing auto-close logic after message completion (connections must persist)

- [X] T008 [US1] Implement message handling in `apps/server/src/chat/routes.ts`
  - Create `handleChatMessage(connectionId, message)` async function:
    - Get connection state via `connectionManager.get(connectionId)`
    - Extract `requestId`, `content`, `threadId` from message
    - Create new `AbortController`
    - Call `connectionManager.setActiveRequest(connectionId, requestId, abortController)`
    - Start try/catch block for LangGraph streaming:
      - Call `agent.stream(input, { configurable: { thread_id: threadId }, signal: abortController.signal })`
      - For each chunk: extract token, send `{ type: 'token', requestId, token }` event
      - On completion: send `{ type: 'final', requestId, response }` event
    - Catch `AbortError`: log cancellation (don't send error event, cancellation acknowledgment sent separately)
    - Catch other errors: send `{ type: 'error', requestId, error }` event
    - Finally: call `connectionManager.clearActiveRequest(connectionId)`
  - In message handler: if `message.type === 'message'`, call `handleChatMessage(connectionId, message)`

- [X] T009 [US1] Add AbortSignal support to LangGraph agent in `apps/server/src/agent/langgraph-agent.ts`
  - Modify streaming method signatures to accept `signal?: AbortSignal` in config parameter
  - Pass signal to LangGraph `agent.stream()` calls
  - Document AbortController usage in method JSDoc comments
  - Ensure signal propagates through all streaming code paths

- [X] T010 [US1] Update client chat messages hook in `apps/client/src/hooks/useChatMessages.ts`
  - Import `useThreadConnection` hook
  - Replace manual WebSocket creation with `const { sendMessage, cancelMessage, isConnected } = useThreadConnection(threadId)`
  - Create `isStreaming` state via `useState<boolean>(false)`
  - Create `currentRequestId` state via `useState<string | null>(null)`
  - Implement `handleSendMessage(content)` function:
    - Set `isStreaming = true`
    - Call `sendMessage(content, onToken, onComplete, onError)` with callbacks:
      - `onToken`: append token to streaming message in messages state
      - `onComplete`: finalize message content, set `isStreaming = false`, clear `currentRequestId`
      - `onError`: log error, set `isStreaming = false`, clear `currentRequestId`
    - Store returned requestId in `currentRequestId` state
  - Return `{ messages, handleSendMessage, isStreaming, isConnected, currentRequestId }`

- [X] T011 [US1] Update ChatView component in `apps/client/src/components/ChatView.tsx`
  - Import updated `useChatMessages` hook
  - Destructure `isConnected` from hook return
  - Add connection status indicator UI:
    - Show 🟢 "Connected" when `isConnected === true`
    - Show 🔴 "Disconnected" when `isConnected === false`
  - Disable message input when `!isConnected || isStreaming`
  - Remove any existing one-message-per-connection WebSocket logic

- [X] T012 [US1] Add dual-ID logging throughout connection lifecycle
  - In `ConnectionManager`: log connectionId in all methods (register, setActiveRequest, abort, unregister)
  - In `handleChatMessage`: log both connectionId and requestId for all events (token sent, final sent, error sent)
  - Use structured Pino logging with `{ connectionId, requestId, threadId }` fields
  - Ensure logs enable tracing: connection establishment → message correlation → cleanup

**Checkpoint**: At this point, User Story 1 should be fully functional - single connection handles multiple messages

---

## Phase 4: User Story 2 - Response Interruption and Cancellation (Priority: P2)

**Goal**: User can send new message mid-stream to immediately cancel current response and start new request

**Independent Test**: Send message triggering long response, send second message mid-stream, verify: (1) first response stops, (2) cancellation acknowledgment received, (3) second request begins, (4) no first-response tokens after second request starts

### Implementation for User Story 2

- [X] T013 [US2] Implement cancellation handler in `apps/server/src/chat/routes.ts`
  - Create `handleCancellation(connectionId, requestId)` async function:
    - Call `connectionManager.abort(connectionId, requestId)` (returns boolean)
    - If true (cancellation successful):
      - Get connection state
      - Send `{ type: 'cancelled', requestId }` acknowledgment event
      - Log cancellation with connectionId and requestId
    - If false (already completed): noop gracefully, log race condition detected
  - In message handler: if `message.type === 'cancel'`, call `handleCancellation(connectionId, message.requestId)`

- [X] T014 [US2] Add cancellation logic to client useChatMessages hook in `apps/client/src/hooks/useChatMessages.ts`
  - Modify `handleSendMessage` to check `isStreaming`:
    - If `isStreaming === true` and `currentRequestId !== null`:
      - Call `cancelMessage(currentRequestId)` BEFORE sending new message
      - Wait for cancellation acknowledgment (update onToken callback to handle 'cancelled' event)
    - Remove partial streaming message from messages state
    - Then proceed with sending new message
  - Update message event handler to process `type: 'cancelled'` events:
    - Remove requestId from any tracking
    - Set `isStreaming = false`
    - Clear `currentRequestId`

- [X] T015 [US2] Add cancel button UI in `apps/client/src/components/ChatView.tsx`
  - Show "Cancel" button when `isStreaming === true`
  - Button click handler:
    - Call `cancelMessage(currentRequestId)` if currentRequestId exists
    - Disable button during cancellation (wait for acknowledgment)
  - Remove partial response from UI when cancellation acknowledged
  - Update UX to show "Cancelling..." state during abort

- [X] T016 [US2] Add AbortController cleanup in `apps/server/src/chat/connection-manager.ts`
  - In `clearActiveRequest`: ensure AbortController is aborted before clearing (defensive cleanup)
  - In `unregister`: abort active request if any before deleting connection state
  - Add logging for cleanup operations with connectionId and requestId context

**Checkpoint**: At this point, User Stories 1 AND 2 work independently - cancellation functional

---

## Phase 5: User Story 3 - Multi-Thread Concurrent Connections (Priority: P3)

**Goal**: Multiple thread views (different tabs/windows) each maintain independent persistent connections without interference

**Independent Test**: Open 3 separate thread views (different threads) simultaneously, verify via DevTools 3 WebSocket connections exist, send messages in each thread, verify responses correctly routed

### Implementation for User Story 3

- [X] T017 [US3] Add connection limit monitoring in `apps/server/src/chat/connection-manager.ts`
  - Add `getConnectionCount()` method returning `connections.size`
  - In `register` method: log warning if connection count exceeds 5 (deployment limit from spec)
  - Add `getConnectionsByThread(threadId)` method returning array of connectionIds for a thread
  - Log multi-connection scenarios (same thread, different connectionIds)

- [X] T018 [US3] Verify thread isolation in message routing
  - In `handleChatMessage`: validate incoming message threadId matches connection's registered threadId
  - If mismatch: close connection with error code 1008 "Thread ID mismatch"
  - Log thread validation events with connectionId, expected threadId, received threadId
  - Ensure no cross-thread message leakage possible
  - **Validation methodology**:
    - Open two threads simultaneously (threadA with connectionId1, threadB with connectionId2)
    - Send message to threadA with threadA's threadId → verify response has correct requestId, logged with connectionId1
    - Send message to threadB with threadB's threadId → verify response has correct requestId, logged with connectionId2
    - Attempt to send message to threadA's WebSocket with threadB's threadId → verify connection closes with 1008 error
    - Check logs: confirm no threadA messages logged under connectionId2 or vice versa

- [X] T019 [US3] Verify multi-thread connection independence in client
  - **Purpose**: Validate that multiple ThreadView components maintain independent WebSocket connections
  - Test opening multiple ThreadView components with different threadIds (e.g., open 3 browser tabs or windows)
  - Use browser DevTools Network tab to confirm each thread has its own WebSocket connection
  - Verify each component has isolated connection state:
    - Each useThreadConnection(threadId) creates separate WebSocket instance
    - No shared wsRef or inflightRequests between components
    - Closing one thread tab doesn't affect other threads' connections
  - Verify DevTools shows N WebSocket connections for N open threads (up to 5 per deployment limit)
  - **This is validation/testing only** - no new code required beyond T005 (useThreadConnection already provides isolation)

**Checkpoint**: All user stories 1, 2, AND 3 work independently - multi-thread support functional

---

## Phase 6: User Story 4 - Connection Recovery After Disruption (Priority: P2)

**Goal**: Clear feedback on connection loss, automatic reconnection with exponential backoff, manual retry after auto-reconnection fails

**Independent Test**: Establish connection, send message, simulate disconnect (disable WiFi) mid-stream, verify error message, reconnection attempts with backoff, manual retry option after 3 failed attempts

### Implementation for User Story 4

- [ ] T020 [US4] Integrate useReconnection hook in `apps/client/src/hooks/useChatMessages.ts`
  - Create reconnection trigger state: `const [reconnectTrigger, setReconnectTrigger] = useState(0)`
  - Call `useReconnection(isConnected, () => setReconnectTrigger(prev => prev + 1))`
  - Add `reconnectTrigger` to `useThreadConnection` useEffect dependencies (forces WebSocket recreation)
  - Ensure old WebSocket is cleaned up before new connection attempt

- [ ] T021 [US4] Add reconnection UI states in `apps/client/src/components/ThreadView.tsx`
  - Track reconnection attempt count in component state
  - Display connection status indicator:
    - 🟢 "Connected" when `isConnected === true`
    - 🟡 "Reconnecting... (Attempt X/3)" when reconnection in progress
    - 🔴 "Disconnected" with "Retry" button when reconnection exhausted
  - Manual retry button click:
    - Increment reconnectTrigger to force new connection attempt
    - Reset attempt counter
  - Disable message input during reconnection attempts

- [ ] T022 [US4] Handle connection loss during streaming in `apps/client/src/hooks/useChatMessages.ts`
  - In WebSocket `onclose` handler within `useThreadConnection`:
    - Check if `isStreaming === true` (message in progress)
    - If yes: discard partial response from messages state
    - Clear `currentRequestId` and set `isStreaming = false`
    - Trigger reconnection logic (useReconnection hook handles this)
  - Add error state for "Connection lost, message not sent - retry available"

- [ ] T023 [US4] Add connection health logging in `apps/server/src/chat/connection-manager.ts`
  - Log connection close events with close code and reason
  - Distinguish normal closure (code 1000) from abnormal (1006, network errors)
  - Track connection duration: `closedAt - connectedAt` in metrics
  - Log reconnection events (same threadId, new connectionId)

**Checkpoint**: All user stories fully functional - complete connection lifecycle with recovery

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements affecting multiple user stories

- [ ] T024 [P] Add connection metrics tracking in `apps/server/src/chat/connection-manager.ts`
  - Track average messages per connection: `totalMessages / connectionCount`
  - Track cancellation rate: `cancelledRequests / totalRequests`
  - Track reconnection frequency: reconnections per hour
  - Track connection duration: average time from register to unregister
  - Expose metrics via structured logging (log summary every 5 minutes)

- [ ] T025 [P] Update documentation in `docs/`
  - Create or update WebSocket architecture documentation
  - Document thread-persistent connection pattern
  - Document requestId correlation pattern
  - Document cancellation flow with AbortController
  - Document reconnection strategy (exponential backoff [1s, 2s, 4s])

- [ ] T026 Code cleanup and refactoring across all modified files
  - **Completion Criteria**:
    1. **Remove unused imports**: Scan all modified files with ESLint, remove imports flagged as unused
    2. **Remove dead code**: Delete one-message-per-connection pattern remnants (old WebSocket creation logic, single-use handlers)
    3. **Consolidate error handlers**: Merge duplicate error handling logic in ConnectionManager and useThreadConnection into shared utility functions
    4. **Add JSDoc documentation**: Document public APIs:
       - `ConnectionManager` class constructor and public methods (handleConnection, correlateResponse, cleanup)
       - `useThreadConnection` hook parameters and return value
       - `useReconnection` hook parameters and return value
    5. **Verify consistent log format**: All Pino logs use structured format with fields: `{threadId, requestId, event, ...metadata}` (no string interpolation)
    6. **Extract constants**: Move magic numbers to named constants:
       - `MAX_RECONNECT_ATTEMPTS = 3`
       - `RECONNECT_DELAYS_MS = [1000, 2000, 4000]`
       - `WS_CLOSE_CODE_INVALID_THREAD = 1008`
    7. **Type safety**: Ensure all WebSocket event handlers have explicit types (no `any`)
  - Run `pnpm lint` and `pnpm format:write` after cleanup
  - No functional changes - purely refactoring for maintainability

- [ ] T027 Run quickstart.md validation
  - Follow migration guide in `specs/006-migrate-to-thread/quickstart.md`
  - Verify all code examples compile and run
  - Test manual smoke test scenarios:
    - Multi-message conversation on single connection
    - Mid-stream cancellation
    - Network disconnect and reconnection
    - Multi-thread concurrent usage
  - Validate FR-016 (no automatic idle timeout):
    - Open thread connection, wait 10 minutes idle (no messages)
    - Verify connection remains open (readyState === WebSocket.OPEN)
    - Verify no timeout logic in ConnectionManager or useThreadConnection
    - Send message after idle period, verify it processes normally
  - Document any deviations from quickstart in implementation

- [ ] T028 Performance optimization
  - Review WebSocket message parsing (ensure minimal overhead)
  - Verify requestId Map operations are O(1) (already using Map)
  - Check for memory leaks in inflightRequests Map (ensure cleanup on all paths)
  - Profile connection cleanup (ensure 500ms target met per SC-006)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-6)**: All depend on Foundational phase completion
  - User stories CAN proceed in parallel (if team capacity allows)
  - Recommended sequential order for single developer: US1 → US2 → US4 → US3
  - US2 (Cancellation) depends on US1 (persistent connection) being functional
  - US4 (Reconnection) independent of US2/US3 but builds on US1
  - US3 (Multi-thread) can be implemented last (validation-focused)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundational (Phase 2) - No dependencies on other stories ✅ MVP
- **User Story 2 (P2)**: Depends on US1 (needs persistent connection working) - Can integrate after US1
- **User Story 3 (P3)**: Depends on US1 (needs connection management working) - Independent of US2/US4
- **User Story 4 (P2)**: Depends on US1 (needs connection lifecycle working) - Independent of US2/US3

### Within Each User Story

- US1: Schemas → ConnectionManager → useThreadConnection → Route updates → useChatMessages → UI
- US2: Server cancellation handler → Client cancel logic → Cancel button UI → Cleanup
- US3: Connection limit monitoring → Thread isolation validation → Client testing
- US4: useReconnection integration → Reconnection UI → Connection loss handling → Metrics

### Parallel Opportunities

- **Phase 1 (Setup)**: All 3 tasks (T001, T002, T003) can run in parallel (different files)
- **Phase 2 (Foundational)**: No parallelization (sequential dependencies)
- **User Stories**: If team has 2+ developers:
  - After Foundational complete, one developer starts US1
  - Once US1 complete, split: Dev A does US2, Dev B does US4
  - Dev C can work on US3 in parallel with US2/US4
- **Phase 7 (Polish)**: T024, T025, T028 can run in parallel (different files)

---

## Parallel Example: Setup Phase

```bash
# Launch all setup tasks together:
Task: "Create shared WebSocket message schemas in packages/chat-shared/src/schemas/connection.ts"
Task: "Update existing event schemas in packages/chat-shared/src/schemas/chat.ts"  
Task: "Create TypeScript types for connection state in packages/chat-shared/src/types/connection.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T006) - CRITICAL
3. Complete Phase 3: User Story 1 (T007-T012)
4. **STOP and VALIDATE**: Test multi-message conversation on single connection via DevTools
5. Deploy/demo MVP - single persistent connection working

### Incremental Delivery

1. Foundation (Phases 1-2) → Infrastructure ready
2. Add US1 (Phase 3) → Test independently → Deploy/Demo (MVP! 🎯)
3. Add US2 (Phase 4) → Test independently → Deploy/Demo (cancellation added)
4. Add US4 (Phase 6) → Test independently → Deploy/Demo (reconnection added)
5. Add US3 (Phase 5) → Test independently → Deploy/Demo (multi-thread validated)
6. Polish (Phase 7) → Final deployment

### Parallel Team Strategy

With 2 developers:

1. Both complete Setup + Foundational together (Phases 1-2)
2. Dev A: User Story 1 (Phase 3)
3. After US1 complete:
   - Dev A: User Story 2 (Phase 4)
   - Dev B: User Story 4 (Phase 6)
4. Either dev: User Story 3 (Phase 5) - validation-focused
5. Both: Polish (Phase 7) - divide T024-T028

---

## Notes

- No test tasks included (manual smoke tests per constitution; no test requirement in spec)
- [P] tasks = different files, no shared state
- [Story] label maps task to specific user story (US1, US2, US3, US4)
- Each user story independently completable and testable
- Commit after each task or logical group
- Stop at checkpoints to validate story independently
- Success criteria from spec map to user stories:
  - SC-001, SC-002, SC-007 → US1 (connection persistence)
  - SC-003 → US2 (cancellation)
  - SC-005 → US3 (multi-thread)
  - SC-004, SC-009 → US4 (reconnection)
  - SC-006, SC-008, SC-010 → Cross-cutting (Phase 7)
- Dual-ID logging (connectionId + requestId) implemented throughout per FR-020
- All WebSocket cleanup must complete within 500ms per SC-006
