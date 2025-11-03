# Tasks: Professional Design System with Neon Flux Theme

**Input**: Design documents from `/specs/013-neon-flux-design-system/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Tests are **REQUIRED** per spec.md (FR-026: "Design system changes shall include automated accessibility tests via axe-core")

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 0: Branch & Workspace Setup

**Purpose**: Initialize feature branch per project conventions

- [x] T001 Create feature branch `013-neon-flux-design-system` from `main`
- [x] T002 Update `.specify/memory/active-feature.md` with spec 013 reference
- [x] T003 Verify monorepo structure: `packages/ui/` exists, `apps/client/` consumes it

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Core token infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Token System Setup

- [x] T004 Create directory structure: `packages/ui/src/theme/tokens/` (primitives.css, semantic.css, component.css)
- [x] T005 Create directory structure: `packages/ui/src/theme/` (index.ts for TypeScript types, theme-provider.tsx)
- [x] T006 [P] Create primitive color tokens in `packages/ui/src/theme/tokens/primitives.css` (--color-purple-500, --color-blue-500, --color-neutral-50, etc. per data-model.md)
- [x] T007 [P] Create primitive spacing tokens in `packages/ui/src/theme/tokens/primitives.css` (--space-1 to --space-16, 4px base unit)
- [x] T008 [P] Create primitive typography tokens in `packages/ui/src/theme/tokens/primitives.css` (--font-size-xs to --font-size-4xl, --font-weight-*, --line-height-*)
- [x] T009 [P] Create primitive elevation tokens in `packages/ui/src/theme/tokens/primitives.css` (--shadow-sm to --shadow-xl, --shadow-glow-purple/blue/pink/cyan)
- [x] T010 [P] Create primitive radius tokens in `packages/ui/src/theme/tokens/primitives.css` (--radius-sm to --radius-xl, --radius-full)
- [x] T011 [P] Create primitive blur tokens in `packages/ui/src/theme/tokens/primitives.css` (--blur-sm/md/lg for glassmorphism)

### Semantic Tokens

- [x] T012 Create semantic color tokens in `packages/ui/src/theme/tokens/semantic.css` (--color-text-primary, --color-bg-surface, --color-accent-primary, etc.)
- [x] T013 Add theme overrides in `packages/ui/src/theme/tokens/semantic.css` (`.theme-dark`, `.theme-light`, `.theme-high-contrast`)
- [x] T014 [P] Create backward-compatible aliases in `packages/ui/src/theme/tokens/component.css` (--color-message-user-bg → --color-accent-primary per migration-strategy.md)

### TypeScript Types

- [x] T015 [P] Generate TypeScript types for all tokens in `packages/ui/src/theme/types.ts` (ColorToken, SpacingToken, FontSizeToken, etc. per data-model.md)
- [x] T016 [P] Export token constants in `packages/ui/src/theme/tokens.ts` for type-safe usage

### Tailwind Integration

- [x] T017 Update `packages/ui/tailwind.config.ts` to extend theme with token-based colors (bg-accent-primary, text-text-primary)
- [x] T018 Update `packages/ui/tailwind.config.ts` to extend spacing with tokens (1-16 scale)
- [x] T019 Update `packages/ui/tailwind.config.ts` to extend boxShadow with glow tokens (shadow-glow-purple, etc.)
- [x] T020 Update `packages/ui/tailwind.config.ts` to extend borderRadius with tokens (radius-lg, etc.)
- [x] T021 Update `packages/ui/tailwind.config.ts` to extend backdropBlur with tokens (blur-md, etc.)

### Global Styles Migration

- [x] T022 Migrate existing `packages/ui/src/theme/globals.css` to use new token system (replace flat tokens with tiered references)
- [x] T023 Add token imports to `packages/ui/src/index.ts` (export tokens.css, semantic.css for app consumption)

### Theme Provider

- [x] T024 Implement `Theme` component in `packages/ui/src/theme/theme-provider.tsx` (appearance, accentColor, glassmorphism props per theme-api.md)
- [x] T025 Implement `useTheme` hook in `packages/ui/src/theme/use-theme.ts` (toggleAppearance, setAccentColor, state management)
- [x] T026 Add localStorage persistence in `packages/ui/src/theme/use-theme.ts` (key: 'cerebro-theme', schema version 1.0.0)
- [x] T027 Add SSR support in `packages/ui/src/theme/theme-provider.tsx` (inline script to prevent FOUC per theme-api.md)

### Accessibility Infrastructure

- [x] T028 [P] Install axe-core for accessibility testing: `pnpm add -D @axe-core/react axe-core`
- [x] T029 [P] Create contrast ratio validation utility in `packages/ui/src/utils/color.ts` (getContrastRatio function per WCAG formula)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 2: User Story 1 - Basic Token System (Priority: P1) 🎯 MVP

**Goal**: Developers can use color, spacing, and typography tokens in CSS and Tailwind

**Independent Test**: Create a test component using tokens, verify correct CSS custom property resolution

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T030 [P] [US1] Unit test for primitive token resolution in `packages/ui/__tests__/theme/tokens.test.ts` (verify --color-purple-500 resolves to "277 92% 62%")
- [x] T031 [P] [US1] Unit test for semantic token resolution in `packages/ui/__tests__/theme/tokens.test.ts` (verify --color-accent-primary references --color-purple-500)
- [x] T032 [P] [US1] Integration test for Tailwind config in `packages/ui/__tests__/tailwind/tokens.test.ts` (verify bg-accent-primary class exists)
- [x] T033 [P] [US1] Accessibility test for color contrast in `packages/ui/__tests__/a11y/contrast.test.ts` (verify text-primary/bg-surface meets WCAG AA 4.5:1)

### Implementation for User Story 1

- [x] T034 [US1] Verify all primitive tokens (T006-T011) are complete and match data-model.md
- [x] T035 [US1] Verify semantic tokens (T012-T013) correctly reference primitives
- [x] T036 [US1] Verify Tailwind config (T017-T021) generates correct utility classes
- [x] T037 [US1] Test token usage in apps/client: create `apps/client/src/components/TokenDemo.tsx` using tokens
- [x] T038 [US1] Update `apps/client/src/main.tsx` to import token stylesheets

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 3: User Story 2 - Component Primitives (Priority: P1) 🎯 MVP

**Goal**: Developers can compose layouts using Box, Stack, Text, Button primitives

**Independent Test**: Build a card layout using primitives, verify token props work correctly

### Tests for User Story 2 ⚠️

- [x] T039 [P] [US2] Unit test for Box component in `packages/ui/__tests__/components/box.test.tsx` (polymorphic `as` prop, token prop mapping)
- [x] T040 [P] [US2] Unit test for Stack component in `packages/ui/__tests__/components/stack.test.tsx` (direction, spacing, alignment)
- [x] T041 [P] [US2] Unit test for Text component in `packages/ui/__tests__/components/text.test.tsx` (variants, truncation)
- [x] T042 [P] [US2] Unit test for Button component in `packages/ui/__tests__/components/button.test.tsx` (variants, loading state, icons)
- [x] T043 [P] [US2] Accessibility test for Button in `packages/ui/__tests__/a11y/button.test.tsx` (axe-core, keyboard navigation, ARIA labels)

### Implementation for User Story 2

- [x] T044 [P] [US2] Create Box component in `packages/ui/src/components/box.tsx` (polymorphic, token props per component-api.md)
- [x] T045 [P] [US2] Create Stack component in `packages/ui/src/components/stack.tsx` (direction, spacing, justify/align)
- [x] T046 [P] [US2] Create Text component in `packages/ui/src/components/text.tsx` (variants, truncation, semantic HTML)
- [x] T047 [US2] Create Button component in `packages/ui/src/components/button.tsx` (CVA variants, loading state, icons, focus states)
- [x] T048 [US2] Create component index in `packages/ui/src/components/index.ts` (export all primitives)
- [x] T049 [US2] Add components to package exports in `packages/ui/src/index.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 4: User Story 3 - Theme Switching (Priority: P2)

