# Tasks: Agent CRUD UI

**Feature**: 011-agent-crud-ui  
**Date**: 2025-10-31  
**Status**: Ready for implementation  
**Total Tasks**: 72 (optimized via YAGNI/KISS + added AgentListItem schema update)

## Organization

Tasks are organized by user story to enable independent implementation and testing:
- **US1**: View Agents (P1) 🎯 MVP
- **US2**: Create Agent (P2)
- **US3**: Edit Agent (P3)
- **US4**: Delete Agent (P4)
- **US5**: Validate Configuration (P2)

## Optimizations Applied

- ✅ Removed duplicate schema files (use shared package only)
- ✅ Removed YAGNI: Custom validation wrappers (use Zod directly)
- ✅ Removed YAGNI: Toast notification system (use inline messages)
- ✅ Removed YAGNI: Breadcrumb navigation (use back button)
- ✅ Merged validation tasks into single comprehensive update
- ✅ Merged related test tasks (POST, GET/PUT endpoints)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- File paths follow monorepo structure (apps/server, apps/client, packages/chat-shared)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Add Agent model to prisma/schema.prisma (id UUID, name, config JSONB, timestamps, threads relation)
- [X] T002 Run `docker-compose exec server pnpm prisma migrate dev --name add_agent_table` to generate migration
- [X] T003 Run `docker-compose exec server pnpm prisma generate` to update Prisma client types

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Review existing AgentConfigSchema in packages/chat-shared/src/schemas/agent.ts (already exists from spec 009)
- [X] T005 Update existing AgentListItemSchema to include createdAt, updatedAt, autonomyEnabled fields (remove description field per FR-002)
- [X] T006 Add missing validation rules to AgentConfigSchema: llm.maxTokens optional, memory.apiKey, string lengths (name max 100, systemPrompt max 10000), numeric ranges (temperature 0.0-2.0), conditional autonomy fields
- [X] T007 Run `pnpm --filter chat-shared build` to compile shared package

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Agents (Priority: P1) 🎯 MVP

**Goal**: Operators can view a list of all agents in the UI with basic metadata

**Independent Test**: Navigate to agents page → see list of existing agents (empty state if none exist)

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T008 [P] [US1] Unit test for GET /api/agents route in apps/server/src/routes/__tests__/agents.test.ts (empty list case)
- [X] T009 [P] [US1] Unit test for AgentList component rendering in apps/client/src/components/__tests__/AgentList.test.tsx

### Implementation for User Story 1

#### Backend (apps/server)

- [X] T009 [US1] Create AgentService class in apps/server/src/services/AgentService.ts with listAgents() method
- [X] T011 [US1] Implement GET /api/agents route in apps/server/src/routes/agents.ts (returns lightweight list)
- [X] T012 [US1] Add agent routes to Fastify app in apps/server/src/server.ts

#### Frontend (apps/client)

- [X] T013 [P] [US1] Create useAgents() hook in apps/client/src/hooks/useAgents.ts (fetch agent list, use AgentListItem from chat-shared)
- [X] T014 [US1] Create AgentList component in apps/client/src/components/AgentList.tsx (displays table/grid of agents)
- [X] T015 [US1] Create AgentCard component in apps/client/src/components/AgentCard.tsx (single agent display)
- [X] T016 [US1] Create EmptyState component in apps/client/src/components/EmptyState.tsx (no agents found)
- [X] T018 [US1] Add /agents route to apps/client/src/App.tsx with AgentList component

**Checkpoint**: At this point, User Story 1 should be fully functional (view list of agents)

---

## Phase 4: User Story 5 - Validate Configuration (Priority: P2) ✅ COMPLETE

**Goal**: Real-time validation of agent configurations with specific error messages

**Independent Test**: Open create/edit form → enter invalid values → see specific validation errors within 500ms

**Note**: Implementing validation BEFORE create/edit provides shared foundation for both stories

### Tests for User Story 5 ⚠️

- [X] T018 [P] [US5] Unit test for AgentConfigSchema validation in packages/chat-shared/src/schemas/__tests__/agent.test.ts (49 tests ✅)
- [X] T019 [P] [US5] Unit test for ValidationMessage component in apps/client/src/components/__tests__/ValidationMessage.test.tsx (10 tests ✅)

### Implementation for User Story 5

#### Shared Package (packages/chat-shared)

