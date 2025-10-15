# Tasks: Migrate to Events & Effects Architecture

**Input**: Design documents from `/specs/008-migrate-to-events-effects/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Unit tests (deterministic), one Postgres validation test, manual smoke test checklist per best-practices.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions
- Monorepo structure: `apps/server/src/` for backend implementation
- Shared types: `packages/chat-shared/src/`
- Tests: `apps/server/src/__tests__/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and database schema

- [X] T001 Add Prisma models for events and effects in `prisma/schema.prisma` (Event model with events table mapping, Effect model with effects table mapping)
- [ ] T002 Run Prisma migration: `pnpm prisma migrate dev --name add_events_effects_tables`
- [ ] T003 Run Prisma client generation: `pnpm prisma generate`
- [ ] T004 [P] Create Events & Effects subsystem directory structure in `apps/server/src/events/` with subdirectories: `events/`, `effects/`, `session/`
- [ ] T005 [P] Copy contract schema from `specs/008-migrate-to-events-effects/contracts/events.schema.ts` to `apps/server/src/events/types/events.schema.ts`
- [ ] T006 [P] Copy contract schema from `specs/008-migrate-to-events-effects/contracts/effects.schema.ts` to `apps/server/src/events/types/effects.schema.ts`
- [ ] T006a [P] Add polling interval configuration to `apps/server/.env` and `.env.example` (EFFECT_POLL_INTERVAL_MS=500, EVENT_QUEUE_PROCESS_INTERVAL_MS=50)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data access layer that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T007 [P] Create Event TypeScript types in `apps/server/src/events/events/types.ts` (Event, CreateEvent, EventType types derived from Zod schemas)
- [ ] T008 [P] Create Effect TypeScript types in `apps/server/src/events/effects/types.ts` (Effect, CreateEffect, EffectType, EffectStatus types derived from Zod schemas)
- [ ] T009 [P] Create SESSION_KEY types in `apps/server/src/events/session/types.ts` (SessionKey branded type, parseSessionKey helper, SessionProcessorConfig)
- [ ] T010 Implement EventStore in `apps/server/src/events/events/EventStore.ts` (create, getNextSeq, findBySession methods with PostgreSQL via Prisma)
- [ ] T011 Implement OutboxStore in `apps/server/src/events/effects/OutboxStore.ts` (create, getPending, updateStatus methods with PostgreSQL via Prisma, dedupe_key generation)
- [ ] T012 [P] Unit tests for EventStore in `apps/server/src/__tests__/events/EventStore.test.ts` (test sequence generation, session isolation, SESSION_KEY validation rejects invalid formats like missing colons/empty components/special chars, deterministic with fixed inputs)
- [ ] T013 [P] Unit tests for OutboxStore in `apps/server/src/__tests__/events/OutboxStore.test.ts` (test deduplication, status transitions, deterministic with fixed inputs)

**Checkpoint**: Foundation ready - EventStore and OutboxStore provide database access layer for all user stories

---

## Phase 3: User Story 1 - User Message Streamed via Events & Effects (Priority: P1) 🎯 MVP

**Goal**: Migrate user message handling from direct WebSocket sends to Events & Effects architecture with identical streaming behavior

**Independent Test**: Send a user message via WebSocket, verify streaming response arrives with same latency and format as current implementation. No user-visible changes.

### Implementation for User Story 1

- [ ] T014 [P] [US1] Implement EventQueue in `apps/server/src/events/events/EventQueue.ts` (in-process Map<SESSION_KEY, Queue<Event>> structure, enqueue/process methods, sequential processing per session, read EVENT_QUEUE_PROCESS_INTERVAL_MS from env)
- [ ] T015 [P] [US1] Implement SessionProcessor in `apps/server/src/events/session/SessionProcessor.ts` (orchestrates: load checkpoint → invoke graph → collect tokens → generate effects → commit transaction atomically, depends on T010/T011 stores)
- [ ] T016 [P] [US1] Implement EffectRunner in `apps/server/src/events/effects/EffectRunner.ts` (background worker polling OutboxStore at EFFECT_POLL_INTERVAL_MS from env, executes send_message effects via WebSocket, updates status, preserves token streaming, depends on T011)
- [ ] T017 [US1] Create exports in `apps/server/src/events/index.ts` (export EventQueue, EventStore, OutboxStore, SessionProcessor, EffectRunner, all types)
- [ ] T018 [US1] Modify `apps/server/src/routes/chat.ts` WebSocket route (replace direct agent.streamChat() calls with event creation via EventQueue.enqueue())
- [ ] T019 [P] [US1] Unit test for EventQueue in `apps/server/src/__tests__/events/EventQueue.test.ts` (test sequential processing per SESSION_KEY, concurrent processing across sessions, deterministic)
- [ ] T020 [P] [US1] Unit test for SessionProcessor in `apps/server/src/__tests__/events/SessionProcessor.test.ts` (test event → graph → effects flow, mock LangGraph agent, deterministic)
- [ ] T021 [P] [US1] Unit test for EffectRunner in `apps/server/src/__tests__/events/EffectRunner.test.ts` (test effect polling, WebSocket delivery, status updates, deterministic with mock WebSocket)

