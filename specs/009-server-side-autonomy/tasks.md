# Tasks: Server-Side Autonomy for Proactive Agent Follow-ups

**Input**: Design documents from `/specs/008-server-side-autonomy/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are included in this implementation per standard development workflow. Each user story includes unit tests before implementation (TDD approach).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
All paths relative to repository root `/Users/ronny.roos/dev/cerebrobot/`:
- Server code: `apps/server/src/`
- Tests: `apps/server/src/__tests__/` (co-located) or `apps/server/tests/`
- Prisma: `prisma/`
- Shared types: `packages/chat-shared/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and database schema

- [ ] T001 Add Prisma models for autonomy tables in `prisma/schema.prisma` (Event, Effect, Timer)
- [ ] T002 Run Prisma migration: `pnpm prisma migrate dev --name add_autonomy_tables`
- [ ] T003 Run Prisma client generation: `pnpm prisma generate`
- [ ] T004 [P] Create autonomy subsystem directory structure in `apps/server/src/autonomy/` (events/, effects/, timers/, session/)
- [ ] T005 [P] Copy contract schemas from `specs/008-server-side-autonomy/contracts/` to `apps/server/src/autonomy/types/` (events.schema.ts, effects.schema.ts, timers.schema.ts)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 [P] Implement SessionKey validation and parsing utilities in `apps/server/src/autonomy/types/session-key.ts` (parseSessionKey, validateSessionKey, branded type)
- [ ] T007 [P] Implement EventStore (PostgreSQL persistence for events) in `apps/server/src/autonomy/events/EventStore.ts` (createEvent, getNextSeq, listEvents)
- [ ] T008 [P] Implement OutboxStore (PostgreSQL persistence for effects) in `apps/server/src/autonomy/effects/OutboxStore.ts` (createEffects, pollPending, updateStatus, clearPendingBySession)
- [ ] T009 [P] Implement TimerStore (PostgreSQL persistence for timers) in `apps/server/src/autonomy/timers/TimerStore.ts` (upsertTimer, findDueTimers, cancelBySession, markPromoted)
- [ ] T010 Implement EventQueue (in-process per-SESSION_KEY queue) in `apps/server/src/autonomy/events/EventQueue.ts` (enqueue, dequeue, processOne, strict ordering)
- [ ] T011 Implement PolicyGates (hard cap and cooldown enforcement) in `apps/server/src/autonomy/session/PolicyGates.ts` (checkCanSendAutonomous, updateCounters, resetOnUserMessage)
- [ ] T012 Extend PostgresCheckpointSaver metadata to include autonomy counters in `apps/server/src/graph/checkpointer.ts` (event_seq, consecutive_autonomous_msgs, last_autonomous_at)
- [ ] T013 Add environment configuration for autonomy in `apps/server/src/config/autonomy.ts` (AUTONOMY_ENABLED, AUTONOMY_MAX_CONSECUTIVE, AUTONOMY_COOLDOWN_MS, TIMER_POLL_INTERVAL_MS, EFFECT_POLL_INTERVAL_MS)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Agent Sends Scheduled Follow-up (Priority: P1) 🎯 MVP

**Goal**: Enable agents to schedule and send proactive follow-up messages after a predetermined time without user input

**Independent Test**: Can be fully tested by initiating a conversation, waiting for the scheduled time, and verifying the agent sends a follow-up message autonomously

### Tests for User Story 1

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T014 [P] [US1] Unit test for TimerStore.upsertTimer in `apps/server/src/autonomy/timers/__tests__/TimerStore.test.ts` (create, upsert, duplicate timer_id handling)
- [ ] T015 [P] [US1] Unit test for TimerStore.findDueTimers in `apps/server/src/autonomy/timers/__tests__/TimerStore.test.ts` (due timers, past-scheduled timers, pending status filter)
- [ ] T016 [P] [US1] Unit test for TimerWorker.pollAndPromote in `apps/server/src/autonomy/timers/__tests__/TimerWorker.test.ts` (timer promotion, event creation, status update)
- [ ] T017 [P] [US1] Unit test for EffectRunner.processScheduleTimer in `apps/server/src/autonomy/effects/__tests__/EffectRunner.test.ts` (schedule_timer effect execution, timer store integration)
- [ ] T018 [P] [US1] Unit test for EffectRunner.processSendMessage in `apps/server/src/autonomy/effects/__tests__/EffectRunner.test.ts` (send_message effect execution, WebSocket delivery, dedupe key handling)

### Implementation for User Story 1

