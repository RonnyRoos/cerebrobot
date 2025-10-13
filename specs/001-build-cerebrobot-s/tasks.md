---
description: "Implementation tasks for Long-Term Memory Layer with LangGraph Store"
---

# Tasks: Long-Term Memory Layer with LangGraph Store

**Branch**: `001-build-cerebrobot-s`  
**Input**: Design documents from `/specs/001-build-cerebrobot-s/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Organization**: Tasks are grouped by user story (US1-US4) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, or SETUP/FOUNDATION)
- Include exact file paths in descriptions

## Implementation Strategy

**MVP Scope**: User Story 1 (P1) - Persistent User Preferences Across Conversations  
**Incremental Delivery**: Each user story builds on the foundation but remains independently testable  
**Testing**: 90%+ unit test coverage required per FR-011

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency installation

- [x] T001 [P] [SETUP] Install pgvector Postgres extension via migration in `prisma/migrations/`
- [x] T002 [P] [SETUP] Add memory-related environment variables to `.env.example` and docs
- [x] T003 [P] [SETUP] Verify embedding dependencies in `apps/server/package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Schema

- [x] T004 [FOUNDATION] Create Prisma migration for User table
  - Run: `pnpm prisma migrate dev --name add_user_table`
  - Prisma will auto-generate timestamped directory (e.g., `20251007123456_add_user_table/`)
  - Fields: `id` (UUID PK), `name` (TEXT), `createdAt` (TIMESTAMP)
  - No unique constraint on name per data-model.md Decision 8

- [x] T005 [FOUNDATION] Create Prisma migration for Memory table
  - Run: `pnpm prisma migrate dev --name add_memory_table`
  - Prisma will auto-generate timestamped directory
  - Fields: `id` (UUID PK), `namespace` (TEXT[]), `key` (TEXT), `content` (TEXT), `metadata` (JSON), `embedding` (vector(384)), `createdAt`, `updatedAt`
  - Composite unique constraint on `(namespace, key)`
  - IVFFlat index on `embedding` for semantic search

- [x] T006 [FOUNDATION] Update `prisma/schema.prisma` with User and Memory models
  - Enable pgvector extension: `generator client { previewFeatures = ["postgresqlExtensions"] }`
  - Match migration SQL from T004 and T005

- [x] T007 [FOUNDATION] Run `pnpm prisma migrate dev` to apply migrations

### Shared Schemas & Contracts

- [x] **T008**: Create user schemas in `packages/chat-shared/src/schemas/user.ts`
  - Export `CreateUserRequestSchema`, `CreateUserResponseSchema` from contracts/memory-store.schema.ts
  - Import and re-export from chat-shared for client/server usage

- [x] **T009**: Create memory schemas in `packages/chat-shared/src/schemas/memory.ts`
  - Export `MemoryEntrySchema`, `UpsertMemoryInputSchema`, `MemorySearchResultSchema`
  - Export validation utilities: `validateMemoryContent`, `validateNamespace`, `buildAgentMemoryNamespace`

- [x] **T010**: Export user and memory schemas from `packages/chat-shared/src/index.ts`

- [x] **T011**: Extend `ChatRequestSchema` in `packages/chat-shared/src/schemas/chat.ts` to include **MANDATORY** `userId` field
  - Changed from optional to: `userId: z.string().uuid()` (REQUIRED)
  - Enforces userId at API boundary, no fallback to sessionId

### Memory Configuration

- [x] **T012**: Create memory config module in `apps/server/src/agent/memory/config.ts`
  - Load env vars: `MEMORY_ENABLED`, `MEMORY_EMBEDDING_ENDPOINT`, `MEMORY_EMBEDDING_MODEL`, `MEMORY_SIMILARITY_THRESHOLD`, `MEMORY_CONTENT_MAX_TOKENS`
  - Export `MemoryConfig` interface and `loadMemoryConfig()` function
  - Validate with Zod `MemoryConfigSchema` from contracts

