# Tasks: Conversation Th## Phase 1: Setup (Database Schema & Shared Types)

### T001: ~~Create database migration for thread metadata index~~ (OBSOLETE)
- **Status**: Not needed - using Prisma direct query for thread discovery
- **Reason**: LangGraph stores metadata as Bytes (bytea), not jsonb. Cannot create GIN jsonb index on bytea column.
- **Alternative**: Thread discovery uses `prisma.langGraphCheckpoint.findMany({ distinct: ['threadId'] })`, then checkpointer APIs for state access
- **Impact**: No schema changes needed; existing checkpoint table sufficientad Management UI

**Feature**: 003-frontend-changes-to  
**Input**: Design documents from `/specs/003-frontend-changes-to/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Total Tasks**: 41 (T001 obsolete, T002-T042 active)

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions
- **Web app structure**: `apps/server/src/`, `apps/client/src/`, `packages/chat-shared/src/`
- Paths follow existing monorepo structure per plan.md

---

## Phase 1: Setup (Shared Infrastructure) ✅ COMPLETE

**Purpose**: Project initialization and basic structure needed by all user stories

- [x] T001 ~~[P] Create database migration for GIN index on checkpoint metadata~~ **OBSOLETE** - No schema changes needed  
  **Reason**: metadata is Bytes (bytea) not jsonb; using Prisma direct query for thread discovery
  **ADR**: `/docs/architecture/thread-discovery-pattern.md`

- [x] T002 [P] Create shared thread schemas in chat-shared package  
  **File**: `packages/chat-shared/src/schemas/thread.ts`  
  **Status**: ✅ Created with ThreadMetadataSchema, ThreadListResponseSchema, MessageSchema, MessageHistoryResponseSchema

- [x] T003 Export thread schemas from chat-shared package  
  **File**: `packages/chat-shared/src/index.ts`  
  **Status**: ✅ Exported all thread schemas and types

- [x] T004 ~~Run database migration to create GIN index~~ **OBSOLETE**
  **Reason**: No migration needed per T001 analysis

**Checkpoint**: ✅ Shared schemas available for import, architecture documented

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core thread infrastructure that MUST be complete before ANY user story UI can function

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Create ThreadService class with listThreads method  
  **File**: `apps/server/src/thread/service.ts`  
  **Action**: Implement `listThreads(userId: string): Promise<ThreadMetadata[]>` using **Prisma + checkpointer pattern** (see ADR):
    1. Prisma: `findMany({ distinct: ['threadId'], orderBy: { updatedAt: 'desc' } })` to discover threads
    2. For each threadId: `checkpointer.getTuple({ configurable: { thread_id, checkpoint_ns: '' } })`
    3. Filter by `tuple.config?.configurable?.userId === userId`
    4. Deserialize: `checkpointer.serde.loadsTyped(tuple.checkpoint)`
    5. Derive metadata: title, lastMessage, messageCount, timestamps from state

- [ ] T006 Create ThreadService class with getThreadHistory method  
  **File**: `apps/server/src/thread/service.ts` (same file as T005)  
  **Action**: Implement `getThreadHistory(threadId: string, userId: string): Promise<MessageHistoryResponse>` using:
    1. `checkpointer.getTuple({ configurable: { thread_id: threadId, checkpoint_ns: '' } })`
    2. Validate `tuple.config?.configurable?.userId === userId` (throw 403 if mismatch)
    3. Deserialize: `checkpointer.serde.loadsTyped(tuple.checkpoint)`
    4. Extract messages array from state, map to Message schema format

- [ ] T007 Create thread API routes module  
  **File**: `apps/server/src/thread/routes.ts`  
  **Action**: Define `registerThreadRoutes(app: FastifyInstance, threadService: ThreadService)` with two endpoints (implemented in T008-T009)

- [ ] T008 Implement GET /api/threads endpoint in thread routes  
  **File**: `apps/server/src/thread/routes.ts` (same file as T007)  
  **Action**: Add route handler with Zod validation for `userId` query param, call `threadService.listThreads()`, return `{ threads, total }` response

- [ ] T009 Implement GET /api/threads/:threadId/messages endpoint in thread routes  
  **File**: `apps/server/src/thread/routes.ts` (same file as T007)  
  **Action**: Add route handler with Zod validation for `threadId` param and `userId` query, call `threadService.getThreadHistory()`, handle 404 errors

- [ ] T010 Register thread routes in main application  
  **File**: `apps/server/src/app.ts`  
  **Action**: Import ThreadService and registerThreadRoutes, instantiate ThreadService with checkpointer instance (from agent configuration), call registerThreadRoutes after existing route registrations

**Checkpoint**: Backend API fully functional - can query threads and history via REST endpoints

**Note**: LangGraph automatically manages checkpoint state and persistence. No manual metadata updates needed - checkpoint state contains messages, summary, and all conversation context automatically.

---

## Phase 3: User Story 1 - View Available Conversation Threads (Priority: P1) 🎯 MVP

**Goal**: Display thread list as default screen after user setup, showing all user's threads sorted by recency

**Independent Test**: Create user → start 2-3 conversations → close app → reopen → verify all threads displayed with preview info and sorted by most recent first

### Implementation for User Story 1

- [ ] T013 [P] [US1] Create useThreads React hook  
  **File**: `apps/client/src/hooks/useThreads.ts`  
  **Action**: Implement hook that fetches `/api/threads?userId={userId}`, returns `{ threads, error, refresh }`, auto-fetches on userId change. **KISS constraint**: No loading state - return threads immediately (empty array initially), update when data arrives

- [ ] T014 [P] [US1] Create ThreadListItem component  
  **File**: `apps/client/src/components/ThreadListItem.tsx`  
  **Action**: Presentational component rendering single thread with title, last message preview, timestamp (formatted as relative time), message count, onClick handler

- [ ] T015 [US1] Create ThreadListView component  
  **File**: `apps/client/src/components/ThreadListView.tsx`  
  **Action**: Container component using useThreads hook, renders list of ThreadListItem components, handles empty state ("No conversations yet"), includes "New Conversation" button

- [ ] T016 [US1] Update App.tsx routing to show ThreadListView  
  **File**: `apps/client/src/App.tsx`  
  **Action**: Add `activeThreadId` state, show ThreadListView when userId exists but no activeThreadId, pass `onSelectThread` and `onNewThread` handlers

- [ ] T017 [US1] Add error handling UI to ThreadListView  
  **File**: `apps/client/src/components/ThreadListView.tsx` (same file as T015)  
  **Action**: Display error alert when thread list fails to load, include error message

**Checkpoint**: User Story 1 complete - users can view their thread list, see empty state, and see error states

**Manual Test for US1**:
1. Create user (via UserSetup)
2. Verify empty state shows with "No conversations yet" message
3. Create 2-3 conversations (will work once US3 implemented, or manually via API)
4. Close app and reopen
5. Verify all threads appear in list sorted by most recent first
6. Verify each thread shows title, last message preview, timestamp

---

## Phase 4: User Story 2 - Resume Existing Conversation (Priority: P2)

**Goal**: Enable users to select a thread from the list and load complete conversation history with full context

**Independent Test**: Create conversation with context/memories → close → select from list → verify history loads and context preserved

### Implementation for User Story 2

- [ ] T018 [P] [US2] Create useThreadHistory React hook  
  **File**: `apps/client/src/hooks/useThreadHistory.ts`  
  **Action**: Implement hook that fetches `/api/threads/{threadId}/messages?userId={userId}`, returns `{ messages, error }`, auto-fetches on threadId change. **KISS constraint**: No loading state - return messages immediately (empty array initially), update when data arrives

- [ ] T019 [US2] Update ChatView to accept threadId prop and load history  
  **File**: `apps/client/src/components/ChatView.tsx`  
  **Action**: Change component signature to `ChatView({ userId, threadId, onBack })`, use useThreadHistory to load messages when threadId provided, prepopulate chat history

- [ ] T020 [US2] Update useChatSession to reuse existing threadId  
  **File**: `apps/client/src/hooks/useChatSession.ts`  
  **Action**: Accept optional `existingThreadId` parameter, if provided skip session creation and use existing threadId, otherwise create new session

- [ ] T021 [US2] Integrate threadId selection in App.tsx  
  **File**: `apps/client/src/App.tsx` (updates T016)  
  **Action**: When thread selected from ThreadListView, set `activeThreadId` state and show ChatView with that threadId

- [ ] T022 [US2] Add "Back to Threads" navigation in ChatView  
  **File**: `apps/client/src/components/ChatView.tsx` (updates T019)  
  **Action**: Add back button that calls `onBack()` prop to return to thread list

- [ ] T022b [US2] Add error handling for non-existent threads in ChatView  
  **File**: `apps/client/src/components/ChatView.tsx` (updates T022)  
  **Action**: Handle 404 error from thread history API (FR-013), show error message "Thread not found", provide button to return to thread list

- [ ] T023 [US2] Implement message history retrieval in ThreadService  
  **File**: `apps/server/src/thread/service.ts` (updates T006)  
  **Action**: In `getThreadHistory()`, use `checkpointer.serde.loadsTyped(checkpoint.checkpoint)` to deserialize checkpoint state, extract messages array from state, map to API message format (role, content, timestamp), validate userId from checkpoint configurable matches request

**Checkpoint**: User Story 2 complete - users can resume threads with full history and context

**Manual Test for US2**:
1. Start from thread list (US1)
2. Select an existing thread
3. Verify complete conversation history loads
4. Send new message
5. Verify response maintains context from previous conversation
6. Verify memories recalled appropriately (if conversation had memory references)
7. Click "Back to Threads"
8. Verify return to thread list

---

## Phase 5: User Story 3 - Start New Conversation Thread (Priority: P2)

**Goal**: Enable users to create new conversation threads from the thread list

**Independent Test**: View thread list → click "New Conversation" → send messages → return to list → verify new thread appears at top

### Implementation for User Story 3

- [ ] T024 [US3] Implement "New Conversation" button handler in App.tsx  
  **File**: `apps/client/src/App.tsx` (updates T021)  
  **Action**: `handleNewThread` function generates new UUID for threadId, sets `activeThreadId` to new UUID, shows ChatView with empty history. **Note**: Checkpoint is created by LangGraph on first message send, not on button click

- [ ] T025 [US3] Update ChatView to handle new thread creation  
  **File**: `apps/client/src/components/ChatView.tsx` (updates T022)  
  **Action**: When `threadId` is provided but no history exists, create new session via useChatSession with the provided threadId, initialize with empty message array. First message will trigger checkpoint creation by LangGraph

- [ ] T026 [US3] Verify new thread checkpoint creation  
  **File**: Verify existing LangGraph checkpoint behavior  
  **Action**: Test that when first message is sent with new thread_id, LangGraph checkpointer automatically creates checkpoint with messages array and state - no manual intervention needed

- [ ] T027 [US3] Implement thread list refresh mechanism  
  **File**: `apps/client/src/hooks/useThreads.ts` (updates T013)  
  **Action**: Add `refresh()` function that re-fetches thread list, expose via hook return value

- [ ] T027b [US3] Trigger thread list update on navigation  
  **File**: `apps/client/src/App.tsx` (updates T021)  
  **Action**: When user navigates from ChatView back to ThreadListView (via onBack), call `useThreads().refresh()` to update thread list with latest messages

**Checkpoint**: User Story 3 complete - users can start new conversations from thread list

**Manual Test for US3**:
1. Start from thread list
2. Click "New Conversation" button
3. Verify ChatView opens with empty conversation history
4. Send first message "Test conversation about X"
5. Verify thread created and assistant responds
6. Send 2-3 more messages
7. Click "Back to Threads"
8. Verify new thread appears at top of list
9. Verify title shows "Test conversation about X" (first 50 chars)
10. Verify message count shows correctly

---

## Phase 6: User Story 4 - Thread Identification and Preview (Priority: P3)

**Goal**: Enhance thread list with rich preview information (title, last message, timestamps) for easy identification

**Independent Test**: Create threads with distinctive first messages → verify preview shows enough info to identify each thread's topic

### Implementation for User Story 4

- [ ] T028 [P] [US4] Implement timestamp formatting in ThreadListItem  
  **File**: `apps/client/src/components/ThreadListItem.tsx` (updates T014)  
  **Action**: Add `formatTimestamp` function for relative time ("2m ago", "3h ago", "Yesterday") and absolute dates for older threads

- [ ] T029 [P] [US4] Add title derivation from first message  
  **File**: `apps/server/src/thread/service.ts` (updates T005)  
  **Action**: In `listThreads()`, derive thread title from first HumanMessage in checkpoint messages array (first 50 chars), include ellipsis "..." when message > 50 chars

- [ ] T030 [P] [US4] Detect and style empty threads  
  **File**: `apps/server/src/thread/service.ts` (updates T029)  
  **Action**: In `listThreads()`, mark thread as empty when checkpoint messages array contains only system messages or is empty, return `isEmpty: true` flag in ThreadMetadata

- [ ] T031 [P] [US4] Style empty threads in UI  
  **File**: `apps/client/src/components/ThreadListItem.tsx` (updates T028)  
  **Action**: When `thread.isEmpty === true`, show "New Conversation" with different styling (e.g., italic, muted color); otherwise show title with ellipsis if > 50 chars

- [ ] T032 [US4] Add message preview and role indicators  
  **File**: `apps/client/src/components/ThreadListItem.tsx` (updates T031)  
  **Action**: Show lastMessage preview truncated to 100 chars with "..." if longer, prefix with "You: " or "Assistant: " based on `lastMessageRole` from backend

**Checkpoint**: User Story 4 complete - thread list has rich preview info for easy identification

**Manual Test for US4**:
1. Create threads with varying first message lengths (short, exactly 50 chars, > 50 chars)
2. Verify title shows first 50 chars with "..." for long messages
3. Create thread with long last message (> 100 chars)
4. Verify preview truncated to 100 chars with "..."
5. Verify timestamps show relative time for recent threads ("5m ago")
6. Verify older threads show absolute dates
7. Verify "You: " and "Assistant: " prefixes appear correctly
8. Create empty thread (don't send messages)
9. Verify shows "New Conversation" in muted style

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final quality assurance

- [ ] T033 [P] Add unit tests for ThreadService.listThreads  
  **File**: `apps/server/src/thread/__tests__/service.test.ts`  
  **Action**: Test with mocked Prisma: valid userId returns threads, empty userId returns empty array, sorts by updatedAt DESC

- [ ] T034 [P] Add unit tests for ThreadService.getThreadHistory  
  **File**: `apps/server/src/thread/__tests__/service.test.ts` (same file as T033)  
  **Action**: Test ownership validation (correct userId succeeds, wrong userId throws error), thread not found throws error

- [ ] T035 [P] Add unit tests for useThreads hook  
  **File**: `apps/client/src/hooks/__tests__/useThreads.test.ts`  
  **Action**: Test fetching success, error handling, refresh functionality

- [ ] T036 [P] Add unit tests for ThreadListItem component  
  **File**: `apps/client/src/components/__tests__/ThreadListItem.test.tsx`  
  **Action**: Test rendering with thread data, timestamp formatting, onClick handler

- [ ] T037 [P] Add unit tests for ThreadListView component  
  **File**: `apps/client/src/components/__tests__/ThreadListView.test.tsx`  
  **Action**: Test empty state, thread list rendering, error state, "New Conversation" button

- [ ] T038 Add Postgres validation test for thread query performance  
  **File**: `tests/integration/thread-checkpoint-query.test.ts`  
  **Action**: Test real Postgres query using checkpointer APIs, verify userId filtering works, verify performance <2s for 100 threads (aligns with SC-001), use deterministic test data

- [ ] T039 [P] Update API documentation with thread endpoints  
  **File**: `docs/api/threads.md` (create if doesn't exist)  
  **Action**: Document GET /api/threads and GET /api/threads/:threadId/messages with examples from contracts/threads-api.yaml

- [ ] T040 Run hygiene loop: lint → format → test  
  **Command**: `pnpm lint && pnpm format:write && pnpm test`  
  **Action**: Ensure all code passes linting, formatting, and tests

- [ ] T041 Run quickstart.md manual smoke tests  
  **File**: Follow `specs/003-frontend-changes-to/quickstart.md` success criteria checklist  
  **Action**: Validate all user stories work end-to-end with real user interaction

- [ ] T042 Update IMPLEMENTATION_PROGRESS.md with completion status  
  **File**: `specs/003-frontend-changes-to/IMPLEMENTATION_PROGRESS.md`  
  **Action**: Mark all phases complete, document any deviations from plan

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) - MVP delivery
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2) + optionally US1 for testing
- **User Story 3 (Phase 5)**: Depends on Foundational (Phase 2) + optionally US1 for testing
- **User Story 4 (Phase 6)**: Depends on US1 (Phase 3) - enhances thread list display
- **Polish (Phase 7)**: Depends on desired user stories being complete

### User Story Dependencies

**Critical Path for MVP**:
1. Setup (Phase 1) → Required by all
2. Foundational (Phase 2) → Required by all user stories
3. User Story 1 (Phase 3) → **MVP Complete** (users can view threads)

**Enhanced Functionality**:
4. User Story 2 (Phase 4) → Can start after Foundational, works independently but integrates with US1
5. User Story 3 (Phase 5) → Can start after Foundational, works independently but integrates with US1
6. User Story 4 (Phase 6) → Enhances US1, requires US1 complete

**Parallel Opportunities**:
- US2 and US3 can be developed in parallel (both depend only on Foundational)
- US4 depends on US1 but can start as soon as US1 is complete
- All Polish tasks (T033-T042) can run in parallel once their target features are complete

### Within Each Phase

**Setup (Phase 1)**:
- T001, T002 can run in parallel [P]
- T003 depends on T002
- T004 depends on T001

**Foundational (Phase 2)**:
- T005, T006 are in same file (sequential)
- T007, T008, T009 are in same file (sequential, but T008 and T009 define routes created in T007)
- T010 depends on T005-T009

**User Story 1 (Phase 3)**:
- T013, T014 can run in parallel [P]
- T015 depends on T013, T014
- T016 depends on T015
- T017 updates T015 (sequential)

**User Story 2 (Phase 4)**:
- T018 can run in parallel [P] with other US2 tasks initially
- T019, T020, T021, T022 have dependencies (update same files)
- T023 updates T006 (backend)

**User Story 3 (Phase 5)**:
- T024, T025, T027 update same files (sequential)
- T026 is verification, not new code

**User Story 4 (Phase 6)**:
- T028, T029, T030, T031, T032 involve same component and service files (sequential)
- T029-T030 update backend service (T005), T031-T032 update frontend component (T014)

**Polish (Phase 7)**:
- T033, T034, T035, T036, T037, T038 can all run in parallel [P]
- T039 can run in parallel [P]
- T040, T041, T042 run sequentially at end

---

## Parallel Execution Examples

### Setup Phase (All teams work simultaneously)

```bash
# Team A: Database migration
Task T001: Create migration file
Task T004: Run migration