- [ ] T019 [US1] Implement TimerWorker background worker in `apps/server/src/autonomy/timers/TimerWorker.ts` (polling loop, findDueTimers, promote to events, logging)
- [ ] T020 [US1] Implement EffectRunner background worker in `apps/server/src/autonomy/effects/EffectRunner.ts` (polling loop, execute send_message, execute schedule_timer, status updates, deduplication)
- [ ] T021 [US1] Implement SessionProcessor orchestration in `apps/server/src/autonomy/session/SessionProcessor.ts` (event → checkpoint load → graph execution → effect generation → transaction commit)
- [ ] T022 [US1] Refactor LangGraph nodes to return effects instead of performing I/O in `apps/server/src/graph/nodes/` (extract WebSocket sends, timer scheduling to effect return values)
- [ ] T023 [US1] Integrate TimerWorker startup in `apps/server/src/index.ts` (initialize worker on server start, graceful shutdown)
- [ ] T024 [US1] Integrate EffectRunner startup in `apps/server/src/index.ts` (initialize worker on server start, graceful shutdown)
- [ ] T025 [US1] Add WebSocket delivery handler for send_message effects in `apps/server/src/lib/websocket.ts` (deliver message, handle closed connections, durable outbox on failure)
- [ ] T026 [US1] Add structured logging for timer firing in `apps/server/src/autonomy/timers/TimerWorker.ts` (Pino logger, timer_id, fire_at, session_key)
- [ ] T027 [US1] Add structured logging for effect execution in `apps/server/src/autonomy/effects/EffectRunner.ts` (Pino logger, effect type, status transitions, delivery outcomes)

**Checkpoint**: At this point, User Story 1 should be fully functional - agents can schedule and send autonomous follow-ups

---

## Phase 4: User Story 2 - User Message Cancels Pending Follow-ups (Priority: P1)

**Goal**: Ensure all pending timers and outbox effects are cancelled when a user sends a new message, preventing irrelevant autonomous messages

**Independent Test**: Can be fully tested by scheduling a follow-up, sending a user message before it fires, and verifying no stale follow-up is sent

### Tests for User Story 2

- [ ] T028 [P] [US2] Unit test for TimerStore.cancelBySession in `apps/server/src/autonomy/timers/__tests__/TimerStore.test.ts` (cancel all pending timers for session_key, status update to 'cancelled')
- [ ] T029 [P] [US2] Unit test for OutboxStore.clearPendingBySession in `apps/server/src/autonomy/effects/__tests__/OutboxStore.test.ts` (clear all pending effects for session_key, DELETE operation)
- [ ] T030 [P] [US2] Integration test for clear-on-user-message in `apps/server/src/autonomy/session/__tests__/SessionProcessor.test.ts` (user message → clear timers → clear effects → process message, order verification)

### Implementation for User Story 2

- [ ] T031 [US2] Implement clear-on-user-message logic in SessionProcessor in `apps/server/src/autonomy/session/SessionProcessor.ts` (on user_message event, call TimerStore.cancelBySession, call OutboxStore.clearPendingBySession before graph execution)
- [ ] T032 [US2] Add transaction safety for clear-on-user-message in `apps/server/src/autonomy/session/SessionProcessor.ts` (wrap clear + event creation in Prisma transaction)
- [ ] T033 [US2] Add logging for cancellation operations in `apps/server/src/autonomy/session/SessionProcessor.ts` (Pino logger, log cancelled timer count, cleared effect count)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - agents send follow-ups AND cancel them when users respond

---

## Phase 5: User Story 3 - Autonomy Hard Limits Prevent Message Storms (Priority: P1)

**Goal**: Enforce hard cap (3 consecutive autonomous messages) and cooldown (15 seconds between sends) to prevent overwhelming users

**Independent Test**: Can be tested by triggering scenarios where an agent would attempt excessive autonomous sends, then verifying the caps are enforced

### Tests for User Story 3

- [ ] T034 [P] [US3] Unit test for PolicyGates.checkCanSendAutonomous in `apps/server/src/autonomy/session/__tests__/PolicyGates.test.ts` (hard cap at 3, cooldown enforcement, counter reset on user message)
- [ ] T035 [P] [US3] Unit test for PolicyGates.updateCounters in `apps/server/src/autonomy/session/__tests__/PolicyGates.test.ts` (increment consecutive_autonomous_msgs, update last_autonomous_at)
- [ ] T036 [P] [US3] Integration test for blocked autonomous sends in `apps/server/src/autonomy/effects/__tests__/EffectRunner.test.ts` (attempt 4th consecutive send, verify blocked, internal note logged)

### Implementation for User Story 3

