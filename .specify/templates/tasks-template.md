---

description: "Task list template for feature implementation"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: The examples below include test tasks. Tests are OPTIONAL - only include them if explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- Paths shown below assume single project - adjust based on plan.md structure

<!-- 
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.
  
  The /speckit.tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - Feature requirements from plan.md
  - Entities from data-model.md
  - Endpoints from contracts/
  
  Tasks MUST be organized by user story so each story can be:
  - Implemented independently
  - Tested independently
  - Delivered as an MVP increment
  
  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project structure per implementation plan
- [ ] T002 Initialize [language] project with [framework] dependencies
- [ ] T003 [P] Configure linting and formatting tools

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

Examples of foundational tasks (adjust based on your project):

- [ ] T004 Setup database schema and migrations framework
- [ ] T005 [P] Implement authentication/authorization framework
- [ ] T006 [P] Setup API routing and middleware structure
- [ ] T007 Create base models/entities that all stories depend on
- [ ] T008 Configure error handling and logging infrastructure
- [ ] T009 Setup environment configuration management

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 1 (OPTIONAL - only if tests requested) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T010 [P] [US1] Contract test for [endpoint] in tests/contract/test_[name].py
- [ ] T011 [P] [US1] Integration test for [user journey] in tests/integration/test_[name].py

### Implementation for User Story 1

- [ ] T012 [P] [US1] Create [Entity1] model in src/models/[entity1].py
- [ ] T013 [P] [US1] Create [Entity2] model in src/models/[entity2].py
- [ ] T014 [US1] Implement [Service] in src/services/[service].py (depends on T012, T013)
- [ ] T015 [US1] Implement [endpoint/feature] in src/[location]/[file].py
- [ ] T016 [US1] Add validation and error handling
- [ ] T017 [US1] Add logging for user story 1 operations

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 2 (OPTIONAL - only if tests requested) ⚠️

- [ ] T018 [P] [US2] Contract test for [endpoint] in tests/contract/test_[name].py
- [ ] T019 [P] [US2] Integration test for [user journey] in tests/integration/test_[name].py

### Implementation for User Story 2

- [ ] T020 [P] [US2] Create [Entity] model in src/models/[entity].py
- [ ] T021 [US2] Implement [Service] in src/services/[service].py
- [ ] T022 [US2] Implement [endpoint/feature] in src/[location]/[file].py
- [ ] T023 [US2] Integrate with User Story 1 components (if needed)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - [Title] (Priority: P3)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 3 (OPTIONAL - only if tests requested) ⚠️

- [ ] T024 [P] [US3] Contract test for [endpoint] in tests/contract/test_[name].py
- [ ] T025 [P] [US3] Integration test for [user journey] in tests/integration/test_[name].py

### Implementation for User Story 3

- [ ] T026 [P] [US3] Create [Entity] model in src/models/[entity].py
- [ ] T027 [US3] Implement [Service] in src/services/[service].py
- [ ] T028 [US3] Implement [endpoint/feature] in src/[location]/[file].py

**Checkpoint**: All user stories should now be independently functional

---

[Add more user story phases as needed, following the same pattern]

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] TXXX [P] Documentation updates in docs/
- [ ] TXXX Code cleanup and refactoring
- [ ] TXXX Performance optimization across all stories
- [ ] TXXX [P] Additional unit tests (if requested) in tests/unit/
- [ ] TXXX Security hardening
- [ ] TXXX Run quickstart.md validation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (if tests requested):
Task: "Contract test for [endpoint] in tests/contract/test_[name].py"
Task: "Integration test for [user journey] in tests/integration/test_[name].py"

# Launch all models for User Story 1 together:
Task: "Create [Entity1] model in src/models/[entity1].py"
Task: "Create [Entity2] model in src/models/[entity2].py"
```

---

## Design Library Contribution Example

**Context**: When a UI component is missing from `@workspace/ui`, it must be added to the design library BEFORE use in apps (Constitution Principle IX).

**Workflow**: Check Storybook (`http://localhost:6006`) → If component missing → Add to `/packages/ui/` → Document → Test → Export → Use in app

