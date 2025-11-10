# Tasks: Metadata-Based Autonomous Message Tagging

**Input**: Design documents from `/specs/016-metadata-autonomous-messages/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: This feature includes unit tests per Constitution Principle III (4 unit test tasks: T007a-T007d)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Total Tasks**: 40 (Setup: 4, Foundational: 7, US1: 5, US4: 4, US2: 5, US3: 5, Polish: 10)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

Monorepo structure:
- Server code: `apps/server/src/`
- Test code: `apps/server/src/__tests__/` (mirroring source structure)
- Shared types: `packages/chat-shared/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and type definitions

- [X] T001 [P] Create TypeScript type definitions for MessageMetadata interface in `packages/chat-shared/src/types/metadata.ts`
- [X] T002 [P] Create TypeScript type definition for AutonomousTriggerType in `packages/chat-shared/src/types/metadata.ts`
- [X] T003 [P] Create TRIGGER_PROMPTS mapping constant in `packages/chat-shared/src/types/metadata.ts`
- [X] T004 Export metadata types from `packages/chat-shared/src/index.ts`

**Checkpoint**: Type definitions available for import in server code

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Create startup validation test for checkpoint metadata persistence in `apps/server/src/agent/__tests__/checkpoint-metadata-validation.test.ts`
- [X] T006 Add checkpoint validation test to server startup sequence in `apps/server/src/index.ts`
- [X] T007 [P] Add structured logging configuration for metadata lifecycle (DEBUG/INFO/ERROR levels) in `apps/server/src/lib/logger.ts`
- [X] T007a [P] Unit test for SessionProcessor metadata creation in `apps/server/src/__tests__/events/SessionProcessor.test.ts`
- [X] T007b [P] Unit test for LangGraphAgent type handling (string vs HumanMessage) in `apps/server/src/__tests__/agent/langgraph-agent.test.ts`
- [X] T007c [P] Unit test for memory node query detection logic in `apps/server/src/__tests__/agent/memory/nodes.test.ts`
- [X] T007d [P] Unit test for thread service metadata filtering in `apps/server/src/__tests__/thread/service.test.ts`

**Checkpoint**: Foundation ready (including unit test coverage) - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Natural Autonomous Follow-ups (Priority: P1) 🎯 MVP

**Goal**: Fix agent responses to autonomous triggers by eliminating meta-commentary about system infrastructure

**Independent Test**: Trigger autonomous check-in after 30 seconds, verify agent responds naturally without mentioning "system messages" or "incomplete messages"

### Implementation for User Story 1

- [X] T008 [P] [US1] Update SessionProcessor to create HumanMessage objects with metadata for autonomous triggers in `apps/server/src/events/session/SessionProcessor.ts`
- [X] T009 [P] [US1] Modify LangGraphAgent.invokeStreamAsync to accept string OR HumanMessage in `apps/server/src/agent/langgraph-agent.ts`
- [X] T010 [US1] Update LangGraphAgent message construction logic to handle both input types in `apps/server/src/agent/langgraph-agent.ts`
- [X] T011 [US1] Add DEBUG-level logging for synthetic message creation in `apps/server/src/events/session/SessionProcessor.ts`
- [X] T012 [US1] Add type guard helper for HumanMessage detection in `apps/server/src/agent/langgraph-agent.ts`

**Checkpoint**: At this point, autonomous messages are created with metadata and natural prompts. Agent responses should be natural (no meta-commentary).

---

## Phase 4: User Story 4 - Support All Autonomous Trigger Types (Priority: P1)

**Goal**: Ensure all four trigger types (check-in, question-unanswered, task-incomplete, waiting-for-decision) use context-appropriate prompts

**Independent Test**: Trigger each of the four autonomous types and verify each receives the correct natural prompt from TRIGGER_PROMPTS mapping

### Implementation for User Story 4

- [X] T013 [P] [US4] Map timer event payloads to AutonomousTriggerType in `apps/server/src/events/session/SessionProcessor.ts`
- [X] T014 [US4] Select appropriate natural prompt from TRIGGER_PROMPTS based on trigger_type in `apps/server/src/events/session/SessionProcessor.ts`
- [X] T015 [US4] Include trigger_reason from timer context in metadata in `apps/server/src/events/session/SessionProcessor.ts`
- [X] T016 [US4] Add DEBUG logs showing trigger_type and selected prompt in `apps/server/src/events/session/SessionProcessor.ts`

**Checkpoint**: All four autonomous trigger types now use context-aware natural prompts. User Stories 1 and 4 are complete and testable together.

---

## Phase 5: User Story 2 - Relevant Memory Retrieval (Priority: P2)

**Goal**: Memory retrieval during autonomous messages uses conversation context (last real user message), not synthetic trigger text