- [ ] T037 [US3] Integrate PolicyGates check in EffectRunner before send_message in `apps/server/src/autonomy/effects/EffectRunner.ts` (call PolicyGates.checkCanSendAutonomous, block if violation, log internal note)
- [ ] T038 [US3] Implement counter reset on user message in SessionProcessor in `apps/server/src/autonomy/session/SessionProcessor.ts` (call PolicyGates.resetOnUserMessage when processing user_message event)
- [ ] T039 [US3] Persist autonomy counters in checkpoint metadata in `apps/server/src/graph/checkpointer.ts` (extend metadata write with consecutive_autonomous_msgs, last_autonomous_at from PolicyGates state)
- [ ] T040 [US3] Load autonomy counters from checkpoint metadata in SessionProcessor in `apps/server/src/autonomy/session/SessionProcessor.ts` (restore PolicyGates state from checkpoint metadata on session resume)
- [ ] T041 [US3] Add structured logging for blocked autonomous sends in `apps/server/src/autonomy/effects/EffectRunner.ts` (Pino logger, log reason: hard_cap or cooldown, session_key, current counters)

**Checkpoint**: All critical safety features implemented - User Stories 1, 2, and 3 complete

---

## Phase 6: User Story 4 - System Recovers from Failures (Priority: P2)

**Goal**: Handle failures gracefully (WebSocket disconnect, process restart) with clear recovery rules

**Independent Test**: Can be tested by simulating failures at different points in the autonomy flow and verifying graceful handling

### Tests for User Story 4

- [ ] T042 [P] [US4] Unit test for OutboxStore deduplication in `apps/server/src/autonomy/effects/__tests__/OutboxStore.test.ts` (duplicate dedupe_key, UNIQUE constraint, skip re-execution)
- [ ] T043 [P] [US4] Integration test for WebSocket failure handling in `apps/server/src/autonomy/effects/__tests__/EffectRunner.test.ts` (send_message when connection closed, effect remains pending, no retry storm)
- [ ] T044 [P] [US4] Manual smoke test checklist for process restart in `specs/008-server-side-autonomy/checklists/smoke-tests.md` (schedule timer → restart → verify timers cleared per MVP stateless restart policy)

### Implementation for User Story 4

- [ ] T045 [US4] Implement dedupe_key generation in OutboxStore in `apps/server/src/autonomy/effects/OutboxStore.ts` (hash checkpoint_id + type + payload fingerprint, stable hash function)
- [ ] T046 [US4] Add idempotency check in EffectRunner in `apps/server/src/autonomy/effects/EffectRunner.ts` (before executing effect, check if dedupe_key already executed/completed, skip if duplicate)
- [ ] T047 [US4] Implement WebSocket failure handling in EffectRunner in `apps/server/src/autonomy/effects/EffectRunner.ts` (catch WebSocket send errors, log failure, leave effect in pending status for reconnection delivery)
- [ ] T048 [US4] Add reconnection handler to poll outbox in `apps/server/src/lib/websocket.ts` (on WebSocket reconnect event, trigger OutboxStore.pollPending for that session_key, deliver queued messages)
- [ ] T049 [US4] Add logging for failure scenarios in `apps/server/src/autonomy/effects/EffectRunner.ts` (log deduplication skips, WebSocket failures, retry attempts)

**Checkpoint**: System handles failures gracefully without data corruption or message duplication

---

## Phase 7: User Story 5 - Multi-Session Isolation (Priority: P2)

**Goal**: Ensure timers, effects, and state are isolated per conversation session across multiple concurrent users

**Independent Test**: Can be tested by running multiple concurrent conversation sessions and verifying their autonomy behaviors don't interfere

### Tests for User Story 5

- [ ] T050 [P] [US5] Integration test for multi-session isolation in `apps/server/src/autonomy/__tests__/multi-session.test.ts` (create 2 sessions, schedule timers in both, verify each fires only in correct session)
- [ ] T051 [P] [US5] Integration test for clear-on-user-message isolation in `apps/server/src/autonomy/__tests__/multi-session.test.ts` (user message in session1 clears only session1 timers, not session2)
- [ ] T052 [P] [US5] Integration test for PolicyGates per-session state in `apps/server/src/autonomy/__tests__/multi-session.test.ts` (session1 hits hard cap, session2 unaffected)

### Implementation for User Story 5