- [x] **T013**: Create embedding service in `apps/server/src/agent/memory/embeddings.ts`
  - Use `@langchain/openai` OpenAIEmbeddings with DeepInfra endpoint
  - Configure via `MEMORY_EMBEDDING_ENDPOINT` and `DEEPINFRA_API_KEY`
  - Export `generateEmbedding(text: string): Promise<number[]>` function
  - Handle errors gracefully (log and return null on failure)

### Memory Store Implementation

- [x] **T014**: Implement BaseStore interface in `apps/server/src/agent/memory/store.ts`
  - Implement `put()`, `get()`, `search()`, `delete()`, `list()` methods
  - Use Prisma client for Postgres operations
  - Integrate embedding service for semantic search
  - Use pgvector cosine similarity for search queries (`embedding <=> $1`)
  - Log all operations with Pino (FR-015)

- [x] **T015**: Create memory store factory in `apps/server/src/agent/memory/index.ts`
  - Export `createMemoryStore(config: MemoryConfig): BaseStore` function
  - Handle feature toggle (return no-op store if `MEMORY_ENABLED=false`)
  - Export all public interfaces and utilities

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Persistent User Preferences Across Conversations (Priority: P1) 🎯 MVP

**Goal**: Enable users to share information once and have it recalled in future conversation threads

**Independent Test**: 
1. User creates account with name → userId stored in localStorage
2. User tells bot "I'm vegetarian" in thread A
3. User starts new thread B, asks "What food should I make?"
4. Bot recommends vegetarian options without re-asking dietary preference

### User Creation Flow (US1 Prerequisite)

- [x] **T016**: Create user creation endpoint in `apps/server/src/user/routes.ts`
  - Implement `POST /api/users` handler
  - Accept `CreateUserRequest` (name), generate UUID userId
  - Create User record in Postgres via Prisma
  - Return `CreateUserResponse` (userId, name, createdAt)

- [x] **T017**: Create UserSetup component in `apps/client/src/components/UserSetup.tsx`
  - Check `localStorage.getItem('cerebrobot_userId')` on mount
  - If missing: Show name input prompt
  - On submit: POST to `/api/users`, store userId in localStorage
  - Handle errors gracefully (retry, fallback to anonymous)

- [x] **T018**: Update ChatView component in `apps/client/src/components/ChatView.tsx`
  - Load userId from localStorage
  - Include userId in all chat requests (ChatRequest.userId)
  - Render UserSetup component if userId not found

- [x] **T019**: Register user routes in `apps/server/src/app.ts`
  - Import and call `registerUserRoutes(app, { logger })`

### Memory Retrieval Node (US1 Core)

- [x] **T020**: Implement retrieveMemories node in `apps/server/src/agent/memory/nodes.ts`
  - Extract userId from graph state (use `state.userId` or fallback to sessionId)
  - Build namespace: `["memories", userId]`
  - Extract query from latest user message
  - Call `store.search(namespace, query, { threshold: 0.7 })`
  - Inject retrieved memories into `state.retrievedMemories`
  - Log retrieval count and query (Pino)

- [x] **T021**: Modify callModel node in `apps/server/src/agent/langgraph-agent.ts`
  - Check for `state.retrievedMemories` in graph state
  - If present: Inject memories into system prompt/context before LLM call
  - Format: "Relevant memories:\n{memory.content}\n\n{original_prompt}"
  - Preserve existing prompt structure and summarization

### Memory Storage Node (US1 Core)

- [x] **T022**: Create upsertMemory tool definition in `apps/server/src/agent/memory/tools.ts`
  - Define tool schema matching `UpsertMemoryInputSchema` (content, metadata?, key?)
  - Description: "Store or update a memory about the user for future conversations"
  - Return schema: `UpsertMemoryOutputSchema` (success, memoryId, message)

- [x] **T023**: Implement storeMemory node in `apps/server/src/agent/memory/nodes.ts`
  - Check for `upsertMemory` tool calls in LLM response
  - Extract userId from state (use `state.userId` or fallback to sessionId)
  - For each tool call:
    - Build namespace: `["memories", userId]`
    - Generate embedding for content
    - Validate content size (max 2048 tokens via `validateMemoryContent`)
    - Call `store.put(namespace, key, memoryEntry)`
    - Log operation (Pino)
  - Store results in `state.memoryOperations` for observability