- [X] T020 [US5] Update AgentConfigSchema with all missing validation rules per data-model.md (required fields, llm.* ranges, memory.* ranges including apiKey, autonomy conditional validation, string length constraints) — **COMPLETED IN PHASE 2**

#### Frontend (apps/client)

- [X] T021 [US5] Create useValidation() hook in apps/client/src/hooks/useValidation.ts (debounced Zod validation) (9 tests ✅)
- [X] T022 [US5] Create ValidationMessage component in apps/client/src/components/ValidationMessage.tsx (error display) (10 tests ✅)
- [X] T023 [US5] Create FieldError component in apps/client/src/components/FieldError.tsx (inline field errors) (11 tests ✅)

**Checkpoint**: Validation infrastructure ready for create/edit forms — **325 TESTS PASSING** (61 chat-shared + 225 server + 39 client)

---

## Phase 5: User Story 2 - Create Agent (Priority: P2)

**Goal**: Operators can create new agents through a form UI with validation

**Independent Test**: Click "New Agent" → fill form → submit → see new agent in list

### Tests for User Story 2 ⚠️

- [X] T024 [P] [US2] Unit tests for POST /api/agents route (success + validation errors) in apps/server/src/routes/__tests__/agents.test.ts (6 tests ✅)
- [X] T025 [P] [US2] Unit test for AgentForm component in apps/client/src/components/__tests__/AgentForm.test.tsx (test created, FAILING per TDD ✅)

### Implementation for User Story 2

#### Backend (apps/server)

- [X] T026 [US2] Add createAgent() method to AgentService in apps/server/src/services/AgentService.ts — **COMPLETED IN PHASE 3**
- [X] T027 [US2] Implement POST /api/agents route with AgentConfigSchema validation in apps/server/src/routes/agents.ts — **COMPLETED IN PHASE 3**

#### Frontend (apps/client)

- [ ] T028 [P] [US2] Create AgentForm component in apps/client/src/components/AgentForm.tsx (base form structure)
- [ ] T029 [P] [US2] Create BasicInfoSection component in apps/client/src/components/form/BasicInfoSection.tsx (name, systemPrompt, personaTag - no ID field, auto-generated)
- [ ] T030 [P] [US2] Create LLMConfigSection component in apps/client/src/components/form/LLMConfigSection.tsx (model, temperature, API)
- [ ] T031 [P] [US2] Create MemoryConfigSection component in apps/client/src/components/form/MemoryConfigSection.tsx (memory settings)
- [ ] T032 [P] [US2] Create AutonomyConfigSection component in apps/client/src/components/form/AutonomyConfigSection.tsx (autonomy toggle + settings)
- [ ] T033 [US2] Integrate all form sections into AgentForm with useValidation() hook
- [ ] T034 [US2] Create useCreateAgent() hook in apps/client/src/hooks/useCreateAgent.ts (POST /api/agents)
- [ ] T035 [US2] Add "New Agent" button to AgentList component
- [ ] T036 [US2] Create /agents/new route in apps/client/src/App.tsx with AgentForm component
- [ ] T037 [US2] Add success message after agent creation (inline or simple alert)

**Checkpoint**: At this point, User Stories 1, 2, and 5 should all work independently

---

## Phase 6: User Story 3 - Edit Agent (Priority: P3)

**Goal**: Operators can modify existing agent configurations and save changes

**Independent Test**: Click agent → click "Edit" → modify fields → save → see updated values

### Tests for User Story 3 ⚠️

- [ ] T038 [P] [US3] Unit tests for GET /api/agents/:id and PUT /api/agents/:id routes (get, update, validation) in apps/server/src/routes/__tests__/agents.test.ts

### Implementation for User Story 3

#### Backend (apps/server)

- [ ] T039 [US3] Add getAgentById() method to AgentService in apps/server/src/services/AgentService.ts
- [ ] T040 [US3] Add updateAgent() method to AgentService in apps/server/src/services/AgentService.ts
- [ ] T041 [US3] Implement GET /api/agents/:id route in apps/server/src/routes/agents.ts
- [ ] T042 [US3] Implement PUT /api/agents/:id route with AgentConfigSchema validation in apps/server/src/routes/agents.ts

#### Frontend (apps/client)

