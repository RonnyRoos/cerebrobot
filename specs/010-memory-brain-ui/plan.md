# Implementation Plan: Memory Brain Surfacing

**Branch**: `010-memory-brain-ui` | **Date**: 2025-10-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-memory-brain-ui/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Surface the agent's long-term memory graph through a real-time, inspectable, and editable UI. Operators will gain visibility into what facts the agent stores during conversations, search for specific memories semantically, edit or delete incorrect information, manually create memories, and identify duplicates. Technical approach combines existing PostgresMemoryStore backend with new REST endpoints for CRUD operations, WebSocket events for real-time notifications, and a React-based sidebar component in the client application.

## Technical Context

**Language/Version**: TypeScript 5.5+ (Node.js ≥20 backend, modern browsers for frontend)  
**Primary Dependencies**:
- Backend: Fastify 5.6.1, @fastify/websocket 11.2.0, @langchain/langgraph 0.4.9, Prisma 5.17.0, Zod 4.1.11, Pino 9.11.0
- Frontend: React 18.2.0, Vite 5.2.12, Vitest 1.6.0
**Storage**: PostgreSQL with pgvector extension (existing PostgresMemoryStore)  
**Testing**: Vitest 1.6.0 (unit tests), vitest-websocket-mock 0.5.0 (WebSocket testing), manual smoke tests (real LLM validation)  
**Target Platform**: Docker Compose deployment (single-operator hobby project), modern browsers (Chrome/Firefox/Safari)  
**Project Type**: Web application (React frontend + Fastify backend)  
**Performance Goals**:
- Memory browser loads <1s for 100 memories
- Search returns results <3s for 1000 memories
- Real-time updates appear <500ms after backend event
- UI interactions respond <1s (95th percentile)
**Constraints**:
- Max 1000 memories per operator (warn at 800)
- WebSocket 1MB payload cap (@fastify/websocket default)
- Semantic search uses DeepInfra embeddings (OpenAI-compatible API)
- Must work offline-first for viewing cached memories (stretch goal)
**Scale/Scope**:
- Single operator per deployment
- 100-1000 memories typical usage
- 5-10 concurrent browser tabs per operator
- ~10 new REST endpoints + 4 WebSocket event types

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Hygiene-First Development
✅ **PASS** - Feature integrates into existing hygiene loop (lint/format/test). New code will follow pnpm scripts. WebSocket and React components testable via vitest-websocket-mock.

### Principle II: Transparency & Inspectability
✅ **PASS** - This feature DIRECTLY implements transparency (exposing memory graph). All memory operations will have structured Pino logging. State changes visible through UI and logs.

### Principle III: Type Safety & Testability
✅ **PASS** - TypeScript throughout. Zod schemas for API contracts. 3-tier testing applies:
- Unit tests: Memory CRUD operations, search ranking, duplicate detection logic
- Postgres validation test: Extend existing test to validate new query patterns (semantic search pagination)
- Manual smoke tests: Real embeddings, real LLM memory formation, real-time WebSocket sync

No mocked "integration tests"—unit tests use deterministic inputs, Postgres test uses real DB, manual tests validate real API behavior.

### Principle IV: Incremental & Modular Development
✅ **PASS** - User stories already prioritized P1-P5. Each independently testable:
- P1 (Real-Time Visibility): Backend events + UI display
- P2 (Search): Semantic search endpoint + results UI
- P3 (Edit/Delete): CRUD endpoints + edit UI
- P4 (Manual Creation): Create endpoint + form UI
- P5 (Duplicates): Detection logic + UI indicators

Small commits per user story, tests per increment.

### Principle V: Stack Discipline
✅ **PASS** - No new dependencies outside approved stack:
- Fastify 5.6.1, @fastify/websocket 11.2.0 (already installed)
- React 18.2.0, Vite 5.2.12 (already installed)
- Zod 4.1.11 for API schemas (already installed)
- vitest-websocket-mock 0.5.0 for testing (already installed)

All versions match tech-stack.md. No version bumps needed.

### Principle VI: Configuration Over Hardcoding
✅ **PASS** - Memory capacity limits, similarity thresholds, warning percentages will be configurable via .env:
- `MEMORY_MAX_PER_USER=1000`
- `MEMORY_DUPLICATE_THRESHOLD=0.95`
- `MEMORY_CAPACITY_WARN_PCT=0.80`

