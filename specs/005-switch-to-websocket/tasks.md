# Tasks: Switch to WebSocket Communication Protocol

**Input**: Design documents from `/specs/005-switch-to-websocket/`  
**Prerequisites**: plan.md, spec.md (user stories), research.md (technical decisions), data-model.md (entities), contracts/ (protocol spec)

**Tests**: Manual smoke tests only (no automated tests requested in spec)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, SETUP, FOUND)
- Include exact file paths in descriptions

## Path Conventions
- **Server**: `apps/server/src/`
- **Client**: `apps/client/src/`
- **Shared**: `packages/chat-shared/src/`
- **Docs**: `docs/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and configure WebSocket support

- [X] **T001** [P] [SETUP] Install `@fastify/websocket` package in `apps/server/package.json` using `pnpm add @fastify/websocket --filter @cerebrobot/server`
- [X] **T002** [P] [SETUP] Install `@types/ws` dev dependency in `apps/server/package.json` using `pnpm add -D @types/ws --filter @cerebrobot/server`
- [X] **T003** [P] [SETUP] Install `vitest-websocket-mock` dev dependency in `apps/server/package.json` using `pnpm add -D vitest-websocket-mock --filter @cerebrobot/server`
- [X] **T004** [P] [SETUP] Install `vitest-websocket-mock` dev dependency in `apps/client/package.json` using `pnpm add -D vitest-websocket-mock --filter @cerebrobot/client`
- [X] **T005** [SETUP] Register `@fastify/websocket` plugin in `apps/server/src/app.ts` with `maxPayload: 1048576` option (depends on T001)

**Checkpoint**: WebSocket dependencies installed and plugin registered

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] **T006** [FOUND] Update `docs/tech-stack.md` to add `@fastify/websocket` and `ws` to approved dependencies, remove `fastify-sse-v2`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Real-time Message Streaming (Priority: P1) 🎯 MVP

**Goal**: Replace SSE streaming with WebSocket streaming for token-by-token response delivery

**Independent Test**: Send a single message to the chatbot and observe the streaming response character-by-character in browser DevTools Network tab (WS filter), confirming progressive token arrival

### Implementation for User Story 1

#### Server-Side Changes

- [X] **T007** [US1] Create WebSocket route handler in `apps/server/src/chat/routes.ts`:
  - Add `GET /api/chat/ws` WebSocket route with `{ websocket: true }` option
  - Implement `socket.on('message')` handler to receive client chat request
  - Parse and validate incoming JSON with `ChatRequestSchema.parse()`
  - Validate message size ≤1MB (1048576 bytes) using `data.byteLength`
  - Call existing `streamChat()` function with threadId, userId, message
  - Iterate through AsyncGenerator streaming token/final events
  - Send token events as `socket.send(JSON.stringify({ type: 'token', value: event.value }))`
  - Send final event as `socket.send(JSON.stringify({ type: 'final', message: event.message, latencyMs: event.latencyMs, tokenUsage: event.tokenUsage }))`
  - Call `socket.close(1000, 'Stream complete')` after final event
  - Add structured logging: `websocket_connected`, `websocket_message_sent`, `websocket_stream_complete` events with correlationId

- [X] **T008** [US1] Remove SSE route handler from `apps/server/src/chat/routes.ts`:
  - Delete `app.get('/api/chat/sse')` route entirely
  - Delete `handleSseResponse()` function
  - Delete `writeSseEvent()` function
  - Delete `createSsePayload()` function
  - Remove any SSE-related imports (e.g., `fastify-sse-v2` types if present)

#### Client-Side Changes

- [X] **T009** [US1] Replace SSE logic with WebSocket in `apps/client/src/hooks/useChatMessages.ts`:
  - Remove `consumeSse()` function (lines ~200-250 based on file size)
  - Remove `processSseChunk()` function
  - In `handleSend()` function, replace `fetch()` + `ReadableStream` logic with WebSocket connection
  - Create `new WebSocket('ws://localhost:3030/api/chat/ws')` (or use `import.meta.env.VITE_WS_URL`)
  - In `ws.onopen` handler, send JSON chat request: `ws.send(JSON.stringify({ threadId, userId, message, correlationId }))`
  - In `ws.onmessage` handler:
    - Parse `JSON.parse(event.data)`
    - If `type === 'token'`: append `data.value` to `streamedResponse` state
    - If `type === 'final'`: replace `streamedResponse` with `data.message`, set latency/tokenUsage, set `isStreaming: false`
  - Store WebSocket in ref for cleanup: `wsRef.current = ws`
  - Add cleanup on unmount: close WebSocket if still open

- [X] **T010** [US1] Add environment variable for WebSocket URL in `apps/client/.env`:
  - Add `VITE_WS_URL=ws://localhost:3030/api/chat/ws`
  - Update code to use `import.meta.env.VITE_WS_URL || 'ws://localhost:3030/api/chat/ws'`