- [ ] T043 [US3] Create useAgent() hook in apps/client/src/hooks/useAgent.ts (fetch single agent)
- [ ] T044 [US3] Create useUpdateAgent() hook in apps/client/src/hooks/useUpdateAgent.ts (PUT /api/agents/:id)
- [ ] T045 [US3] Update AgentForm to support both create and edit modes (mode prop)
- [ ] T046 [US3] Add "Edit" button to AgentCard component
- [ ] T047 [US3] Create /agents/:id/edit route in apps/client/src/App.tsx with AgentForm (edit mode)
- [ ] T048 [US3] Add loading state while fetching agent details
- [ ] T049 [US3] Add success message after agent update (inline or simple alert)

**Checkpoint**: All user stories except delete should now be independently functional

---

## Phase 7: User Story 4 - Delete Agent (Priority: P4)

**Goal**: Operators can safely delete agents with cascade deletion of conversations

**Independent Test**: Click agent → click "Delete" → confirm → see agent removed from list

### Tests for User Story 4 ⚠️

- [ ] T050 [P] [US4] Unit test for DELETE /api/agents/:id route in apps/server/src/routes/__tests__/agents.test.ts
- [ ] T051 [P] [US4] Postgres validation test for cascade delete (agent → threads → checkpoints) in apps/server/src/services/__tests__/AgentService.postgres.test.ts

### Implementation for User Story 4

#### Backend (apps/server)

- [ ] T052 [US4] Add deleteAgent() method to AgentService in apps/server/src/services/AgentService.ts
- [ ] T053 [US4] Implement cascade delete logic in deleteAgent(): find threads → delete checkpoints → delete threads → delete agent
- [ ] T054 [US4] Wrap cascade delete in Prisma transaction for atomicity
- [ ] T055 [US4] Implement DELETE /api/agents/:id route in apps/server/src/routes/agents.ts

#### Frontend (apps/client)

- [ ] T056 [US4] Create ConfirmationDialog component in apps/client/src/components/ConfirmationDialog.tsx (reusable modal)
- [ ] T057 [US4] Create useDeleteAgent() hook in apps/client/src/hooks/useDeleteAgent.ts (DELETE /api/agents/:id)
- [ ] T058 [US4] Add "Delete" button to AgentCard component with confirmation dialog
- [ ] T059 [US4] Show warning message in confirmation dialog about cascade delete (FR-017, FR-018)
- [ ] T060 [US4] Add success message after agent deletion (inline or simple alert)
- [ ] T061 [US4] Update agent list after successful deletion (optimistic update or refetch)

**Checkpoint**: All user stories should now be independently functional

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T062 [P] Add loading skeletons to AgentList component (apps/client/src/components/AgentList.tsx)
- [ ] T063 [P] Add error boundary to /agents routes (apps/client/src/components/ErrorBoundary.tsx)
- [ ] T064 [P] Add API error handling to all hooks (apps/client/src/hooks/useApiError.ts)
- [ ] T065 Add search/filter to AgentList component (filter by name client-side)
- [ ] T066 Add sorting to AgentList component (by name, created date)
- [ ] T067 [P] Add responsive design to all agent components (mobile-friendly layout)
- [ ] T068 [P] Update apps/client/src/App.tsx with agent routes navigation
- [ ] T069 [P] Document API endpoints in docs/api/agents.md
- [ ] T070 [P] Update README.md with agent management feature overview
- [ ] T071 Run quickstart.md validation checklist
- [ ] T072 Run hygiene loop: `pnpm lint → pnpm format:write → pnpm test`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - **US1 (View)**: P1 priority, should be implemented first
  - **US5 (Validate)**: P2 priority, shared foundation for US2 and US3
  - **US2 (Create)**: P2 priority, depends on US5 validation infrastructure
  - **US3 (Edit)**: P3 priority, reuses US2 form components and US5 validation
  - **US4 (Delete)**: P4 priority, depends on US1 for UI integration
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (View)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **US5 (Validate)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **US2 (Create)**: Depends on US5 validation infrastructure (T023-T030)
- **US3 (Edit)**: Depends on US2 form components (T037-T041) and US5 validation
- **US4 (Delete)**: Can start after Foundational (Phase 2), but UI integration depends on US1

### Recommended Execution Order

**Sequential (single developer)**:
1. Phase 1 (Setup) → Phase 2 (Foundational)
2. Phase 3 (US1 View) - Get list view working first
3. Phase 4 (US5 Validate) - Build validation before forms
4. Phase 5 (US2 Create) - Reuses validation from US5
5. Phase 6 (US3 Edit) - Reuses forms from US2 and validation from US5
6. Phase 7 (US4 Delete) - Add delete functionality last
7. Phase 8 (Polish) - Refine UX and documentation