# Team B: Shared schemas  
Task T002: Create thread schemas
Task T003: Export schemas

# Both teams coordinate: T004 runs after both T001 and T003 complete
```

### User Story Work (After Foundational Phase)

**Option 1: Sequential by Priority (Single Developer)**
```bash
# Week 1: MVP
Phase 1 → Phase 2 → Phase 3 (US1) → Deploy MVP

# Week 2: Enhanced Features
Phase 4 (US2) → Deploy with resume capability
Phase 5 (US3) → Deploy with new thread creation

# Week 3: Polish
Phase 6 (US4) → Deploy with rich previews
Phase 7 (Polish) → Final release
```

**Option 2: Parallel by Story (Multiple Developers)**
```bash
# After Foundational (Phase 2) completes:

# Developer 1: US1 (MVP Priority)
Tasks T013-T017 (Thread list display)

# Developer 2: US2 (Parallel)
Tasks T018-T023 (Thread resume)

# Developer 3: US3 (Parallel)
Tasks T024-T027 (New thread creation)

# All merge: US1 ships first as MVP, US2/US3 follow rapidly
```

### Polish Phase (Final Sprint)

```bash
# All developers run tests in parallel
Dev 1: T033, T034 (Backend tests)
Dev 2: T035, T036, T037 (Frontend tests)
Dev 3: T038 (Postgres validation)
Dev 4: T039 (Documentation)