### Graph Integration (US1 Core)

- [x] T024 [US1] Integrate memory nodes into agent graph in `apps/server/src/agent/langgraph-agent.ts`
  - Add `retrieveMemories` node before `callModel`
  - Add `storeMemory` node after `callModel`
  - Add `userId` field to graph state (MemoryState extension)
  - Add conditional edges based on `MEMORY_ENABLED` config
  - Preserve existing checkpoint and summarization flows

- [x] **T025**: Extend graph state interface in `apps/server/src/agent/langgraph-agent.ts`
  - Add `userId?: string` to state interface
  - Add `retrievedMemories?: MemorySearchResult[]` to state
  - Add `memoryOperations?: UpsertMemoryInput[]` to state
  - Import types from `@cerebrobot/chat-shared`

### Unit Tests for US1

- [x] T026 [P] [US1] Create store operations tests in `apps/server/src/agent/memory/__tests__/store.test.ts`
  - Test `put()` creates new memory
  - Test `put()` updates existing memory (same namespace + key)
  - Test `get()` retrieves by namespace and key
  - Test `search()` returns memories above threshold
  - Test `search()` orders by similarity score
  - Mock Prisma client and embedding service
  - Target: 90%+ coverage of store.ts

- [x] T027 [P] [US1] Create node behavior tests in `apps/server/src/agent/memory/__tests__/nodes.test.ts`
  - Test `retrieveMemories` extracts query and calls store.search
  - Test `retrieveMemories` injects results into state
  - Test `storeMemory` processes upsertMemory tool calls
  - Test `storeMemory` validates content size
  - Test `storeMemory` generates embeddings and stores memories
  - Mock store interface
  - Target: 90%+ coverage of nodes.ts

- [x] T028 [P] [US1] Create user endpoint tests in `apps/server/src/user/__tests__/user.routes.test.ts`
  - Test POST `/api/users` creates user with valid name
  - Test POST `/api/users` returns userId, name, createdAt
  - Test POST `/api/users` validates name (min 1, max 100 chars)
  - Test POST `/api/users` handles Prisma errors gracefully
  - Mock Prisma client

### Postgres Validation for US1

- [x] T029 [US1] Create Postgres + pgvector validation test in `apps/server/src/agent/memory/__tests__/store.test.ts`
  - Test: Store memory with real Prisma → persists to Postgres
  - Test: Retrieve by namespace + key → returns correct memory
  - Test: pgvector search with fixed embeddings → returns results above threshold
  - Test: Namespace isolation → user A cannot access user B memories
  - Uses real Postgres test database, mocked embeddings (deterministic)
  - Validates DB schema, migrations, and pgvector index work correctly

**Checkpoint**: User Story 1 complete - all unit tests pass, Postgres integration verified

---

## Phase 4: User Story 2 - Semantic Memory Search (Priority: P2)

**Goal**: Retrieve memories using semantic similarity (synonyms/rephrased queries), not just keywords

**Independent Test**:
1. Store memory: "User works at Microsoft"
2. Query: "Where does the user have a job?"
3. Verify: Returns Microsoft memory (similarity ≥0.5)

### Implementation for US2

- [x] T030 [US2] Enhance search query processing in `apps/server/src/agent/memory/nodes.ts`
  - Extract semantic intent from user message (use full message text, not just keywords)
  - Pass entire query to embedding service for better semantic matching
  - ✅ COMPLETE: Already implemented in T020, verified with semantic test cases

- [x] T031 [US2] Optimize pgvector similarity search in `apps/server/src/agent/memory/store.ts`
  - Verify cosine distance query: `ORDER BY embedding <=> $1`
  - Ensure IVFFlat index is used (check EXPLAIN ANALYZE)
  - Benchmark: <200ms for queries with <1000 memories (SC-003)
  - ✅ COMPLETE: pgvector cosine distance implemented, threshold lowered to 0.5