Embedding endpoint already configurable (DeepInfra/OpenAI-compatible). WebSocket endpoint path configurable.

### Principle VII: Operator-Centric Design
✅ **PASS** - Feature explicitly targets single-operator hobby deployments:
- No auth complexity (reverse proxy assumed)
- Memory editing designed for safety (confirmation dialogs, reversible via delete)
- Clear feedback loops (real-time updates, success/error states)
- Documentation will include quickstart for Docker Compose setup

No enterprise features (multi-tenant, fine-grained permissions, collaboration).

**RESULT: ALL PRINCIPLES PASS ✅ — No violations requiring complexity justification.**

## Project Structure

### Documentation (this feature)

```text
specs/010-memory-brain-ui/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── rest-api.md      # REST endpoint contracts (GET/POST/PUT/DELETE /api/memory/*)
│   └── websocket.md     # WebSocket event schemas (memory.created, memory.updated, etc.)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Backend (Fastify + LangGraph)
apps/server/src/
├── routes/
│   └── memory.ts        # NEW: REST endpoints for CRUD operations
├── websocket/
│   └── events.ts        # MODIFIED: Add memory event emitters
├── agent/
│   └── memory/
│       ├── store.ts     # EXISTING: PostgresMemoryStore (no changes needed)
│       └── service.ts   # NEW: Business logic for duplicate detection, validation
└── config/
    └── env.ts           # MODIFIED: Add memory capacity/threshold config

apps/server/__tests__/
├── routes/
│   └── memory.test.ts   # NEW: Unit tests for REST endpoints
├── websocket/
│   └── events.test.ts   # NEW: WebSocket event emission tests
└── agent/memory/
    └── service.test.ts  # NEW: Duplicate detection, capacity validation tests

# Frontend (React + Vite)
apps/client/src/
├── components/
│   └── MemoryBrowser/   # NEW: Sidebar component
│       ├── MemoryBrowser.tsx
│       ├── MemoryList.tsx
│       ├── MemorySearch.tsx
│       ├── MemoryEditor.tsx
│       └── MemoryBrowser.test.tsx
├── hooks/
│   ├── useMemories.ts   # NEW: React Query hooks for CRUD
│   └── useWebSocket.ts  # MODIFIED: Add memory event listeners
└── services/
    └── memoryApi.ts     # NEW: API client for memory endpoints

apps/client/__tests__/
└── components/MemoryBrowser/
    └── MemoryBrowser.test.tsx  # NEW: Component unit tests

# Shared Schemas
packages/chat-shared/src/
└── schemas/
    └── memory.ts        # MODIFIED: Add API request/response schemas
```

**Structure Decision**: Web application (Option 2) selected because this feature spans backend REST/WebSocket endpoints and a React frontend UI. Backend handles CRUD operations against PostgresMemoryStore; frontend provides the memory browser sidebar. Existing monorepo structure (apps/server, apps/client, packages/chat-shared) accommodates this cleanly.

---

## Phase 0: Research

**Status**: Completed ✅  
**Output**: `research.md`

### Technical Unknowns Identified

Six critical unknowns requiring investigation before design phase:

1. **WebSocket Event Broadcasting** (FR-002, FR-007) - How to broadcast memory lifecycle events to all thread connections without duplicating? Reuse ChatStreamEvent or define new types? Persistent via OutboxStore or ephemeral?

2. **Semantic Search Pagination** (FR-005, FR-019, FR-020) - Offset vs. cursor pagination for similarity-ranked results? Does pgvector IVFFlat maintain stable sort order? UI pattern (infinite scroll vs. Load More)?

3. **Duplicate Detection Strategy** (FR-015, FR-016) - Synchronous blocking during upsertMemory vs. async background job? Agent-side vs. client-side validation? Full namespace scan or recent-N optimization?

4. **Memory Browser State Management** (FR-001, FR-008) - localStorage vs. server-side persistence? Cross-tab sync needed? Per-thread vs. global state scope?

5. **Capacity Warning UX** (FR-022) - Persistent banner vs. dismissible toast? Hard block at 1000 or soft warning at 800? Suggest specific memories to delete?