**Checkpoint**: At this point, User Story 1 should be fully functional - users can send messages and receive streaming responses via Events & Effects architecture

---

## Phase 4: User Story 2 - Durable Message Delivery on Reconnection (Priority: P1)

**Goal**: Enable automatic delivery of pending effects when user reconnects after WebSocket disconnection

**Independent Test**: Disconnect WebSocket mid-response, reconnect, verify pending message delivered automatically from outbox

### Implementation for User Story 2

- [ ] T022 [US2] Modify `apps/server/src/lib/websocket.ts` to detect WebSocket reconnection events (hook into existing reconnection logic, trigger EffectRunner.pollForSession(SESSION_KEY) on reconnect)
- [ ] T023 [US2] Unit test for reconnection delivery in `apps/server/src/__tests__/events/reconnection.test.ts` (disconnect mid-response, verify effect stays pending, reconnect, verify delivery, use vitest-websocket-mock)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - messages survive disconnections and are delivered on reconnect

---

## Phase 5: User Story 3 - Multi-Session Event Isolation (Priority: P1)

**Goal**: Verify that events, effects, and processing are strictly isolated by SESSION_KEY with no cross-contamination between concurrent sessions

**Independent Test**: Run two concurrent conversations in different threads, verify each processes independently with no interference

### Verification for User Story 3

- [ ] T024 [US3] Unit test for multi-session isolation in `apps/server/src/__tests__/events/multi-session.test.ts` (run two concurrent sessions, verify EventQueue processes separately, verify effects tagged with correct SESSION_KEY, verify no cross-delivery)

**Checkpoint**: At this point, User Stories 1, 2, AND 3 verified - architecture maintains session isolation

---

## Phase 6: User Story 4 - Effect Deduplication Prevents Duplicate Delivery (Priority: P2)

**Goal**: Verify that dedupe_key prevents duplicate effect execution when system restarts or effects are retried

**Independent Test**: Simulate effect retry scenario, verify dedupe_key prevents re-execution

### Verification for User Story 4

- [ ] T025 [US4] Unit test for effect deduplication in `apps/server/src/__tests__/events/OutboxStore.test.ts` (extend existing tests, verify same dedupe_key rejected on create, verify completed effects skipped on poll, deterministic)

**Checkpoint**: All user stories complete - migration fully functional with deduplication guarantees

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T026 [P] Add Postgres validation test in `apps/server/src/__tests__/integration/postgres-validation.test.ts` (extend existing test to verify events and effects tables exist, indexes present, uniqueness constraints enforced, use real Postgres with deterministic data)
- [ ] T027 [P] Create manual smoke test checklist in `specs/008-migrate-to-events-effects/checklists/smoke-tests.md` (test real LLM streaming, real WebSocket reconnection, real concurrent sessions, test 100 concurrent sessions with concurrent message sends to verify no ordering violations or cross-session contamination, verify user-visible behavior identical to pre-migration)
- [ ] T028 [P] Update documentation in `docs/` (document Events & Effects architecture, migration rationale, SESSION_KEY format, effect lifecycle)
- [ ] T029 Run full hygiene loop: `pnpm lint` → `pnpm format:write` → `pnpm test`
- [ ] T030 Run quickstart.md validation: Follow all steps in `specs/008-migrate-to-events-effects/quickstart.md` manually to verify implementation matches guide, including backward compatibility test (load existing checkpoint from current system, process new event, verify graph state preserved)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion (needs Prisma models generated) - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P1 → P1 → P2)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1) - Phase 3**: Can start after Foundational (Phase 2) - No dependencies on other stories. This is the MVP.
- **User Story 2 (P1) - Phase 4**: Depends on User Story 1 (needs EffectRunner) - Builds on US1's outbox delivery
- **User Story 3 (P1) - Phase 5**: Can start after Foundational (Phase 2) - Verification only, no new implementation if US1 correct
- **User Story 4 (P2) - Phase 6**: Can start after Foundational (Phase 2) - Verification only, no new implementation if OutboxStore correct