### Unit Tests for US2

*Semantic search logic is tested in T026 (store operations tests) with mocked embeddings. Real semantic accuracy validated manually in T051 smoke tests.*

**Checkpoint**: User Story 2 complete - semantic search logic implemented and unit tested

---

## Phase 5: User Story 3 - LLM-Driven Memory Updates (Priority: P2)

**Goal**: LLM autonomously identifies and stores new user information via upsertMemory tool

**Independent Test**:
1. User: "I've been learning Spanish for 3 months"
2. Verify: Memory stored automatically (no explicit "remember this" command)
3. Check: Memory contains Spanish learning information

### Implementation for US3

- [x] T034 [US3] Register upsertMemory tool with LLM in `apps/server/src/agent/langgraph-agent.ts`
  - Import tool definition from `apps/server/src/agent/memory/tools.ts`
  - Add to model's tool list
  - Ensure tool schema is correctly formatted for LLM
  - ✅ COMPLETE: Tool registered and verified working in manual tests

- [x] T035 [US3] Enhance tool calling in callModel node in `apps/server/src/agent/langgraph-agent.ts`
  - Verify LLM can call upsertMemory during generation
  - Handle tool call responses (success/error messages)
  - ✅ COMPLETE: ToolNode pattern implemented, tool calls processed correctly

- [x] T036 [US3] Add memory update detection in `apps/server/src/agent/memory/nodes.ts`
  - Parse tool calls from AIMessage
  - Handle both new memories and updates (upsert logic)
  - Use last-write-wins strategy for conflicts (FR-013)
  - ✅ COMPLETE: storeMemory node processes tool calls, validated in tests

### Unit Tests for US3

- [x] T037 [P] [US3] Create tool calling tests in `apps/server/src/agent/memory/__tests__/tools.test.ts`
  - Test upsertMemory tool schema validation
  - Test tool accepts content + metadata
  - Test tool auto-generates key if not provided
  - Test tool validates content size (max 2048 tokens)
  - Test storeMemory node processes tool calls correctly
  - Test error handling (embedding failure, validation errors)
  - ✅ COMPLETE: Tool tests exist and passing

**Checkpoint**: User Story 3 complete - LLM tool registration and storage logic implemented

---

## Phase 6: User Story 4 - Memory Namespacing per User (Priority: P3)

**Goal**: Ensure complete memory isolation between users (multi-tenant support)

**Independent Test**:
1. User A (userId: abc123): Store "I like jazz music"
2. User B (userId: xyz789): Store "I like rock music"
3. User A queries: "What music do I like?" → Returns only jazz
4. User B queries: "What music do I like?" → Returns only rock

### Implementation for US4

- [x] T040 [US4] Enforce namespace isolation in `apps/server/src/agent/memory/store.ts`
  - Verify all queries use namespace filter: `WHERE namespace = $1`
  - Add namespace validation: Reject queries with empty/invalid namespace
  - ✅ COMPLETE: Strict namespace enforcement, fixed parameterization bug using Prisma tagged templates

- [x] T041 [US4] Add userId validation in `apps/server/src/agent/memory/nodes.ts`
  - Verify userId is present in state before building namespace
  - Removed sessionId fallback (fail-loud approach)
  - Throw error if userId missing (6-layer validation)
  - ✅ COMPLETE: Documented in userid-validation.md

### Unit Tests for US4

*Namespace isolation is tested in T029 (Postgres validation) - no additional unit tests needed.*

**Checkpoint**: User Story 4 complete - namespace isolation enforced and validated in T029

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements and validations affecting multiple user stories

### Error Handling & Resilience

- [ ] T044 [P] [POLISH] Add graceful degradation in `apps/server/src/agent/memory/nodes.ts`
  - If embedding service fails: Log error, skip memory retrieval, continue conversation
  - If Postgres fails: Log error, skip memory operations, use checkpoint-based memory only
  - Verify conversation continues (SC-005)