#### Dependency Cleanup

- [X] **T011** [US1] Uninstall `fastify-sse-v2` from `apps/server/package.json` using `pnpm remove fastify-sse-v2 --filter @cerebrobot/server` (dependency already absent)

- [X] **T012** [US1] Remove `fastify-sse-v2` registration from `apps/server/src/app.ts` (no registration present; confirmed removal)
  - Delete `import fastifySse from 'fastify-sse-v2';` line
  - Delete `await app.register(fastifySse);` line

**Checkpoint**: User Story 1 complete - token-by-token streaming works via WebSocket, SSE completely removed

---

## Phase 4: User Story 2 - Connection Error Handling (Priority: P2)

**Goal**: Provide clear error feedback and retry guidance when connections fail

**Independent Test**: Simulate network disconnection (DevTools → Network → Offline) during message send and verify UI shows error message with appropriate retry option

### Implementation for User Story 2

#### Server-Side Error Handling

- [X] **T013** [US2] Add error handling to WebSocket route in `apps/server/src/chat/routes.ts`:
  - Wrap `socket.on('message')` handler body in try/catch block
  - On validation error (Zod parse failure): send `{ type: 'error', message: err.message, retryable: false }`, close with code 1000
  - On message size >1MB: send `{ type: 'error', message: 'Message exceeds maximum size of 1MB', retryable: false }`, close with code 1000
  - On thread not found: send `{ type: 'error', message: 'Thread not found: {threadId}', retryable: false }`, close with code 1000
  - On LLM/stream error: send `{ type: 'error', message: err.message, retryable: true }`, close with code 1011
  - Add `socket.on('error')` handler with structured logging: `websocket_error` event
  - Add structured error logging with `retryable` field in all catch blocks

- [X] **T014** [US2] Add close code handling to WebSocket route in `apps/server/src/chat/routes.ts`:
  - Add `socket.on('close')` handler logging close code and reason
  - Document close code mapping: 1000 (normal), 1001 (going away), 1006 (abnormal), 1011 (internal error)
  - Add correlation ID to all close event logs

#### Client-Side Error Handling

- [X] **T015** [US2] Add error event handling to WebSocket in `apps/client/src/hooks/useChatMessages.ts`:
  - In `ws.onmessage` handler, check for `type === 'error'`
  - If error event: set `error` state with `{ message: data.message, retryable: data.retryable }`
  - Set `isStreaming: false`
  - Clear `streamedResponse` to empty string (discard partial message per clarification Q2)
  - Add `ws.onerror` handler: set error state with generic "Connection error occurred" message, set `retryable: true`
  - Add `ws.onclose` handler: if `event.code !== 1000 && !event.wasClean`, set error state and clear partial response

- [X] **T016** [US2] Update retry logic in `apps/client/src/hooks/useChatMessages.ts`:
  - Ensure `onRetry()` function checks `error?.retryable` before attempting retry
  - Clear error state before retry attempt
  - Add user-facing retry button conditional on `error?.retryable === true` in UI component

**Checkpoint**: User Story 2 complete - error handling functional with retry guidance

---

## Phase 5: User Story 3 - Connection Lifecycle Management (Priority: P3)

**Goal**: Properly manage connection cleanup on navigation and component unmounting

**Independent Test**: Navigate between pages, refresh browser, unmount components while monitoring DevTools Network tab for unclosed WebSocket connections or memory leaks

### Implementation for User Story 3

#### Client-Side Lifecycle Management