- [ ] T053 [US5] Verify session_key partitioning in EventQueue in `apps/server/src/autonomy/events/EventQueue.ts` (ensure Map<SESSION_KEY, Queue> isolation, no cross-session processing)
- [ ] T054 [US5] Verify session_key filtering in all store queries in `apps/server/src/autonomy/events/EventStore.ts`, `apps/server/src/autonomy/effects/OutboxStore.ts`, `apps/server/src/autonomy/timers/TimerStore.ts` (all WHERE clauses include session_key)
- [ ] T055 [US5] Verify PolicyGates state isolation in `apps/server/src/autonomy/session/PolicyGates.ts` (separate counter state per SESSION_KEY, no shared state)
- [ ] T056 [US5] Add session_key validation in SessionProcessor in `apps/server/src/autonomy/session/SessionProcessor.ts` (validate SESSION_KEY format on all event processing, reject invalid)

**Checkpoint**: All user stories complete - system supports multi-session autonomy with full isolation

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T057 [P] Add Postgres validation test extension in `apps/server/src/__tests__/integration/postgres-validation.test.ts` (verify events, effects, autonomy_timers tables exist, indexes present, constraints enforced)
- [ ] T058 [P] Create manual smoke test checklist in `specs/008-server-side-autonomy/checklists/smoke-tests.md` (test real LLM autonomous messaging, real WebSocket delivery, timer firing accuracy with real timestamps)
- [ ] T059 [P] Add configuration documentation in `docs/configuration.md` (document AUTONOMY_ENABLED, AUTONOMY_MAX_CONSECUTIVE, AUTONOMY_COOLDOWN_MS, TIMER_POLL_INTERVAL_MS, EFFECT_POLL_INTERVAL_MS environment variables)
- [ ] T060 [P] Update API documentation in `docs/api/` (document autonomy behavior, message tagging, limits)
- [ ] T061 Code cleanup: Remove any TODO comments in autonomy/ directory
- [ ] T062 Code cleanup: Ensure all functions have TSDoc comments
- [ ] T063 Performance optimization: Add database indexes if missing from migration
- [ ] T064 [P] Run full hygiene loop: `pnpm lint` → `pnpm format:write` → `pnpm test`
- [ ] T065 Run quickstart.md validation: Follow all steps manually to verify implementation matches guide

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start after Foundational - No dependencies on other stories
  - User Story 2 (P1): Can start after Foundational - Integrates with US1 but independently testable
  - User Story 3 (P1): Can start after Foundational - Integrates with US1 but independently testable
  - User Story 4 (P2): Can start after US1 complete (depends on EffectRunner, OutboxStore)
  - User Story 5 (P2): Can start after US1 complete (verifies isolation, no new features)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

```
Foundational (Phase 2)
    │
    ├──> User Story 1 (P1) - Agent Sends Scheduled Follow-up
    │        │
    │        ├──> User Story 2 (P1) - User Message Cancels Follow-ups (integrates with US1)
    │        │
    │        ├──> User Story 3 (P1) - Autonomy Hard Limits (integrates with US1)
    │        │
    │        ├──> User Story 4 (P2) - System Recovers from Failures (depends on US1 completion)
    │        │
    │        └──> User Story 5 (P2) - Multi-Session Isolation (verifies US1 isolation)
    │
    └──> Polish (Phase 8)
```

**MVP Scope**: User Stories 1, 2, 3 (all P1) provide complete autonomous messaging feature with safety guardrails. User Stories 4 and 5 (P2) add production robustness.

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD approach)
- Foundation components (stores, workers) before orchestration (SessionProcessor)
- Core implementation before integration points
- Logging added with implementation, not as afterthought
- Story complete and tested before moving to next priority

### Parallel Opportunities

- **Setup tasks**: T001-T005 can all run in parallel
- **Foundational tasks**: T006-T009 (stores) can run in parallel, T010-T013 depend on stores
- **Once Foundational completes**: 
  - User Story 1, 2, 3 can start in parallel if team capacity allows
  - Within each story, tests marked [P] can run in parallel
- **User Story 1 tests**: T014-T018 can all run in parallel
- **User Story 2 tests**: T028-T030 can all run in parallel
- **User Story 3 tests**: T034-T036 can all run in parallel
- **User Story 4 tests**: T042-T044 can all run in parallel
- **User Story 5 tests**: T050-T052 can all run in parallel
- **Polish tasks**: T057-T060, T064 can run in parallel

---

## Parallel Example: User Story 1 Implementation

```bash
# After tests are written and failing, launch parallel implementation:

# Terminal 1: Timer infrastructure
Task T019: "Implement TimerWorker in apps/server/src/autonomy/timers/TimerWorker.ts"

# Terminal 2: Effect infrastructure  
Task T020: "Implement EffectRunner in apps/server/src/autonomy/effects/EffectRunner.ts"

# After T019 and T020 complete:

# Terminal 3: Orchestration
Task T021: "Implement SessionProcessor in apps/server/src/autonomy/session/SessionProcessor.ts"

# Terminal 4: Graph refactoring
Task T022: "Refactor LangGraph nodes to return effects in apps/server/src/graph/nodes/"

# After all core implementation:

# Terminal 5-8: Integration and logging (parallel)
Task T023: "Integrate TimerWorker startup"
Task T024: "Integrate EffectRunner startup"
Task T025: "Add WebSocket delivery handler"
Task T026: "Add timer logging"
# Task T027 waits for T020 (EffectRunner)
```