- [ ] T045 [P] [POLISH] Add content size validation in `apps/server/src/agent/memory/store.ts`
  - Validate content ≤2048 tokens before storing
  - Truncate or reject entries exceeding limit
  - Return validation error to LLM via tool response

### Performance Optimization

- [ ] T046 [P] [POLISH] Add query performance monitoring in `apps/server/src/agent/memory/store.ts`
  - Log query latency for search operations
  - Alert if latency >200ms (SC-003 threshold)
  - Add Prometheus metrics if available

- [ ] T047 [P] [POLISH] Optimize embedding generation in `apps/server/src/agent/memory/embeddings.ts`
  - Add caching layer (LRU cache) for frequent queries
  - Batch embedding requests if multiple memories stored
  - Handle rate limits from DeepInfra

### Documentation & Observability

- [ ] T048 [P] [POLISH] Update operator troubleshooting guide
  - Add Section 6 (Troubleshooting) to `specs/001-build-cerebrobot-s/quickstart.md`
  - Document common issues: embedding service down, Postgres connection failed, memory not retrieved
  - Include diagnostic commands and resolution steps

- [ ] T049 [P] [POLISH] Add memory metrics logging in `apps/server/src/agent/memory/store.ts`
  - Log metrics: total memories, avg similarity score, retrieval latency
  - Use Pino structured logging
  - Enable operator inspection per Constitution II

- [ ] T050 [P] [POLISH] Create operator troubleshooting guide in `specs/001-build-cerebrobot-s/quickstart.md`
  - Already exists, verify completeness
  - Add runbook for common issues (embedding failures, Postgres errors)

### Final Validation

- [ ] T051 [POLISH] Run full test suite and manual smoke tests
  - Run: `pnpm test` → Verify 90%+ coverage (FR-011, SC-006)
  - **Verify SC-008 (zero regressions)**: Run existing checkpoint and summarization tests
  - All unit tests pass, no regressions
  - **Manual Smoke Test Checklist** (requires real API keys):
    1. Set `DEEPINFRA_API_KEY` and `OPENAI_API_KEY` in `.env`
    2. Create user: POST `/api/users` with name → Store userId in localStorage
    3. Store memory: Chat "I live in Seattle" → Check Postgres for memory record
    4. Verify embedding: Memory record has non-null `embedding` column (384 dimensions)
    5. New session: Chat "Where do I live?" → LLM response contains "Seattle"
    6. Check logs: Verify memory retrieval logged with similarity score ≥0.7
    7. Performance: Memory retrieval <200ms (check logs)
    8. Multi-user: Create 2nd user, store different memory, verify isolation
    9. Graceful degradation: Stop DeepInfra, verify conversation continues (SC-005)
    10. **Regression check**: Verify existing checkpoint persistence and summarization still work

- [ ] T052 [POLISH] Run hygiene loop: `pnpm lint` → `pnpm format:write` → `pnpm test`
  - Fix all lint errors
  - Format all new files
  - Ensure all tests pass

- [ ] T053 [POLISH] Verify Constitution compliance
  - All 7 principles validated
  - No bypasses or violations introduced
  - Documentation complete

**Checkpoint**: Feature complete and production-ready

---

## Dependencies & Execution Order

### Critical Path (Blocking Dependencies)

```
Phase 1 (Setup) → Phase 2 (Foundation) → Phase 3 (US1) → Phase 4 (US2) → Phase 5 (US3) → Phase 6 (US4) → Phase 7 (Polish)
```

### User Story Dependencies

- **US1** (P1): Depends on Foundation only (blocking) - includes Postgres validation (T029)
- **US2** (P2): Depends on US1 (retrieval logic) - can start in parallel after T020 complete
- **US3** (P2): Depends on US1 (storage logic) - can start in parallel after T022 complete
- **US4** (P3): Depends on US1 (namespace logic) - validation covered in T029

### Parallelization Opportunities

**After Foundation (T015) complete:**
- US1 user creation (T016-T019) can run parallel to US1 memory nodes (T020-T023)
- US2 semantic search (T030-T031) can start after T020
- US3 tool calling (T034-T036) can start after T022
- US4 namespace tests (T040-T043) can start after T015