**Goal**: Operators can toggle between dark, light, and high-contrast themes; theme persists across sessions

**Independent Test**: Toggle theme, reload page, verify theme persisted from localStorage

### Tests for User Story 3 ⚠️

- [x] T050 [P] [US3] Unit test for Theme component in `packages/ui/__tests__/theme/theme-provider.test.tsx` (appearance prop, className application)
- [x] T051 [P] [US3] Unit test for useTheme hook in `packages/ui/__tests__/theme/use-theme.test.tsx` (toggleAppearance, setAccentColor, persistence)
- [x] T052 [P] [US3] Integration test for localStorage in `packages/ui/__tests__/theme/persistence.test.ts` (save/load theme, schema migration)
- [x] T053 [US3] Performance test for theme switch in `packages/ui/__tests__/theme/performance.test.ts` (verify < 150ms per success criterion S7)

### Implementation for User Story 3

- [x] T054 [US3] Verify Theme component (T024) correctly applies CSS classes (`.theme-dark`, `.accent-purple`)
- [x] T055 [US3] Verify useTheme hook (T025) state management works (toggleAppearance, setAccentColor)
- [x] T056 [US3] Verify localStorage persistence (T026) saves/loads theme correctly
- [x] T057 [US3] Verify SSR support (T027) prevents FOUC
- [x] T058 [US3] Integrate Theme component in `apps/client/src/main.tsx` (wrap App)
- [x] T059 [US3] Create ThemeToggle component in `apps/client/src/components/ThemeToggle.tsx` (demo useTheme hook)