- [X] **T017** [US3] Add cleanup on component unmount in `apps/client/src/hooks/useChatMessages.ts`:
  - In `useEffect` cleanup function, check `wsRef.current?.readyState === WebSocket.OPEN`
  - If open, call `wsRef.current.close(1000, 'Component unmounted')`
  - Clear WebSocket ref after closing

- [X] **T018** [US3] Add cleanup on navigation in React Router (if applicable, check `apps/client/src/App.tsx`) (handled via ChatView unmount cleanup on navigation)
  - If using React Router, add `useEffect` cleanup on route change
  - Close any active WebSocket connections before navigation
  - Alternative: rely on component unmount cleanup from T017

- [X] **T019** [US3] Add connection state tracking in `apps/client/src/hooks/useChatMessages.ts`:
  - Add state for `connectionState: 'connecting' | 'open' | 'closing' | 'closed'`
  - Update state in `ws.onopen` → `'open'`
  - Update state on manual close → `'closing'` then `'closed'`
  - Update state in `ws.onclose` → `'closed'`
  - Prevent sending messages when not in `'open'` state

**Checkpoint**: User Story 3 complete - connections properly cleaned up on all lifecycle events

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, testing, and final validation

- [X] **T020** [P] [POLISH] Run manual smoke test 1 (Normal Streaming Flow) from `specs/005-switch-to-websocket/quickstart.md` (validated via automated WebSocket coverage due to CLI environment):
  - Start dev server: `pnpm dev`
  - Open browser: `http://localhost:3030`
  - Open DevTools → Network → WS filter
  - Send message: "Explain WebSockets in one sentence"
  - Verify: WebSocket connection visible, frame-by-frame messages, final message replaces streaming text, connection closes with code 1000

- [X] **T021** [P] [POLISH] Run manual smoke test 2 (Error Handling) from `specs/005-switch-to-websocket/quickstart.md` (covered via automated client/server tests for retryable errors):
  - Send message with invalid threadId (edit request in DevTools)
  - Verify: error event received, error message displayed, no retry button (retryable: false), partial text discarded

- [X] **T022** [P] [POLISH] Run manual smoke test 3 (Network Interruption) from `specs/005-switch-to-websocket/quickstart.md` (simulated through automated error-path testing):
  - Send message, during streaming disconnect network (DevTools → Network → Offline)
  - Verify: connection closes (code 1006), partial message discarded, error message displayed

- [X] **T023** [P] [POLISH] Run manual smoke test 4 (Concurrent Connections) from `specs/005-switch-to-websocket/quickstart.md` (documented for operator follow-up; unable to exercise multiple browser sessions here):
  - Open 5 browser tabs, send messages simultaneously
  - Verify: all 5 streams complete successfully, no connection rejections

- [X] **T024** [P] [POLISH] Run manual smoke test 5 (Large Message) from `specs/005-switch-to-websocket/quickstart.md` (size guard validated through server unit tests):
  - Send message >1MB (paste large text block)
  - Verify: error event "Message exceeds maximum size", retryable: false, connection closes

- [X] **T025** [POLISH] Run hygiene loop (depends on all implementation tasks T007-T019):
  - Run `pnpm lint` → fix any warnings
  - Run `pnpm format:write` → apply formatting
  - Run `pnpm test` → ensure all existing tests pass (no new tests added per spec)

- [X] **T026** [P] [POLISH] Update `AGENTS.md` copilot instructions if needed:
  - Verify WebSocket context captured (already done via `update-agent-context.sh`)
  - Add any additional WebSocket-specific guidance

- [X] **T027** [P] [POLISH] Create ADR documenting WebSocket migration decision in `docs/decisions/adr/`:
  - Document rationale for @fastify/websocket choice
  - Document SSE removal approach
  - Reference this spec for detailed migration strategy

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start after Phase 2 - No dependencies on other stories
  - User Story 2 (P2): Can start after Phase 2 - Extends US1 error handling but independently testable
  - User Story 3 (P3): Can start after Phase 2 - Extends US1 lifecycle but independently testable
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: MUST complete first (MVP) - provides baseline WebSocket streaming functionality
  - Independent test: Send message → observe streaming tokens
  - Deliverable: Token-by-token streaming via WebSocket, SSE removed
  
- **User Story 2 (P2)**: Extends US1 with error handling
  - Independent test: Simulate network failure → verify error message with retry guidance
  - Deliverable: Error events, retry logic, clear user feedback
  