---

## Estimation Guidance

**Total Tasks**: 65  
**Critical Path**: Setup (5) → Foundational (8) → US1 (14) → US2 (6) → US3 (9) → Polish (5) ≈ 47 tasks

**Effort Estimates** (approximate, adjust based on team velocity):

- **Phase 1 (Setup)**: 1-2 hours (Prisma migrations, directory structure)
- **Phase 2 (Foundational)**: 2-3 days (stores, EventQueue, PolicyGates, config - core infrastructure)
- **Phase 3 (US1)**: 3-4 days (TimerWorker, EffectRunner, SessionProcessor, graph refactoring - largest story)
- **Phase 4 (US2)**: 1 day (clear-on-user-message logic, simpler integration)
- **Phase 5 (US3)**: 1-2 days (PolicyGates integration, counter persistence)
- **Phase 6 (US4)**: 1-2 days (deduplication, failure handling, reconnection)
- **Phase 7 (US5)**: 1 day (verification tests, no new features)
- **Phase 8 (Polish)**: 1-2 days (documentation, cleanup, validation)

**Total Estimated Duration**: 10-15 days (single developer, sequential)  
**With Parallelization**: 6-8 days (2-3 developers, parallel user stories after Foundational)

**MVP Delivery** (US1+US2+US3 only): 7-10 days

---

## Implementation Strategy

### Recommended Approach

1. **Week 1**: Complete Setup + Foundational + User Story 1
   - Day 1: Setup (T001-T005) + start Foundational (T006-T009)
   - Day 2-3: Complete Foundational (T010-T013)
   - Day 4-5: User Story 1 tests + core implementation (T014-T022)

2. **Week 2**: Complete US2 + US3 + start US4
   - Day 1: US1 integration + logging (T023-T027)
   - Day 2: User Story 2 complete (T028-T033)
   - Day 3: User Story 3 complete (T034-T041)
   - Day 4-5: User Story 4 (T042-T049)

3. **Week 3**: Complete US5 + Polish + Validation
   - Day 1: User Story 5 complete (T050-T056)
   - Day 2-3: Polish + documentation (T057-T063)
   - Day 4-5: Full validation, smoke tests, hygiene loop

### MVP First Strategy

For fastest value delivery, implement only P1 user stories:

1. Setup + Foundational (T001-T013) - **Required**
2. User Story 1 (T014-T027) - **Core autonomy**
3. User Story 2 (T028-T033) - **Critical safety**
4. User Story 3 (T034-T041) - **Critical safety**
5. Polish essentials (T057, T064, T065) - **Quality gates**

**MVP Timeline**: 7-10 days → Delivers working autonomous messaging with safety guardrails

Then iterate:
- **Iteration 2**: Add User Story 4 for production robustness
- **Iteration 3**: Add User Story 5 verification + full polish

---

## Success Criteria Mapping

Tasks mapped to success criteria from spec.md:

- **SC-001** (Proactive follow-ups <1s latency): User Story 1 (T014-T027)
- **SC-002** (Cancel within 100ms): User Story 2 (T028-T033)
- **SC-003** (Hard cap enforcement): User Story 3 (T034-T041)
- **SC-004** (Strict event ordering): Foundational (T010 EventQueue) + User Story 1 (T021 SessionProcessor)
- **SC-005** (100 concurrent sessions): User Story 5 (T050-T056)
- **SC-006** (Graceful failure recovery): User Story 4 (T042-T049)
- **SC-007** (Message tagging): User Story 1 (T025 WebSocket delivery)
- **SC-008** (Effect deduplication): User Story 4 (T045-T046)

All success criteria achievable through task completion.

---

## Next Steps

1. **Review this tasks.md** with team for effort estimates and dependencies
2. **Set up project board** with columns: Setup, Foundational, US1, US2, US3, US4, US5, Polish
3. **Assign tasks** based on team capacity and skill sets
4. **Begin implementation** with Setup phase (T001-T005)
5. **Run hygiene loop after each phase** completion (`pnpm lint` → `pnpm format:write` → `pnpm test`)
6. **Track progress** in `specs/008-server-side-autonomy/IMPLEMENTATION_PROGRESS.md` (create if needed)

**Ready to implement!** 🚀