**Checkpoint**: All P1/P2 user stories should now be independently functional

---

## Phase 5: User Story 4 - Migrate Chat Components (Priority: P2)

**Goal**: Existing MessageBubble, CodeBlock components use new token system (backward-compatible)

**Independent Test**: Chat page renders identically to before migration (visual regression test)

### Tests for User Story 4 ⚠️

- [~] T060 [P] [US4] Visual regression test for MessageBubble (SKIPPED per constitution - manual verification only)
- [~] T061 [P] [US4] Visual regression test for CodeBlock (SKIPPED per constitution - manual verification only)
- [~] T062 [P] [US4] Accessibility test for MessageBubble (SKIPPED - existing a11y tests cover this)

### Implementation for User Story 4

- [x] T063 [P] [US4] Refactor MessageBubble in `packages/ui/src/chat/message-bubble.tsx` (replace hardcoded shadows with --shadow-glow-purple, use Box component)
- [x] T064 [P] [US4] Refactor CodeBlock in `packages/ui/src/chat/code-block.tsx` (use semantic tokens, Box + Text primitives)
- [~] T065 [US4] Capture baseline screenshots for visual regression (SKIPPED per constitution)
- [x] T066 [US4] Verify visual appearance via manual smoke test at /design-library and / (completed via Playwright automation)

**Checkpoint**: Chat components migrated without breaking existing functionality

---

## Phase 6: User Story 5 - Extend Neon Flux to Non-Chat UI (Priority: P3)

**Goal**: Agents and Threads pages use Neon Flux aesthetic (glassmorphism, consistent theming)

**Independent Test**: Agents page matches chat aesthetic (dark, glassmorphism, purple glow)

### Tests for User Story 5 ⚠️

- [ ] T067 [P] [US5] Visual regression test for AgentsPage in `apps/client/__tests__/visual/agents-page.spec.ts` (verify Neon Flux applied)
- [ ] T068 [P] [US5] Visual regression test for ThreadListView in `apps/client/__tests__/visual/threads-page.spec.ts` (verify Neon Flux applied)

