# Tasks: Memory Brain Surfacing

**Input**: Design documents from `/specs/010-memory-brain-ui/`
**Prerequisites**: plan.md, spec.md, research.md

**Tests**: Per Constitution Principle III, this feature uses 3-tier testing: unit tests (deterministic), Postgres validation test (real DB), and manual smoke tests (real LLM/embeddings). Unit tests are included inline.

**Organization**: Tasks are grouped by user story (P1-P5) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `apps/server/src/`, `apps/server/__tests__/`
- **Frontend**: `apps/client/src/`, `apps/client/__tests__/`
- **Shared**: `packages/chat-shared/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Configuration and shared schema foundation

- [ ] T001 [P] Add memory capacity environment variables to apps/server/src/config.ts (MEMORY_MAX_PER_USER=1000, MEMORY_DUPLICATE_THRESHOLD=0.95, MEMORY_CAPACITY_WARN_PCT=0.80)
- [ ] T002 [P] Extend MemoryEntry schema in packages/chat-shared/src/schemas/memory.ts with API request/response types
- [ ] T003 [P] Create memory API response schemas (MemoryListResponse, MemorySearchResponse, MemoryStatsResponse) in packages/chat-shared/src/schemas/memory.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Create MemoryService in apps/server/src/agent/memory/service.ts with capacity checking method
- [ ] T005 Create memory REST route handler skeleton in apps/server/src/routes/memory.ts
- [ ] T006 Register memory routes in apps/server/src/app.ts
- [ ] T007 Create memory API client skeleton in apps/client/src/services/memoryApi.ts
- [ ] T008 Create useMemories React hook skeleton in apps/client/src/hooks/useMemories.ts
- [ ] T009 Unit test for MemoryService capacity validation in apps/server/__tests__/agent/memory/service.test.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Real-Time Memory Visibility (Priority: P1) 🎯 MVP

**Goal**: Operators can see memories in real-time as agent stores them, with sidebar toggle and live updates

**Independent Test**: Conduct conversation where agent stores memory, verify operator sees content/timestamps without needing edit/search

### Implementation for User Story 1

#### Backend - Memory List Endpoint

- [ ] T010 [P] [US1] Implement GET /api/memory endpoint in apps/server/src/routes/memory.ts (list memories by threadId with pagination)
- [ ] T011 [P] [US1] Unit test for GET /api/memory pagination in apps/server/__tests__/routes/memory.test.ts
- [ ] T012 [P] [US1] Add Pino logging for memory list operations in apps/server/src/routes/memory.ts

#### Backend - WebSocket Events

- [ ] T013 [US1] Define memory.created event schema in packages/chat-shared/src/schemas/events.ts (extends base event type)
- [ ] T014 [US1] Add memory event emitter to ConnectionManager in apps/server/src/chat/connection-manager.ts (broadcast to thread connections)
- [ ] T015 [US1] Hook memory.created event into existing upsertMemory tool in apps/server/src/agent/memory/nodes.ts
- [ ] T016 [P] [US1] Unit test for memory event emission in apps/server/__tests__/websocket/events.test.ts

#### Frontend - Memory Browser Sidebar

- [ ] T017 [P] [US1] Create MemoryBrowser component skeleton in apps/client/src/components/MemoryBrowser/MemoryBrowser.tsx (sidebar with toggle button)
- [ ] T018 [P] [US1] Create MemoryList component in apps/client/src/components/MemoryBrowser/MemoryList.tsx (display memory entries with timestamps)
- [ ] T019 [US1] Implement getMemories API client method in apps/client/src/services/memoryApi.ts
- [ ] T020 [US1] Implement useMemories hook with list fetching in apps/client/src/hooks/useMemories.ts
- [ ] T021 [US1] Add memory.created WebSocket listener to useThreadConnection in apps/client/src/hooks/useThreadConnection.ts
- [ ] T022 [US1] Connect MemoryBrowser to ChatView in apps/client/src/components/ChatView.tsx (integrate sidebar)
- [ ] T023 [P] [US1] Add localStorage persistence for sidebar open/closed state in apps/client/src/components/MemoryBrowser/MemoryBrowser.tsx
- [ ] T024 [P] [US1] Unit test for MemoryBrowser toggle behavior in apps/client/__tests__/components/MemoryBrowser/MemoryBrowser.test.tsx

#### User Story 1 Polish

- [ ] T025 [US1] Implement auto-open sidebar on memory.created event in apps/client/src/components/MemoryBrowser/MemoryBrowser.tsx
- [ ] T026 [US1] Add empty state UI in apps/client/src/components/MemoryBrowser/MemoryList.tsx (no memories yet - include onboarding hint: "Memories will appear here as your agent learns about you")
- [ ] T027 [US1] Add chronological sorting (newest first default, with toggle for oldest first) to memory list in apps/client/src/components/MemoryBrowser/MemoryList.tsx

**Checkpoint**: User Story 1 complete - operators can view memories in real-time with sidebar toggle

---

## Phase 4: User Story 2 - Memory Search and Discovery (Priority: P2)

**Goal**: Operators can search memories by natural language with semantic ranking

**Independent Test**: Create 20+ diverse memories, search for topic, verify relevant results ranked by similarity (no edit needed)

### Implementation for User Story 2

#### Backend - Search Endpoint

- [ ] T028 [P] [US2] Implement GET /api/memory/search endpoint in apps/server/src/routes/memory.ts (semantic search with limit param)
- [ ] T029 [P] [US2] Add pagination logic to search results in apps/server/src/routes/memory.ts (offset-based initial implementation)
- [ ] T030 [P] [US2] Unit test for search ranking by similarity in apps/server/__tests__/routes/memory.test.ts
- [ ] T031 [P] [US2] Add Pino logging for search operations in apps/server/src/routes/memory.ts

#### Frontend - Search UI

- [ ] T032 [P] [US2] Create MemorySearch component in apps/client/src/components/MemoryBrowser/MemorySearch.tsx (search input with submit)
- [ ] T033 [US2] Implement searchMemories API client method in apps/client/src/services/memoryApi.ts
- [ ] T034 [US2] Add search query state to useMemories hook in apps/client/src/hooks/useMemories.ts
- [ ] T035 [US2] Display search results with similarity scores in apps/client/src/components/MemoryBrowser/MemoryList.tsx (format as percentage: "92% match" with tooltip)
- [ ] T036 [P] [US2] Add empty search results message in apps/client/src/components/MemoryBrowser/MemoryList.tsx (include suggestion: "Try different terms or browse all memories")
- [ ] T037 [P] [US2] Unit test for MemorySearch component in apps/client/__tests__/components/MemoryBrowser/MemorySearch.test.tsx

#### User Story 2 Polish

- [ ] T038 [US2] Add search result highlighting in apps/client/src/components/MemoryBrowser/MemoryList.tsx
- [ ] T039 [US2] Integrate MemorySearch into MemoryBrowser in apps/client/src/components/MemoryBrowser/MemoryBrowser.tsx

**Checkpoint**: User Story 2 complete - operators can search memories semantically with relevance ranking

---

## Phase 5: User Story 3 - Memory Correction and Editing (Priority: P3)

**Goal**: Operators can edit or delete memories with confirmation and immediate feedback

**Independent Test**: Edit memory content, verify agent uses corrected info in future responses (no search needed)

### Implementation for User Story 3

#### Backend - Edit/Delete Endpoints

- [ ] T040 [P] [US3] Implement PUT /api/memory/:id endpoint in apps/server/src/routes/memory.ts (update memory content)
- [ ] T041 [P] [US3] Implement DELETE /api/memory/:id endpoint in apps/server/src/routes/memory.ts (delete memory)
- [ ] T042 [P] [US3] Add timestamp update logic to PUT handler in apps/server/src/routes/memory.ts
- [ ] T043 [P] [US3] Unit test for edit timestamp update in apps/server/__tests__/routes/memory.test.ts
- [ ] T044 [P] [US3] Unit test for delete confirmation requirement in apps/server/__tests__/routes/memory.test.ts

#### Backend - WebSocket Events for Edit/Delete

- [ ] T045 [P] [US3] Define memory.updated and memory.deleted event schemas in packages/chat-shared/src/schemas/events.ts
- [ ] T046 [US3] Emit memory.updated event from PUT endpoint in apps/server/src/routes/memory.ts
- [ ] T047 [US3] Emit memory.deleted event from DELETE endpoint in apps/server/src/routes/memory.ts

#### Frontend - Edit/Delete UI

- [ ] T048 [P] [US3] Create MemoryEditor component in apps/client/src/components/MemoryBrowser/MemoryEditor.tsx (inline edit form)
- [ ] T049 [US3] Implement updateMemory API client method in apps/client/src/services/memoryApi.ts
- [ ] T050 [US3] Implement deleteMemory API client method in apps/client/src/services/memoryApi.ts
- [ ] T051 [US3] Add edit/delete mutations to useMemories hook in apps/client/src/hooks/useMemories.ts
- [ ] T052 [US3] Add memory.updated and memory.deleted WebSocket listeners to useThreadConnection in apps/client/src/hooks/useThreadConnection.ts
- [ ] T053 [US3] Add delete confirmation dialog to MemoryList in apps/client/src/components/MemoryBrowser/MemoryList.tsx
- [ ] T054 [US3] Add edit button and inline editor to MemoryList in apps/client/src/components/MemoryBrowser/MemoryList.tsx
- [ ] T055 [P] [US3] Unit test for MemoryEditor save/cancel in apps/client/__tests__/components/MemoryBrowser/MemoryEditor.test.tsx

#### User Story 3 Polish

- [ ] T056 [US3] Add success toast notification after edit in apps/client/src/components/MemoryBrowser/MemoryEditor.tsx
- [ ] T057 [US3] Add success toast notification after delete in apps/client/src/components/MemoryBrowser/MemoryList.tsx
- [ ] T058 [US3] Add error recovery UI for failed operations in apps/client/src/components/MemoryBrowser/MemoryBrowser.tsx (with retry button and operation context)

**Checkpoint**: User Story 3 complete - operators can edit/delete memories with confirmation and feedback

---

## Phase 6: User Story 4 - Manual Memory Creation (Priority: P4)

**Goal**: Operators can manually create memories to proactively teach agent

**Independent Test**: Manually create memory, verify it appears in list and influences agent responses (no search/edit needed)

### Implementation for User Story 4

#### Backend - Create Endpoint

- [ ] T059 [P] [US4] Implement POST /api/memory endpoint in apps/server/src/routes/memory.ts (create memory with content validation)
- [ ] T060 [P] [US4] Add manual creation flag to memory metadata in apps/server/src/routes/memory.ts
- [ ] T061 [P] [US4] Unit test for POST /api/memory validation in apps/server/__tests__/routes/memory.test.ts

#### Frontend - Create Form UI

- [ ] T062 [P] [US4] Add "Create Memory" button to MemoryBrowser in apps/client/src/components/MemoryBrowser/MemoryBrowser.tsx
- [ ] T063 [P] [US4] Create memory creation form modal in apps/client/src/components/MemoryBrowser/MemoryEditor.tsx (reuse editor for create mode)
- [ ] T064 [US4] Implement createMemory API client method in apps/client/src/services/memoryApi.ts
- [ ] T065 [US4] Add create mutation to useMemories hook in apps/client/src/hooks/useMemories.ts
- [ ] T066 [P] [US4] Unit test for create form validation in apps/client/__tests__/components/MemoryBrowser/MemoryEditor.test.tsx

#### User Story 4 Polish

- [ ] T067 [US4] Add success confirmation after manual creation in apps/client/src/components/MemoryBrowser/MemoryEditor.tsx
- [ ] T068 [US4] Auto-close form and scroll to new memory in apps/client/src/components/MemoryBrowser/MemoryBrowser.tsx

**Checkpoint**: User Story 4 complete - operators can manually create memories with validation

---

## Phase 7: User Story 5 - Memory Quality Management (Priority: P5)

**Goal**: Operators can identify and manage duplicate memories with visual indicators

**Independent Test**: Create similar memories ("User likes coffee" / "User prefers coffee"), verify duplicate detection shows indicators

### Implementation for User Story 5

#### Backend - Duplicate Detection

- [ ] T069 [P] [US5] Implement duplicate detection in MemoryService in apps/server/src/agent/memory/service.ts (similarity search at 0.95 threshold)
- [ ] T070 [US5] Hook duplicate check into POST /api/memory endpoint in apps/server/src/routes/memory.ts (prevent storage if duplicate)
- [ ] T071 [US5] Hook duplicate check into upsertMemory tool in apps/server/src/agent/memory/nodes.ts (prevent agent duplicates)
- [ ] T072 [P] [US5] Unit test for duplicate detection at 0.95 threshold in apps/server/__tests__/agent/memory/service.test.ts

#### Backend - Capacity Warnings

- [ ] T073 [P] [US5] Implement GET /api/memory/stats endpoint in apps/server/src/routes/memory.ts (return count and capacity percentage)
- [ ] T074 [P] [US5] Unit test for capacity warning at 80% in apps/server/__tests__/routes/memory.test.ts

#### Frontend - Quality Indicators

- [ ] T075 [P] [US5] Add similarity indicator to MemoryList entries in apps/client/src/components/MemoryBrowser/MemoryList.tsx (highlight memories ≥0.90 similar)
- [ ] T076 [US5] Implement getMemoryStats API client method in apps/client/src/services/memoryApi.ts
- [ ] T077 [US5] Add stats fetching to useMemories hook in apps/client/src/hooks/useMemories.ts
- [ ] T078 [US5] Display total memory count in MemoryBrowser header in apps/client/src/components/MemoryBrowser/MemoryBrowser.tsx
- [ ] T079 [US5] Add capacity warning banner at 80% in apps/client/src/components/MemoryBrowser/MemoryBrowser.tsx
- [ ] T080 [P] [US5] Unit test for capacity warning display in apps/client/__tests__/components/MemoryBrowser/MemoryBrowser.test.tsx

#### User Story 5 Polish

- [ ] T081 [US5] Add tooltip explaining similarity score in apps/client/src/components/MemoryBrowser/MemoryList.tsx
- [ ] T082 [US5] Add dismissible warning for duplicate prevention in apps/client/src/components/MemoryBrowser/MemoryEditor.tsx

**Checkpoint**: User Story 5 complete - operators can manage memory quality with duplicate detection

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories and final validations

- [ ] T083 [P] Add error boundary to MemoryBrowser in apps/client/src/components/MemoryBrowser/MemoryBrowser.tsx
- [ ] T084 [P] Add loading states to all API operations in apps/client/src/components/MemoryBrowser/MemoryBrowser.tsx
- [ ] T085 [P] Add optimistic UI updates for create/edit/delete in apps/client/src/hooks/useMemories.ts
- [ ] T086 [P] Add memory count badge to sidebar toggle button in apps/client/src/components/ChatView.tsx
- [ ] T087 [P] Extend Postgres validation test for semantic search pagination in apps/server/__tests__/agent/memory/store.test.ts
- [ ] T088 [P] Add comprehensive error logging for all memory operations in apps/server/src/routes/memory.ts
- [ ] T089 Create manual smoke test checklist in specs/010-memory-brain-ui/quickstart.md (real LLM memory formation, real embeddings, WebSocket sync, verify agent uses edited memories in responses, measure repetition reduction per SC-011/SC-012)
- [ ] T090 Run hygiene loop (pnpm lint → pnpm format:write → pnpm test) and fix all failures
- [ ] T091 Update project documentation in README.md with memory browser feature

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-7)**: All depend on Foundational phase completion
  - User stories CAN proceed in parallel if staffed (independent implementations)
  - OR sequentially in priority order (P1 → P2 → P3 → P4 → P5)
- **Polish (Phase 8)**: Depends on desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories ✅
- **User Story 2 (P2)**: Can start after Foundational - Independent from US1 ✅
- **User Story 3 (P3)**: Can start after Foundational - Independent from US1/US2 ✅
- **User Story 4 (P4)**: Can start after Foundational - Independent from US1-3 ✅
- **User Story 5 (P5)**: Can start after Foundational - Independent from US1-4 ✅

### Within Each User Story

- Backend endpoints before frontend API clients
- API clients before React hooks
- Hooks before UI components
- Core components before integration into ChatView
- Unit tests can run in parallel with implementation (TDD approach)

### Parallel Opportunities

**Phase 1 (Setup)**: All tasks [P] can run in parallel
**Phase 2 (Foundational)**: T009 depends on T004; others can parallel
**Phase 3 (US1)**: 
- Backend group [P]: T010, T011, T012 (different concerns)
- Frontend group [P]: T017, T018, T023, T024 (different files)
- WebSocket: T013→T014→T015 (sequential)
- Integration: T019→T020→T021→T022 (sequential)
**Phase 4-7**: Similar parallel patterns within backend/frontend groups
**Phase 8**: All tasks [P] except T090 (hygiene must run serially)

---

## Parallel Example: User Story 1

```bash
# Backend - All parallel:
Task T010: "Implement GET /api/memory endpoint"
Task T011: "Unit test for GET /api/memory pagination"
Task T012: "Add Pino logging for memory list"