**Test parallelization:**
- All [P] test tasks (T026, T027, T028, T037) can run parallel
- Postgres validation (T029) runs after unit tests (requires clean test DB)
- Manual smoke tests (T051) run before deployment (requires real API keys)

**Polish tasks:**
- All polish tasks (T044-T050) can run in parallel after user stories complete

---

## Parallel Execution Examples

### Example 1: Foundation Phase
```bash
# After T007 (migrations complete), run in parallel:
pnpm vitest apps/server/src/agent/memory/config.ts &  # T012
pnpm vitest apps/server/src/agent/memory/embeddings.ts &  # T013
pnpm vitest packages/chat-shared/src/schemas/user.ts &  # T008
wait
# Then T014-T015 (store implementation) sequentially
```

### Example 2: US1 Implementation
```bash
# After T015 (store ready), run in parallel:
# Terminal 1: User creation flow
pnpm dev:user-routes  # T016-T019

# Terminal 2: Memory nodes
pnpm dev:memory-nodes  # T020-T023

# Terminal 3: Unit tests
pnpm vitest store.test.ts &  # T026
pnpm vitest nodes.test.ts &  # T027
pnpm vitest user.routes.test.ts &  # T028
wait
```

### Example 3: Parallel User Stories (after US1)
```bash
# After US1 complete, implement US2, US3, US4 in parallel teams:
# Team 1: US2 semantic search (T030-T033)
# Team 2: US3 LLM tool calling (T034-T039)
# Team 3: US4 multi-user isolation (T040-T043)
```

---

## Task Summary

**Total Tasks**: 49 (streamlined - removed T030 redundancy, clarified ambiguities)  
**Setup Tasks**: 3 (T001-T003)  
**Foundation Tasks**: 12 (T004-T015)  
**User Story 1 Tasks**: 14 (T016-T029) - 🎯 MVP  
**User Story 2 Tasks**: 2 (T030-T031) - semantic search optimization  
**User Story 3 Tasks**: 6 (T034-T039) - LLM-driven memory updates  
**User Story 4 Tasks**: 4 (T040-T043) - namespace isolation  
**Polish Tasks**: 10 (T044-T053)  

**Parallelizable Tasks**: 16 (marked with [P])  
**Unit Test Tasks**: 6 (T026-T028, T037-T038, T042)  
**Postgres Validation**: 1 (T029 - real DB test with mocked embeddings)  
**Manual Smoke Tests**: Checklist in T051 (validates real APIs + regression check)

**Estimated Effort** (assuming 1 task ≈ 1-2 hours for experienced dev):
- Foundation: 1-2 days (critical path)
- US1 (MVP): 2-3 days
- US2-US4: 1-2 days (parallel)
- Polish: 1 day
- **Total: 5-8 days** for complete implementation

---

## Success Validation Checklist

After completing all tasks, verify:

- ✅ **SC-001**: Cross-thread recall works (100% recall for stored facts)
- ✅ **SC-002**: Semantic search accuracy ≥80% for rephrased queries
- ✅ **SC-003**: Memory retrieval latency <200ms
- ✅ **SC-004**: LLM memory storage success rate ≥95%
- ✅ **SC-005**: Graceful degradation when memory unavailable
- ✅ **SC-006**: Test coverage ≥90%
- ✅ **SC-007**: 100% namespace isolation between users
- ✅ **SC-008**: Zero regressions in existing features

Run validation suite:
```bash
pnpm test:memory:e2e
pnpm test:coverage
pnpm lint
```

Expected output: All tests pass, coverage >90%, no lint errors.

---

## Next Steps After Tasks Complete

1. **Code Review**: Submit PR for `001-build-cerebrobot-s` branch
2. **QA Testing**: Manual validation per `quickstart.md`
3. **Documentation**: Update main README with memory feature docs
4. **Deployment**: Merge to main, deploy to staging environment
5. **Monitoring**: Observe memory metrics in production
6. **Iteration**: Gather operator feedback, plan Phase 2 enhancements