### Within Each User Story

- **US1**: EventQueue, SessionProcessor, EffectRunner can start in parallel → then routes.ts → then all tests in parallel
- **US2**: Implementation → integration test (sequential)
- **US3**: Integration test only (standalone)
- **US4**: Unit test only (extends existing OutboxStore tests)

### Parallel Opportunities

- **Setup**: T004, T005, T006, T006a can run in parallel
- **Foundational**: T007, T008, T009 can run in parallel (different files) → T010, T011 can run in parallel → T012, T013 can run in parallel
- **US1**: T014, T015, T016 can all run in parallel after T010/T011 complete (different files, dependencies satisfied) → T019-T021 can run in parallel
- **Polish**: T026, T027, T028 can run in parallel

---

## Parallel Example: User Story 1

```bash
# After Foundational phase completes (T010, T011 done), launch US1 implementation in parallel:
Task T014: "Implement EventQueue in apps/server/src/events/events/EventQueue.ts"
Task T015: "Implement SessionProcessor in apps/server/src/events/session/SessionProcessor.ts"
Task T016: "Implement EffectRunner in apps/server/src/events/effects/EffectRunner.ts"

# Once implementation complete, launch all tests in parallel:
Task T019: "Unit test EventQueue"
Task T020: "Unit test SessionProcessor"
Task T021: "Unit test EffectRunner"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (6 tasks)
2. Complete Phase 2: Foundational (7 tasks) - CRITICAL, blocks all stories
3. Complete Phase 3: User Story 1 (8 tasks)
4. **STOP and VALIDATE**: Test User Story 1 independently (send message, verify streaming response identical)
5. **Total MVP**: 21 tasks
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready (13 tasks)
2. Add User Story 1 → Test independently → Deploy/Demo (MVP! 21 tasks total)
3. Add User Story 2 → Test independently → Deploy/Demo (23 tasks total)
4. Add User Story 3 → Test independently → Validate (24 tasks total)
5. Add User Story 4 → Test independently → Validate (25 tasks total)
6. Polish phase → Production ready (30 tasks total)

Each story adds reliability without breaking previous stories.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (13 tasks)
2. Once Foundational is done:
   - Developer A: User Story 1 (8 tasks) - MVP critical
   - Developer B: User Story 3 (1 task) - Can start in parallel with US1
   - Developer C: User Story 4 (1 task) - Can start in parallel with US1
3. After US1 complete:
   - Developer A: User Story 2 (2 tasks) - Depends on US1's EffectRunner
4. Polish phase: All developers in parallel on T026, T027, T028

---

## Notes

- **[P]** tasks = different files, no dependencies - can run in parallel
- **[Story]** label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- **Tests follow best-practices.md**: Unit tests (deterministic), one Postgres validation test (real DB, mocked embeddings), manual smoke tests (real LLM)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **US1 is MVP** - if this doesn't work, nothing works. Focus here first.
- **US2 builds on US1** - must complete US1 before US2
- **US3 and US4 are verification** - can start after Foundational, mainly test tasks

---

## Summary

**Total Tasks**: 31  
**Task Count per Story**:
- Setup: 7 tasks (includes T006a for configuration)
- Foundational: 7 tasks (BLOCKS all stories)
- User Story 1: 8 tasks (MVP)
- User Story 2: 2 tasks
- User Story 3: 1 task
- User Story 4: 1 task
- Polish: 5 tasks

**Parallel Opportunities**: 14 tasks marked [P] can run in parallel within their phase (T004-T006a, T007-T009, T012-T013, T014-T016, T019-T021, T026-T028)

**Independent Test Criteria**:
- US1: Send message → verify streaming response identical to current
- US2: Disconnect mid-response → reconnect → verify delivery
- US3: Two concurrent conversations → verify no interference
- US4: Simulate retry → verify no duplicate delivery

**Suggested MVP Scope**: Setup + Foundational + User Story 1 = 22 tasks

**Implementation Path**: This is a migration, not a feature addition. User-visible behavior must remain identical. Focus on US1 as MVP, then incrementally add US2 (reliability), US3 (verification), US4 (verification).