### Implementation for User Story 5

- [ ] T069 [P] [US5] Refactor AgentsPage in `apps/client/src/pages/AgentsPage.tsx` (use Box/Stack/Text, add glassmorphism)
- [ ] T070 [P] [US5] Refactor ThreadListView in `apps/client/src/components/ThreadListView.tsx` (use tokens, add Neon Flux styling)
- [ ] T071 [US5] Verify theme switching works on all pages (dark/light consistency)

**Checkpoint**: All pages now have consistent Neon Flux theming

---

## Phase 7: User Story 6 - Component Catalog (Priority: P2) ✅ UPGRADED & IMPLEMENTED

**Goal**: Developers can browse interactive documentation of all tokens and components

**Industry Best Practice**: Following research of Stack Overflow Stacks, Strapi Design System, and others, Storybook is the universal standard for design system documentation. Upgraded from P3 to P2 per operator decision to follow industry standards.

**Independent Test**: Navigate to catalog at `http://localhost:6006`, verify all tokens/components displayed correctly

### Tests for User Story 6 ⚠️

- [x] T072 [P] [US6] Manual validation: Run Storybook, verify all pages load and theme switching works

### Implementation for User Story 6

- [x] T073 [US6] Installed Storybook 10.0.2 with React + Vite integration
- [x] T074 [US6] Setup Storybook in `packages/ui/.storybook/` with ThemeProvider integration
- [x] T075 [P] [US6] Created token reference stories (Tokens.stories.tsx: colors, spacing, typography, elevation)
- [x] T076 [P] [US6] Created component stories (Primitives.stories.tsx: Box, Stack, Text, Button with interactive controls)
- [x] T077 [P] [US6] Created chat component stories (Chat.stories.tsx: MessageBubble, CodeBlock, Avatar, Timestamp, TypingIndicator)
- [x] T078 [US6] Configured Storybook preview with theme CSS imports and ThemeProvider decorator
- [x] T079 [US6] Added Storybook scripts to package.json: `pnpm storybook` runs at `http://localhost:6006`

**Checkpoint**: Storybook documentation complete and accessible - industry standard achieved

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

### Documentation

- [ ] T080 [P] Update `packages/ui/README.md` with installation instructions, token usage examples
- [ ] T081 [P] Create migration guide in `docs/design-system-migration.md` (how to refactor existing components)
- [ ] T082 [P] Update AGENTS.md with design system patterns (token naming convention, composition guidelines)

### Testing

- [ ] T083 [P] Add ESLint rule to detect hardcoded colors/spacing in `packages/ui/.eslintrc.js` (warn on `#a855f7`, `16px` literals)
- [ ] T084 Run full accessibility audit with axe-core on all pages (apps/client)
- [ ] T085 Run performance audit with Lighthouse (verify theme switch < 150ms, CSS bundle < 50KB)

### Code Cleanup

- [ ] T086 Remove deprecated tokens from `packages/ui/src/theme/tokens/component.css` (add @deprecated comments, console warnings per migration-strategy.md)
- [ ] T087 Refactor any remaining hardcoded values in chat components (search for `shadow-[0_0_`, `rounded-2xl`)

### Validation

- [ ] T088 Run quickstart.md validation: follow steps from scratch, verify all examples work
- [ ] T089 Verify all success criteria from spec.md (S1-S7: 50% faster dev, 100% token usage, WCAG AA, <150ms theme switch, 30% CSS reduction)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 0 (Branch Setup)**: No dependencies - can start immediately
- **Phase 1 (Foundational)**: Depends on Phase 0 completion - BLOCKS all user stories
- **Phase 2-7 (User Stories)**: All depend on Phase 1 (Foundational) completion
  - **US1 (Tokens)**: Can start immediately after Phase 1
  - **US2 (Primitives)**: Can start after Phase 1 (parallel with US1 if desired)
  - **US3 (Theme Switch)**: Depends on US1 (needs tokens), can parallel with US2
  - **US4 (Chat Migration)**: Depends on US1 + US2 (needs tokens + primitives)
  - **US5 (Extend Neon Flux)**: Depends on US1 + US2 (needs tokens + primitives)
  - **US6 (Catalog)**: Can start after US1 + US2 (documents tokens + components)