### Example: Adding a Card Component to Design Library

**User Story Context**: US2 requires a Card component for displaying agent information, but Card doesn't exist in `@workspace/ui`.

#### Tasks Breakdown

```markdown
### Implementation for User Story 2

#### Design Library Contribution (Card Component)

- [ ] T020 [P] [US2] Check Storybook at http://localhost:6006 to verify Card component doesn't exist
- [ ] T021 [P] [US2] Create Card component in `packages/ui/src/components/primitives/card.tsx` (polymorphic, CVA variants: default/elevated/ghost, padding: none/sm/md/lg)
- [ ] T022 [P] [US2] Add TypeScript types for Card props (variant, padding, as, className)
- [ ] T023 [P] [US2] Unit tests for Card in `packages/ui/__tests__/components/card.test.tsx` (variants, polymorphic rendering, token props)
- [ ] T024 [P] [US2] Accessibility tests for Card in `packages/ui/__tests__/a11y/card.test.tsx` (axe-core validation, ARIA attributes)
- [ ] T025 [US2] Create Card stories in `packages/ui/src/stories/Card.stories.tsx` (Default, Elevated, Ghost, WithPadding variants)
- [ ] T026 [US2] Export Card from `packages/ui/src/index.ts`
- [ ] T027 [US2] Verify Card renders in Storybook at http://localhost:6006

#### App Integration (Use Card in AgentsPage)

- [ ] T028 [US2] Import Card from `@workspace/ui` in `apps/client/src/pages/AgentsPage.tsx`
- [ ] T029 [US2] Refactor AgentsPage to use Card component (replace hardcoded divs)
- [ ] T030 [US2] Verify AgentsPage renders correctly with Card component
```

### Task Pattern for Any Design Library Component

When adding a component to `@workspace/ui`, use this task pattern:

1. **Verification Task** (`[P]`): Check Storybook to confirm component is missing
2. **Component Implementation** (`[P]`): Create component file with CVA variants and token-driven styling
3. **TypeScript Types** (`[P]`): Define props interface, export types
4. **Unit Tests** (`[P]`): Test variants, polymorphic behavior, token props
5. **Accessibility Tests** (`[P]`): Axe-core validation, WCAG compliance
6. **Storybook Stories**: Document component with interactive examples (at least 3 variants)
7. **Export**: Add to `packages/ui/src/index.ts`
8. **Storybook Verification**: Confirm component appears in Storybook navigation
9. **App Integration**: Import from `@workspace/ui` and use in target app
10. **Visual Verification**: Test component in actual app context

**Parallel Opportunities**: Tasks 1-5 can run in parallel (different files, no dependencies)

**Critical Path**: Task 6 (Storybook) depends on Task 2 (Component) → Task 7 (Export) depends on Task 2 → Task 8 (Verification) depends on Tasks 6+7 → Task 9 (Integration) depends on Task 7

### Design Library Contribution Checklist (Reference)

Per Constitution Principle IX, ensure each component includes:

- [ ] Component file in `/packages/ui/src/components/primitives/` or `/packages/ui/src/components/`
- [ ] TypeScript props interface with proper types (variant, size, state, polymorphic `as`)
- [ ] CVA variants for visual variations (use `class-variance-authority`)
- [ ] Token-driven styling (colors from `--color-*`, spacing from `--space-*`, etc.)
- [ ] Polymorphic `as` prop if semantically flexible
- [ ] Unit tests in `/packages/ui/__tests__/components/`
- [ ] Accessibility tests with axe-core (WCAG AA compliance)
- [ ] Storybook stories in `/packages/ui/src/stories/` (minimum 3 variants)
- [ ] Exported from `/packages/ui/src/index.ts`
- [ ] Verified in Storybook at `http://localhost:6006`
- [ ] Used in at least one app to validate real-world usage
- [ ] Hygiene loop passed (`pnpm lint`, `pnpm format:write`, `pnpm test`)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