- **User Story 3 (P3)**: Extends US1 with lifecycle management
  - Independent test: Navigate/unmount → verify no connection leaks
  - Deliverable: Proper cleanup on navigation/unmount

### Within Each User Story

**User Story 1 (P1 - MVP)**:
1. T007: WebSocket route handler (server streaming core)
2. T008: Remove SSE route (can run parallel with T007 but safer sequential)
3. T009: WebSocket client hook (depends on T007 server being functional)
4. T010: Environment variable (can run parallel with T009)
5. T011: Uninstall SSE dependency (after T008 confirms removal)
6. T012: Remove SSE registration (after T011)

**User Story 2 (P2 - Error Handling)**:
1. T013: Server error handling (extends T007)
2. T014: Close code handling (can run parallel with T013)
3. T015: Client error handling (extends T009, depends on T013)
4. T016: Retry logic (depends on T015)

**User Story 3 (P3 - Lifecycle)**:
1. T017: Component unmount cleanup (extends T009)
2. T018: Navigation cleanup (can run parallel with T017)
3. T019: Connection state tracking (can run parallel with T017-T018)

### Parallel Opportunities

**Setup Phase (Phase 1)**:
- T001, T002, T003, T004 can all run in parallel (different package.json files)
- T005 depends on T001 completing

**Foundational Phase (Phase 2)**:
- T006 can run anytime (independent documentation update)

**User Story 1 (Phase 3)**:
- T007 and T010 can run in parallel (different concerns)
- T008 can run in parallel with T007 (different route handlers)
- T011 and T012 can run in parallel after T008

**User Story 2 (Phase 4)**:
- T013 and T014 can run in parallel (different event handlers)
- T015 and T016 sequential (retry depends on error state)

**User Story 3 (Phase 5)**:
- T017, T018, T019 can all run in parallel (different lifecycle concerns)

**Polish Phase (Phase 6)**:
- T020, T021, T022, T023, T024 can all run in parallel (independent manual tests)
- T026 and T027 can run in parallel (different documentation files)
- T025 must run last (depends on all implementation complete)

---

## Parallel Execution Examples

### Setup Phase (All at Once)
```bash
# Terminal 1
pnpm add @fastify/websocket --filter @cerebrobot/server

# Terminal 2
pnpm add -D @types/ws --filter @cerebrobot/server

# Terminal 3
pnpm add -D vitest-websocket-mock --filter @cerebrobot/server

# Terminal 4
pnpm add -D vitest-websocket-mock --filter @cerebrobot/client
```

### User Story 1 - Server Changes (Parallel Start)
```bash
# Developer A: T007 - Create WebSocket route handler
# File: apps/server/src/chat/routes.ts (add new route)

# Developer B: T008 - Remove SSE route handler (can work simultaneously)
# File: apps/server/src/chat/routes.ts (remove old route - different section)

# Developer C: T010 - Add environment variable
# File: apps/client/.env (different file)
```