# Frontend - Component setup parallel:
Task T017: "Create MemoryBrowser component skeleton"
Task T018: "Create MemoryList component"
Task T023: "Add localStorage persistence for sidebar state"
Task T024: "Unit test for MemoryBrowser toggle"

# Then sequential integration:
Task T019 → T020 → T021 → T022 (API client → hook → WebSocket → ChatView)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (config + schemas)
2. Complete Phase 2: Foundational (service skeleton + route registration)
3. Complete Phase 3: User Story 1 (real-time visibility)
4. **STOP and VALIDATE**: Test P1 acceptance scenarios independently
5. Deploy/demo if ready - operators can now see memories in real-time!

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP! 🎯)
3. Add User Story 2 → Test independently → Deploy/Demo (search added)
4. Add User Story 3 → Test independently → Deploy/Demo (editing added)
5. Add User Story 4 → Test independently → Deploy/Demo (manual creation added)
6. Add User Story 5 → Test independently → Deploy/Demo (quality management added)
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (P1 - real-time visibility)
   - Developer B: User Story 2 (P2 - search)
   - Developer C: User Story 3 (P3 - editing)
3. Stories complete and integrate independently

---

## Summary

**Total Tasks**: 91  
**Task Count by User Story**:
- Setup: 3 tasks
- Foundational: 6 tasks
- User Story 1 (P1): 18 tasks (T010-T027) - Real-Time Memory Visibility 🎯 MVP
- User Story 2 (P2): 12 tasks (T028-T039) - Memory Search
- User Story 3 (P3): 19 tasks (T040-T058) - Memory Editing
- User Story 4 (P4): 10 tasks (T059-T068) - Manual Creation
- User Story 5 (P5): 14 tasks (T069-T082) - Quality Management
- Polish: 9 tasks (T083-T091)

**Parallel Opportunities**: 38 tasks marked [P] can run in parallel within their phases

**Independent Test Criteria**:
- US1: Agent stores memory → operator sees content/timestamps ✅
- US2: Search 20+ memories → relevant results ranked ✅
- US3: Edit memory → agent uses corrected info ✅
- US4: Manually create → appears in list + influences agent ✅
- US5: Create similar memories → duplicate indicators show ✅

**Suggested MVP Scope**: Phase 1 (Setup) + Phase 2 (Foundational) + Phase 3 (User Story 1 only)
- Delivers core transparency value proposition
- 27 tasks total
- Real-time memory visibility with sidebar toggle
- Foundation for all subsequent stories

**Format Validation**: ✅ All tasks follow checklist format (checkbox, ID, [P]/[Story] labels, file paths)

---

## Notes

- [P] tasks = different files/concerns, no dependencies within phase
- [Story] label maps task to specific user story for traceability
- Each user story independently completable and testable per spec requirements
- Constitution Principle III: Unit tests inline, Postgres validation test in Phase 8 (T087), manual smoke tests in quickstart.md (T089)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Research unknowns from research.md addressed through implementation decisions (WebSocket events, pagination, duplicate detection, etc.)