**Parallel (team capacity)**:
- After Phase 2, US1 and US5 can be implemented in parallel
- After US5 completes, US2 and US4 can be implemented in parallel
- US3 must wait for US2 form components
- Phase 8 tasks marked [P] can run in parallel

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Backend routes before frontend hooks
- Shared components before page-level components
- Core implementation before polish (loading states, toasts)
- Story complete before moving to next priority

### Parallel Opportunities

All tasks marked `[P]` within a phase can run in parallel:
- **Phase 2**: None (sequential schema updates)
- **Phase 3**: T008, T009 (US1 tests), T013 (US1 frontend hook)
- **Phase 4**: T018, T019 (US5 tests)
- **Phase 5**: T024, T025 (US2 tests), T028-T032 (US2 form sections)
- **Phase 6**: T038 (US3 tests)
- **Phase 7**: T050-T051 (US4 tests)
- **Phase 8**: T062-T064, T067-T070 (polish tasks)

---

## Validation Checkpoints

After each user story phase, validate:

**US1 (View)** - Manual Smoke Test Checklist:
- [ ] Navigate to `/agents` shows list of agents (or empty state)
- [ ] Agent list loads in <2 seconds (SC-001)
- [ ] Verify database query: `psql -c "SELECT id, name, created_at FROM agents ORDER BY created_at DESC;"`

**US5 (Validate)** - Manual Smoke Test Checklist:
- [ ] Invalid configuration shows specific errors within 500ms (SC-003)
- [ ] Test via API: POST invalid config → 400 with error details
- [ ] Test via UI: Invalid form inputs show inline errors

**US2 (Create)** - Manual Smoke Test Checklist:
- [ ] Can create new agent through UI in <3 minutes (SC-002)
- [ ] Created agent appears in list immediately
- [ ] Verify in database: `psql -c "SELECT id, name FROM agents WHERE name = '<created-agent-name>';"`

**US3 (Edit)** - Manual Smoke Test Checklist:
- [ ] Can edit existing agent and save changes
- [ ] Changes take effect for new conversations within 1 second (SC-005)
- [ ] Verify in database: `psql -c "SELECT config FROM agents WHERE id = '<edited-agent-id>';"`

**US4 (Delete)** - Manual Smoke Test Checklist:
- [ ] Click Delete button on an agent card → confirmation dialog appears
- [ ] Click "Cancel" in dialog → agent NOT deleted
- [ ] Click "Delete" in confirmation → agent removed from list
- [ ] Verify agent deleted from database: `psql -c "SELECT id, name FROM agents;"`
- [ ] Verify cascade: threads deleted → `psql -c "SELECT COUNT(*) FROM threads WHERE agent_id = '<deleted-id>';"`
- [ ] Verify cascade: checkpoints deleted → `psql -c "SELECT COUNT(*) FROM lang_graph_checkpoints WHERE thread_id IN (SELECT id FROM threads WHERE agent_id = '<deleted-id>');"`
- [ ] Delete non-existent agent (manually test API) → 404 error
- [ ] Delete with invalid UUID (manually test API) → 400 error

**Final Integration**:
- [ ] All user stories work independently
- [ ] Run full hygiene loop: `pnpm lint → pnpm format:write → pnpm test`
- [ ] Follow quickstart.md validation checklist

---

## Notes

- **Test Strategy**: Unit tests for routes/components + 1 Postgres validation test for cascade delete + manual smoke tests for real LLM behavior (per constitution)
- **Shared Package**: All types/schemas in `packages/chat-shared` to ensure client/server consistency (AgentListItem, AgentConfig, AgentConfigSchema already exist)
- **Form Reuse**: US3 (Edit) reuses US2 (Create) form components with mode prop
- **Validation**: US5 implemented before US2/US3 to provide shared validation infrastructure
- **Cascade Delete**: Application-layer transactions (not database FK constraints) because agentId can reference filesystem agents
- **Migration**: No automated migration - operators manually recreate agents (clarification decision)
- **API Keys**: Stored as plain text (single operator trusted environment - clarification decision)
- **Success Messages**: Using inline messages or simple alerts (no toast system for Phase 1 - KISS principle)
- **Navigation**: Using back button + clear links (no breadcrumbs for 2-level nav - KISS principle)
- **Validation**: Using Zod directly via .parse()/.safeParse() (no custom wrappers - YAGNI principle)