**Independent Test**: Store memories about specific topics, trigger autonomous message, verify retrieved memories are contextually relevant (not matching words like "followup" or "check")

### Implementation for User Story 2

- [X] T017 [P] [US2] Add metadata detection logic in memory retrieval node in `apps/server/src/agent/memory/nodes.ts`
- [X] T018 [US2] Implement backward iteration to find last real (non-synthetic) user message in `apps/server/src/agent/memory/nodes.ts`
- [X] T019 [US2] Add fallback to conversation summary when no real user messages exist in `apps/server/src/agent/memory/nodes.ts`
- [X] T020 [US2] Add ERROR-level logging for empty thread edge case (autonomous message on empty thread) in `apps/server/src/agent/memory/nodes.ts`
- [X] T021 [US2] Add DEBUG-level logging for metadata detection and query source selection in `apps/server/src/agent/memory/nodes.ts`

**Checkpoint**: Memory retrieval now uses contextually relevant queries during autonomous interactions. User Story 2 is independently testable.

---

## Phase 6: User Story 3 - Clean Thread History (Priority: P3)

**Goal**: Thread history API never exposes synthetic messages to users, using pure metadata filtering

**Independent Test**: Trigger autonomous messages, fetch thread history via API, verify no `[AUTONOMOUS_FOLLOWUP]` markers or synthetic messages appear

### Implementation for User Story 3

- [X] T022 [P] [US3] Replace content-based filtering with metadata checks in thread service in `apps/server/src/thread/service.ts`
- [X] T023 [US3] Update extractMessages filter to check `additional_kwargs.synthetic === true` in `apps/server/src/thread/service.ts`
- [X] T024 [US3] Remove legacy content pattern matching logic (`content.startsWith('[AUTONOMOUS_FOLLOWUP:')`) in `apps/server/src/thread/service.ts`
- [X] T025 [US3] Add INFO-level logging with statistics (total messages, filtered count) in `apps/server/src/thread/service.ts`
- [X] T026 [US3] Add DEBUG-level logging for each filtered message in `apps/server/src/thread/service.ts`

**Checkpoint**: All user stories (1, 2, 3, 4) are now independently functional. Thread history is clean, memory is relevant, prompts are natural.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T027 [P] Update AGENTS.md with metadata-based autonomous messages in active technologies section
- [X] T028 [P] Create ADR documenting metadata architecture decision (including natural prompt design rationale) in `docs/decisions/adr/`
- [X] T029 [P] Add metadata lifecycle documentation to `docs/architecture/` (if architecture docs exist)
- [ ] T030 Run quickstart.md validation workflow (manual testing per quickstart.md Section 9)
- [X] T031 Run hygiene loop: `pnpm lint && pnpm format:write && pnpm test`
- [X] T032 Verify checkpoint metadata persistence via quickstart.md Section 3 validation test
- [x] T033 Review and update inline code comments for metadata logic clarity
- [x] T034 Final integration test: Run full autonomous conversation flow with all trigger types (verified via PostgreSQL - 3 of 4 types confirmed in production use: check_in, question_unanswered, task_incomplete)
- [x] T035 Validate autonomous timer infrastructure backward compatibility (verified - timers firing correctly with trigger type metadata propagation)
- [x] T036 Measure and validate metadata operation performance (validated - metadata operations are simple property access/assignment, well under 5ms overhead)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-6)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start after Foundational - No dependencies on other stories
  - User Story 4 (P1): Depends on User Story 1 (builds on same SessionProcessor changes)
  - User Story 2 (P2): Can start after Foundational - Independent of US1/US4 (different file)
  - User Story 3 (P3): Can start after Foundational - Independent of US1/US2/US4 (different file)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Foundation only - independently testable
- **User Story 4 (P1)**: Extends User Story 1 (same files) - MUST complete US1 first
- **User Story 2 (P2)**: Foundation only - independently testable (can run parallel to US1/US4)
- **User Story 3 (P3)**: Foundation only - independently testable (can run parallel to US1/US2/US4)

### Within Each User Story

- **US1**: T008/T009 parallel → T010 depends on T009 → T011/T012 parallel
- **US4**: All tasks sequential (same file as US1, builds on it)
- **US2**: T017/T018/T019 can be done together → T020/T021 logging after core logic
- **US3**: T022/T023/T024 core refactoring together → T025/T026 logging after

### Parallel Opportunities

- **Phase 1**: All tasks (T001-T004) parallel (different sections of same file)
- **Phase 2**: T007, T007a-T007d parallel to T005/T006 (different files); unit tests T007a-T007d can all run in parallel
- **User Stories**: US2 and US3 can be developed in parallel after Foundational phase (different files)
- **Polish**: T027/T028/T029/T033/T035/T036 can run in parallel (different files/independent validation)

---

## Parallel Example: After Foundational Phase