- **Phase 8 (Polish)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (Tokens - P1)**: No dependencies on other stories
- **User Story 2 (Primitives - P1)**: No dependencies on other stories (can parallel with US1)
- **User Story 3 (Theme Switch - P2)**: Depends on US1 (needs tokens to switch)
- **User Story 4 (Chat Migration - P2)**: Depends on US1 + US2 (needs tokens + primitives)
- **User Story 5 (Extend Neon Flux - P3)**: Depends on US1 + US2 (needs tokens + primitives)
- **User Story 6 (Catalog - P3)**: Depends on US1 + US2 (documents tokens + primitives)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- TypeScript types before components
- Token infrastructure before component usage
- Core implementation before visual regression tests
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 1 (Foundational)**:
  - T006-T011 (all primitive token categories) can run in parallel
  - T015-T016 (TypeScript types) can run in parallel
  - T028-T029 (accessibility infrastructure) can run in parallel
- **Phase 2 (US1 Tests)**:
  - T030-T033 (all token tests) can run in parallel
- **Phase 3 (US2 Tests)**:
  - T039-T043 (all component tests) can run in parallel
- **Phase 3 (US2 Implementation)**:
  - T044-T046 (Box, Stack, Text components) can run in parallel
- **Phase 4 (US3 Tests)**:
  - T050-T052 (Theme, useTheme, persistence tests) can run in parallel
- **Phase 5 (US4)**:
  - T063-T064 (MessageBubble, CodeBlock refactors) can run in parallel
  - T060-T062 (visual/a11y tests) can run in parallel
- **Phase 6 (US5)**:
  - T069-T070 (AgentsPage, ThreadListView refactors) can run in parallel
  - T067-T068 (visual tests) can run in parallel
- **Phase 7 (US6)**:
  - T075-T077 (catalog pages) can run in parallel
- **Phase 8 (Polish)**:
  - T080-T082 (documentation) can run in parallel
  - T083-T085 (testing/audits) can run in parallel

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 0: Branch Setup
2. Complete Phase 1: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 2: User Story 1 (Tokens)
4. Complete Phase 3: User Story 2 (Primitives)
5. **STOP and VALIDATE**: Test tokens + primitives independently
6. Deploy/demo if ready (skip catalog, theme switching, migrations for MVP)

### Incremental Delivery

1. Complete Phase 0 + Phase 1 → Foundation ready
2. Add US1 (Tokens) → Test independently → Deploy/Demo
3. Add US2 (Primitives) → Test independently → Deploy/Demo (MVP!)
4. Add US3 (Theme Switch) → Test independently → Deploy/Demo
5. Add US4 (Chat Migration) → Test independently → Deploy/Demo
6. Add US5 (Extend Neon Flux) → Test independently → Deploy/Demo
7. Add US6 (Catalog) → Test independently → Deploy/Demo
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Phase 0 + Phase 1 together
2. Once Foundational is done:
   - Developer A: US1 (Tokens)
   - Developer B: US2 (Primitives)
   - Developer C: US3 (Theme Switch) - starts after US1 tests pass
3. After US1 + US2 complete:
   - Developer A: US4 (Chat Migration)
   - Developer B: US5 (Extend Neon Flux)
   - Developer C: US6 (Catalog)
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD workflow)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Backward Compatibility**: All migrations (US4, US5) must pass visual regression tests with < 0.1% pixel difference
- **Accessibility**: All components must pass axe-core validation (WCAG AA 4.5:1 for text, 3:1 for UI components)
- **Performance**: Theme switching must complete in < 150ms (measured via Playwright performance tests)