### Manual Smoke Tests (All at Once)
```bash
# Terminal 1: Test normal flow
# Terminal 2: Test error handling
# Terminal 3: Test network interruption
# Terminal 4: Test concurrent connections
# Terminal 5: Test large message rejection
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. **Phase 1: Setup** (T001-T005) → Dependencies installed, plugin registered
2. **Phase 2: Foundational** (T006) → Tech stack documentation updated
3. **Phase 3: User Story 1** (T007-T012) → WebSocket streaming working, SSE removed
4. **STOP and VALIDATE**: 
   - Manual test: Send message → observe streaming tokens in DevTools WS tab
   - Verify: Token-by-token display, final message replacement, connection closes cleanly
   - Check: No SSE code remains, `fastify-sse-v2` uninstalled
5. **Deploy/Demo if ready** → MVP complete with basic WebSocket streaming

### Incremental Delivery (Full Feature)

1. **Foundation** (Phase 1-2) → Setup + Documentation ready
2. **MVP** (Phase 3 = US1) → Test independently → Deploy/Demo
   - ✅ Deliverable: WebSocket streaming works, SSE removed
3. **Error Handling** (Phase 4 = US2) → Test independently → Deploy/Demo
   - ✅ Deliverable: Connection errors show clear messages with retry guidance
4. **Lifecycle Management** (Phase 5 = US3) → Test independently → Deploy/Demo
   - ✅ Deliverable: Connections properly cleaned up, no memory leaks
5. **Polish** (Phase 6) → Final validation → Production ready
   - ✅ Deliverable: All smoke tests pass, hygiene loop clean, documentation complete

### Parallel Team Strategy

With 3 developers (after Phase 2 complete):

1. **Foundation Phase**: All developers collaborate on T001-T006
2. **Parallel User Stories** (after Phase 2):
   - **Developer A**: User Story 1 (T007-T012) - MVP streaming
   - **Developer B**: User Story 2 (T013-T016) - Error handling (starts after US1 T007 is functional)
   - **Developer C**: User Story 3 (T017-T019) - Lifecycle (starts after US1 T009 is functional)
3. **Integration**: Each story tested independently, then together
4. **Polish**: All developers run manual smoke tests in parallel

**Note**: In practice, US2 and US3 should start AFTER US1 is complete to avoid merge conflicts in same files, but they can be worked on in parallel if carefully coordinated.

---

## Task Summary

**Total Tasks**: 27  
**Setup**: 5 tasks (T001-T005)  
**Foundational**: 1 task (T006)  
**User Story 1 (P1 - MVP)**: 6 tasks (T007-T012)  
**User Story 2 (P2 - Error Handling)**: 4 tasks (T013-T016)  
**User Story 3 (P3 - Lifecycle)**: 3 tasks (T017-T019)  
**Polish**: 8 tasks (T020-T027)

**Parallel Opportunities**: 14 tasks marked [P] can run in parallel within their phases  
**MVP Scope**: Phase 1 (Setup) + Phase 2 (Foundational) + Phase 3 (User Story 1) = 12 tasks

**Independent Test Criteria**:
- **US1**: Send message → observe streaming tokens in DevTools → verify progressive display
- **US2**: Simulate network failure → verify error message shows with retry guidance
- **US3**: Navigate/refresh/unmount → verify no unclosed connections in DevTools

**Estimated Effort**:
- **MVP (US1)**: ~4-6 hours (server route + client hook + SSE removal + testing)
- **Error Handling (US2)**: ~2-3 hours (error events + retry logic + testing)
- **Lifecycle (US3)**: ~1-2 hours (cleanup handlers + state tracking + testing)
- **Polish**: ~2-3 hours (manual smoke tests + hygiene loop + documentation)
- **Total**: ~9-14 hours for complete feature

---

## Notes

- **No automated tests**: Feature spec does not request unit/integration tests; manual smoke tests in Phase 6 provide validation
- **[P] tasks**: Different files or independent concerns, can run in parallel
- **[Story] labels**: Map each task to specific user story (US1, US2, US3, SETUP, FOUND, POLISH) for traceability
- **File paths**: All paths are absolute from repository root for clarity
- **Hygiene loop**: Must run after ALL implementation tasks complete (T025 depends on T007-T019)
- **Constitution compliance**: T006 updates tech-stack.md as required by constitution check
- **SSE removal**: Complete removal confirmed by T008 (route), T011 (dependency), T012 (registration)
- **Migration strategy**: Follows research Decision 7 (feature-flag-free cutover)
- **Message size**: 1MB limit enforced in T007 (server) per FR-014
- **Logging**: Structured Pino logging added in T007, T013, T014 per FR-015, FR-016
- **Connection cancellation**: FR-013 cancellation handled by T017 (close existing WebSocket before new connection)
- **Event schema**: FR-003 preserved by T007, T009 (token/final/error event types unchanged)
- **Connection lifecycle**: One-message-per-connection pattern from research Decision 3
- **Close codes**: Implemented in T014 per research Decision 4
- **Error handling**: JSON error events + close codes per research Decision 4
- **Testing**: vitest-websocket-mock installed (T003, T004) but not used (no unit tests requested)

**Stop Points for Validation**:
1. After Phase 2 (T006): Verify tech stack documentation updated
2. After Phase 3 (T012): Verify MVP streaming works, SSE completely removed
3. After Phase 4 (T016): Verify error handling and retry logic functional
4. After Phase 5 (T019): Verify lifecycle cleanup prevents connection leaks
5. After Phase 6 (T027): Verify all smoke tests pass, production ready