6. **Memory Edit Conflict Resolution** (FR-025) - Optimistic locking via updated_at vs. last-write-wins? Diff view vs. simple reload prompt? Queue/debounce edits?

See `research.md` for detailed questions and research outcomes.

**Next Steps**: Resolve all unknowns through codebase investigation and benchmarks before proceeding to Phase 1 design.

---

## Phase 1: Design & Contracts

**Status**: Pending (blocked by Phase 0 research)  
**Output**: `data-model.md`, `contracts/*.md`, `quickstart.md`

### Planned Artifacts

Once research unknowns are resolved, Phase 1 will produce:

1. **data-model.md** - Entity definitions extracted from spec (Memory Entry, Memory Collection, Search Query, Memory Notification, Duplicate Detection Result)

2. **contracts/rest-api.md** - REST endpoint contracts:
   - `GET /api/memory?threadId={id}&limit={n}&offset={m}` - List memories with pagination
   - `GET /api/memory/:id` - Get single memory details
   - `POST /api/memory` - Manually create memory
   - `PUT /api/memory/:id` - Update memory content
   - `DELETE /api/memory/:id` - Delete memory
   - `GET /api/memory/search?threadId={id}&query={text}&limit={n}` - Semantic search
   - `GET /api/memory/stats?threadId={id}` - Capacity metrics (total count, warnings)

3. **contracts/websocket.md** - WebSocket event schemas (decision pending Unknown 1):
   - `memory.created` - New memory stored by agent or operator
   - `memory.updated` - Memory content/metadata changed
   - `memory.deleted` - Memory removed
   - `memory.capacity_warning` - 80% threshold crossed

4. **quickstart.md** - Developer onboarding guide:
   - How to test memory CRUD locally
   - WebSocket event debugging with browser DevTools
   - Running manual smoke tests (real embeddings, real agent memory formation)
   - Extending with new memory event types

**Blockers**: Phase 1 cannot proceed until all 6 research unknowns have documented decisions in `research.md`.

---

## Phase 2: Task Breakdown

**Status**: Not Started (blocked by Phase 1)  
**Output**: `tasks.md` (generated by `/speckit.tasks` command)

Phase 2 will decompose the implementation into small, testable commits aligned with user stories P1-P5. This phase is NOT part of `/speckit.plan` workflow—it will be executed separately via `/speckit.tasks` after Phase 1 completion.

**Expected Task Structure**:
- P1 tasks: Backend memory CRUD endpoints, WebSocket event emitters, React MemoryBrowser sidebar
- P2 tasks: Semantic search endpoint, search UI with relevance ranking
- P3 tasks: Edit/delete confirmation flows, optimistic UI updates
- P4 tasks: Manual memory creation form, validation
- P5 tasks: Duplicate detection service, similarity indicators UI

Each task will include:
- Acceptance criteria from spec
- Test requirements (unit + Postgres + manual smoke)
- Estimated complexity (S/M/L)
- Dependencies on other tasks

---

## Summary

**Implementation Plan Status**: Phase 0 (Research) complete with 6 unknowns documented. Waiting for research outcomes before Phase 1 design.

**Branch**: `010-memory-brain-ui` (active)  
**Spec**: [spec.md](./spec.md) (finalized, all clarifications resolved)  
**Constitution Check**: ✅ All 7 principles pass, no violations  
**Next Action**: Investigate Unknown 1 (WebSocket broadcasting pattern) as highest priority blocker

**Artifacts Generated**:
- ✅ `plan.md` (this file) - Technical context, constitution validation, structure decision
- ✅ `research.md` - 6 technical unknowns with investigation questions
- ⏸️ `data-model.md` - Pending Phase 1
- ⏸️ `contracts/rest-api.md` - Pending Phase 1
- ⏸️ `contracts/websocket.md` - Pending Phase 1
- ⏸️ `quickstart.md` - Pending Phase 1
- ⏸️ `tasks.md` - Pending Phase 2 (separate `/speckit.tasks` command)

**Report**: Implementation planning workflow paused at Phase 0 completion. Research phase requires human/LLM investigation of codebase patterns, benchmarks, and architecture decisions before contracts can be designed. Recommend assigning research tasks to resolve unknowns, then re-invoking planning workflow to complete Phase 1.