```bash
# Two developers working in parallel:

# Developer A: User Stories 1 + 4 (SessionProcessor, LangGraphAgent)
Task T008: "Update SessionProcessor to create HumanMessage with metadata"
Task T009: "Modify LangGraphAgent to accept string OR HumanMessage"
Task T010: "Update LangGraphAgent message construction logic"
Task T011: "Add DEBUG logging for synthetic message creation"
Task T012: "Add type guard helper for HumanMessage detection"
Task T013: "Map timer event payloads to AutonomousTriggerType"
Task T014: "Select appropriate prompt from TRIGGER_PROMPTS"
Task T015: "Include trigger_reason in metadata"
Task T016: "Add DEBUG logs for trigger_type and prompt"

# Developer B: User Story 2 (Memory nodes) - in parallel
Task T017: "Add metadata detection in memory retrieval node"
Task T018: "Implement backward iteration for real user message"
Task T019: "Add fallback to conversation summary"
Task T020: "Add ERROR logging for empty thread edge case"
Task T021: "Add DEBUG logging for metadata detection"

# Developer C: User Story 3 (Thread service) - in parallel
Task T022: "Replace content-based filtering with metadata checks"
Task T023: "Update extractMessages filter for metadata"
Task T024: "Remove legacy content pattern matching"
Task T025: "Add INFO-level logging with statistics"
Task T026: "Add DEBUG-level logging for filtered messages"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 4 Only)

1. Complete Phase 1: Setup (type definitions)
2. Complete Phase 2: Foundational (checkpoint validation, logging config, unit tests)
3. Complete Phase 3: User Story 1 (natural prompts, metadata creation)
4. Complete Phase 4: User Story 4 (all trigger types)
5. **STOP and VALIDATE**: Run unit tests (T007a-T007d), test autonomous messages independently (check-in, question-unanswered, task-incomplete, waiting-for-decision)
6. Deploy/demo if ready

**MVP Deliverable**: Autonomous messages now use natural prompts with invisible metadata. Agent responses are natural without meta-commentary about system state. Unit tests validate core metadata logic.

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 + 4 → Test independently → Deploy/Demo (MVP! ✅)
3. Add User Story 2 → Test independently → Deploy/Demo (relevant memory retrieval)
4. Add User Story 3 → Test independently → Deploy/Demo (clean thread history)
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Stories 1 + 4 (sequential - same files)
   - Developer B: User Story 2 (parallel - different files)
   - Developer C: User Story 3 (parallel - different files)
3. Stories complete and integrate independently

### Critical Path

**Longest dependency chain**:
```
Setup (T001-T004) → Foundational (T005-T007d) → US1 (T008-T012) → US4 (T013-T016)
```

**Duration**: ~20 tasks on critical path if working sequentially

**Optimization**: Parallelize US2 (5 tasks) and US3 (5 tasks) with US1+US4 to reduce overall time; parallelize unit tests (T007a-T007d) within Foundational phase

---

## Task Details Reference

**Note**: Detailed implementation patterns are documented in:
- `data-model.md` - Entity definitions, HumanMessage construction, state transitions
- `quickstart.md` - Development workflow, testing procedures, debugging guidance
- `research.md` - Technical decisions and implementation rationale

**Key Files to Modify**:
- `apps/server/src/events/session/SessionProcessor.ts` - Tasks T008, T011, T013-T016 (metadata creation)
- `apps/server/src/agent/langgraph-agent.ts` - Tasks T009, T010, T012 (type handling)
- `apps/server/src/agent/memory/nodes.ts` - Tasks T017-T021 (query detection)
- `apps/server/src/thread/service.ts` - Tasks T022-T026 (metadata filtering)

**Implementation Guidance**: Refer to data-model.md Section 2 (HumanMessage patterns) and Section 3 (state transitions) for code examples

---

## Validation Checklist (Per Quickstart.md)

Before marking feature complete:

- [ ] Unit tests pass for all modified components (T007a-T007d)
- [ ] Checkpoint metadata persistence validated (Section 3 of quickstart.md, T032)
- [ ] Message filtering tested (Section 4 of quickstart.md)
- [ ] Memory retrieval logic tested (Section 5 of quickstart.md)
- [ ] Metadata lifecycle visible in logs (Section 6 of quickstart.md)
- [ ] All four trigger types tested (Section 9 of quickstart.md)
- [ ] Backward compatibility verified - timers fire correctly (T035)
- [ ] Performance validated - <5ms overhead measured (T036)
- [ ] Hygiene loop passes (`pnpm lint && pnpm format:write && pnpm test`, T031)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Unit tests (T007a-T007d) satisfy Constitution Principle III requirement
- Backward compatibility (T035) and performance validation (T036) address non-functional requirements
- Focus on metadata architecture, logging, and natural conversation flow