# Then sequential finish:
T040: Hygiene loop
T041: Manual smoke tests
T042: Update progress docs
```

---

## Implementation Strategy

### Recommended Approach: MVP First

**Week 1 - MVP (US1 Only)**:
1. Complete Setup (Phase 1) - ~2 hours
2. Complete Foundational (Phase 2) - ~4 hours
3. Complete User Story 1 (Phase 3) - ~3 hours
4. Run basic tests and deploy MVP

**Result**: Users can view their conversation thread list ✅

**Week 2 - Enhanced Features**:
5. Complete User Story 2 (Phase 4) - ~3 hours
6. Complete User Story 3 (Phase 5) - ~2 hours

**Result**: Full thread management (view + resume + create) ✅

**Week 3 - Polish**:
7. Complete User Story 4 (Phase 6) - ~2 hours
8. Complete Polish (Phase 7) - ~3 hours

**Result**: Production-ready with tests and documentation ✅

### Alternative Approach: Full Feature Set

Complete all phases sequentially for comprehensive feature delivery in single release.

---

## Task Summary

**Total Tasks**: 42

**By Phase**:
- Phase 1 (Setup): 4 tasks
- Phase 2 (Foundational): 6 tasks (~3 hours) - Uses LangGraph checkpoint APIs (no manual metadata)
- Phase 3 (US1 - MVP): 5 tasks (~3 hours)
- Phase 4 (US2): 7 tasks (~3 hours) - Added T022b for FR-013 error handling
- Phase 5 (US3): 5 tasks (~2 hours) - Added T027b for FR-011 thread list updates
- Phase 6 (US4): 5 tasks (~2 hours)
- Phase 7 (Polish): 10 tasks (~3 hours)

**Parallel Opportunities**: 15 tasks marked [P] can run in parallel

**Independent Test Criteria**:
- **US1**: View thread list with 3 threads, verify all displayed and sorted
- **US2**: Resume thread, verify full history loads and context preserved
- **US3**: Create new thread, verify appears in list after first message
- **US4**: Verify thread titles, previews, timestamps display correctly

**MVP Scope**: Phase 1 + Phase 2 + Phase 3 (User Story 1) = ~8 hours, delivers viewable thread list

**Estimated Total Time**: 17-19 hours for complete feature (all 4 user stories + polish)

**Architecture Notes**:

1. **LangGraph Checkpoint Integration**: This implementation properly uses LangGraph's checkpoint APIs. The checkpointer (PostgresCheckpointSaver) automatically handles:
   - Thread state persistence (messages, summary, token usage)
   - Checkpoint metadata serialization  
   - Thread lifecycle management
   
2. **Data Access Pattern**: Query checkpoint state via the checkpointer's API (`getTuple()`, `list()`, `serde.loadsTyped()`) rather than direct database access. This ensures compatibility with LangGraph's serialization format and future updates.

3. **Metadata Derivation**: Thread metadata (title, lastMessage, messageCount) is **derived** from checkpoint state at query time, not stored separately. This maintains single source of truth and avoids sync issues.

4. **User Identification**: userId is obtained from `checkpoint.config.configurable.userId` (already set by existing agent implementation), not from a separate metadata field.

---

## Success Criteria Validation

**From spec.md**:

- ✅ **SC-001**: Thread list loads in <2 seconds → Validated by T038 (performance test)
- ✅ **SC-002**: Thread resume + history in <1 second → Validated by T023 (history loading)
- ✅ **SC-003**: 95% context preservation → Validated by T041 (manual smoke test with memory)
- ✅ **SC-004**: New conversation in <3 clicks → US3 implementation (thread list → New button → chat)
- ✅ **SC-005**: 100+ threads without degradation → T038 (Postgres test with 100 threads)
- ✅ **SC-006**: Threads distinguishable at glance → US4 implementation (title, preview, timestamp)
- ✅ **SC-007**: 90% error recovery → T017 (error handling UI) + T041 (manual testing)

**All success criteria covered by task implementation and testing strategy.**
