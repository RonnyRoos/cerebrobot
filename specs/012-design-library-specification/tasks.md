# Tasks: Design Library for Cerebrobot

**Input**: Design documents from `/specs/012-design-library-specification/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅  
**Tests**: NOT REQUESTED - No test tasks included (purely UI component library, manual visual verification per spec)

**Organization**: Tasks grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize packages/ui as new monorepo package with ShadCN + Tailwind

- [x] T001 Create `packages/ui/` directory structure per plan.md
- [x] T002 Create `packages/ui/package.json` with exports, dependencies, and peerDependencies
- [x] T003 [P] Create `packages/ui/tsconfig.json` extending `tsconfig.base.json` from monorepo root
- [x] T004 [P] Initialize Tailwind with `pnpm dlx tailwindcss init -p --ts` in `packages/ui/`
- [x] T005 [P] Initialize ShadCN with `pnpm dlx shadcn@latest init` in `packages/ui/` (New York style, CSS variables, components alias @/chat)
- [x] T006 Install dependencies: `pnpm add tailwindcss tailwindcss-animate class-variance-authority clsx tailwind-merge react-markdown remark-gfm react-syntax-highlighter` in `packages/ui/`
- [x] T007 Install dev dependencies: `pnpm add -D @types/react-syntax-highlighter` in `packages/ui/`
- [x] T008 Create `packages/ui/src/utils/cn.ts` with Tailwind merge utility (clsx + twMerge)
- [x] T009 Create `packages/ui/src/index.ts` main export file (initially exports ThemeProvider, useTheme, cn utility)

---

## Phase 2: Foundational (Theme System - Blocking Prerequisites)

**Purpose**: Core theme infrastructure that MUST be complete before ANY component can use colors/typography

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T010 Create `packages/ui/src/theme/globals.css` with Tailwind imports (@tailwind base/components/utilities)
- [x] T011 Define CSS custom properties for light mode in `packages/ui/src/theme/globals.css` (9 chat color tokens from theme-tokens.md)
- [x] T012 Define CSS custom properties for dark mode (.dark class) in `packages/ui/src/theme/globals.css` (9 chat color tokens)
- [x] T013 Configure `packages/ui/tailwind.config.ts` with chat-specific color tokens (message-user, message-agent, code-block, timestamp, link, copy-button)
- [x] T014 Configure typography scale in `packages/ui/tailwind.config.ts` (chat-body 16px/1.6, chat-code 14px/1.5, mono font stack)
- [x] T015 Add tailwindcss-animate and @tailwindcss/typography plugins to `packages/ui/tailwind.config.ts`
- [x] T016 Create `packages/ui/src/utils/theme.tsx` with ThemeProvider component (React Context + localStorage persistence under 'cerebrobot-theme' key)
- [x] T017 Create `packages/ui/src/utils/theme.tsx` useTheme hook (returns theme, setTheme, toggleTheme)
- [x] T018 Update `packages/ui/src/index.ts` to export ThemeProvider, useTheme, Theme type, ThemeContextValue type
- [x] T019 Update `apps/client/src/main.tsx` to wrap app in ThemeProvider and import '@workspace/ui/theme'
- [x] T020 Update `apps/client/tailwind.config.ts` to use `presets: [baseConfig]` from @workspace/ui and scan packages/ui/src for classes

**Checkpoint**: Foundation ready - components can now use theme tokens and typography classes

---

## Phase 3: User Story 1 - Display Chat Messages with Clear Visual Distinction (Priority: P1) 🎯 MVP

**Goal**: User/agent messages visually distinguished by alignment and color with markdown rendering

**Independent Test**: Render MessageBubble with sender="user" → verify right-aligned + user color; render with sender="agent" → verify left-aligned + agent color

### Implementation for User Story 1

- [x] T021 [P] [US1] Create `packages/ui/src/chat/message-bubble.tsx` with messageBubbleVariants (cva with sender variant: user/agent)
- [x] T022 [P] [US1] Create `packages/ui/src/chat/avatar.tsx` with avatarVariants (cva with variant: user/agent, size: sm/md/lg)
- [x] T023 [US1] Implement MessageBubbleProps interface in `packages/ui/src/chat/message-bubble.tsx` (content, sender, timestamp, avatar, className)
- [x] T024 [US1] Implement MessageBubble component with forwardRef in `packages/ui/src/chat/message-bubble.tsx` (uses Markdown from react-markdown + remarkGfm)
- [x] T025 [US1] Add Error Boundary wrapper for markdown renderer in `packages/ui/src/chat/message-bubble.tsx` (per clarification: displays "Message failed to render" + clipboard copy on error)
- [x] T026 [US1] Implement AvatarProps interface in `packages/ui/src/chat/avatar.tsx` (variant, src, initials, size, alt, className)
- [x] T027 [US1] Implement Avatar component with forwardRef in `packages/ui/src/chat/avatar.tsx` (image with initials fallback, handles load errors)
- [x] T028 [US1] Integrate Avatar component into MessageBubble in `packages/ui/src/chat/message-bubble.tsx` (conditionally render if avatar prop provided)
- [x] T029 [US1] Export MessageBubble, MessageBubbleProps, Avatar, AvatarProps from `packages/ui/src/index.ts`
- [x] T030 [US1] Create visual test page in `apps/client/src/App.tsx` demonstrating user/agent message distinction with sample messages

**Checkpoint**: At this point, User Story 1 should be fully functional - messages visually distinguish user from agent

---

## Phase 4: User Story 2 - Read Chat Content with Optimized Typography (Priority: P1)

**Goal**: Chat messages use readable typography (16-18px body, proper headings hierarchy, syntax-highlighted code blocks)

**Independent Test**: Render long agent response with headings, paragraphs, code blocks → verify 16px body text, 1.6 line height, heading hierarchy, syntax highlighting

### Implementation for User Story 2

- [x] T031 [P] [US2] Create `packages/ui/src/chat/code-block.tsx` with CodeBlockProps interface (code, language, showLineNumbers, highlightStyle, onCopy, className)
- [x] T032 [P] [US2] Create `packages/ui/src/utils/markdown.ts` with defaultMarkdownComponents config (code → CodeBlock, links → external new tab with rel="noopener noreferrer")
- [x] T033 [US2] Implement CodeBlock component with forwardRef in `packages/ui/src/chat/code-block.tsx` (uses react-syntax-highlighter with Prism backend, respects theme context)
- [x] T034 [US2] Add syntax highlighting theme selection in `packages/ui/src/chat/code-block.tsx` (vs theme for light, vsDark for dark mode)
- [x] T035 [US2] Integrate defaultMarkdownComponents into MessageBubble in `packages/ui/src/chat/message-bubble.tsx` (pass components prop to Markdown renderer)
- [x] T036 [US2] Add prose classes to MessageBubble in `packages/ui/src/chat/message-bubble.tsx` (prose prose-sm dark:prose-invert for typography)
- [x] T037 [US2] Export CodeBlock, CodeBlockProps from `packages/ui/src/index.ts`
- [x] T038 [US2] Update visual test page in `apps/client/src/App.tsx` with long message containing headings, paragraphs, inline code, code blocks

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - messages have visual distinction AND readable typography

---

## Phase 5: User Story 3 - Use Chat-Specific Color Palette (Priority: P1)

**Goal**: Developers can use semantic color tokens (bg-message-user, bg-message-agent, etc.) with automatic light/dark adaptation

**Independent Test**: Apply bg-message-user token in light mode → verify blue tint; toggle dark mode → verify colors adapt with maintained distinction

### Implementation for User Story 3

- [x] T039 [US3] Verify all 9 chat color tokens defined in `packages/ui/src/theme/globals.css` (message-user-bg, message-user-text, message-agent-bg, message-agent-text, code-block-bg, code-block-border, timestamp, link, link-hover, copy-button, copy-button-success)
- [x] T040 [US3] Verify color contrast meets WCAG AA (4.5:1 minimum) for all text-on-background combinations in light and dark modes using browser devtools or contrast checker
- [x] T041 [US3] Create `packages/ui/src/theme/chat-colors.css` documenting all color tokens with HSL values and usage examples (import into globals.css)
- [x] T042 [US3] Update visual test page in `apps/client/src/App.tsx` with theme toggle button using useTheme hook
- [x] T043 [US3] Verify theme persistence by refreshing page in visual test (should remember light/dark preference from localStorage)

**Checkpoint**: All P1 user stories complete - MVP ready with visual distinction, typography, and theme system

---

## Phase 6: User Story 4 - Show Typing Indicator During Agent Responses (Priority: P2)

**Goal**: Animated typing indicator shows when agent is processing to signal system activity

**Independent Test**: Render TypingIndicator component → verify animated dots or pulse animation running at 60fps

### Implementation for User Story 4

- [x] T044 [P] [US4] Create `packages/ui/src/chat/typing-indicator.tsx` with TypingIndicatorProps interface (variant: 'dots' | 'pulse', ariaLabel, className)
- [x] T045 [P] [US4] Create `packages/ui/src/chat/typing-indicator.tsx` with typingIndicatorVariants (cva with variant: dots/pulse)
- [x] T046 [US4] Implement TypingIndicator component with forwardRef in `packages/ui/src/chat/typing-indicator.tsx` (CSS-only animation, no JavaScript)
- [x] T047 [US4] Add CSS keyframes for 'dots' variant in `packages/ui/src/chat/typing-indicator.tsx` (three bouncing dots animation)
- [x] T048 [US4] Add CSS keyframes for 'pulse' variant in `packages/ui/src/chat/typing-indicator.tsx` (single pulsing circle animation)
- [x] T049 [US4] Export TypingIndicator, TypingIndicatorProps from `packages/ui/src/index.ts`
- [x] T050 [US4] Update visual test page in `apps/client/src/App.tsx` with typing indicator demo (toggle visibility with button)

**Checkpoint**: Typing indicator working independently with smooth animations

---

## Phase 7: User Story 5 - Format Timestamps for Message Context (Priority: P2)

**Goal**: Timestamps display relative time for recent messages ("5m ago") and absolute time for older messages

**Independent Test**: Render Timestamp with recent date → verify relative format; render with old date → verify absolute format; wait 1 minute → verify auto-update

### Implementation for User Story 5

- [x] T051 [P] [US5] Create `packages/ui/src/utils/format-timestamp.ts` with formatTimestamp function (uses native Intl.RelativeTimeFormat and Intl.DateTimeFormat APIs)
- [x] T052 [P] [US5] Create `packages/ui/src/chat/timestamp.tsx` with TimestampProps interface (date, format: 'relative' | 'absolute' | 'auto', updateInterval, className)
- [x] T053 [US5] Implement Timestamp component with forwardRef in `packages/ui/src/chat/timestamp.tsx` (renders <time> element with datetime attribute)
- [x] T054 [US5] Add auto-update logic in `packages/ui/src/chat/timestamp.tsx` using useEffect + setInterval (respects updateInterval prop, defaults 60000ms)
- [x] T055 [US5] Add future timestamp handling in `packages/ui/src/utils/format-timestamp.ts` (returns "just now" + console.warn for clock skew edge case)
- [x] T056 [US5] Integrate Timestamp component into MessageBubble in `packages/ui/src/chat/message-bubble.tsx` (render below message content with timestamp prop)
- [x] T057 [US5] Export Timestamp, TimestampProps, TimestampFormat from `packages/ui/src/index.ts`
- [x] T058 [US5] Update visual test page in `apps/client/src/App.tsx` with messages at different times (recent, yesterday, week ago) to verify formatting

**Checkpoint**: Timestamps working independently with auto-updates and correct formatting

---

## Phase 8: User Story 6 - Toggle Dark Mode for Comfortable Reading (Priority: P2)

**Goal**: Operators can toggle light/dark theme with instant switching and persistence across page refreshes

**Independent Test**: Click theme toggle → verify instant switch (<100ms) without layout shift; refresh page → verify preference persists from localStorage

### Implementation for User Story 6

- [x] T059 [US6] Verify ThemeProvider persistence logic in `packages/ui/src/utils/theme.tsx` (reads/writes 'cerebrobot-theme' to localStorage)
- [x] T060 [US6] Verify theme class application in `packages/ui/src/utils/theme.tsx` (adds/removes 'dark' class on document.documentElement)
- [x] T061 [US6] Verify all components use dark: prefix for dark mode variants (MessageBubble, CodeBlock, Avatar, TypingIndicator in their respective files)
- [x] T062 [US6] Test syntax highlighting theme switching in `packages/ui/src/chat/code-block.tsx` (verify vs/vsDark selection based on theme context)
- [x] T063 [US6] Add smooth transition prevention in `packages/ui/src/theme/globals.css` (disable transitions during theme switch to avoid flash)
- [x] T064 [US6] Update visual test page in `apps/client/src/App.tsx` with prominent theme toggle button and comprehensive dark mode showcase (all components visible)

**Checkpoint**: Dark mode fully functional with instant switching, no flash, and persistence

---

## Phase 9: User Story 7 - Copy Code Blocks with One Click (Priority: P3)

**Goal**: Code blocks show copy button on hover, clicking copies code to clipboard with visual feedback

**Independent Test**: Hover over code block → verify copy button appears; click button → verify clipboard contains code and button shows "Copied!" for 2 seconds

### Implementation for User Story 7

- [ ] T065 [P] [US7] Create `packages/ui/src/chat/copy-button.tsx` with CopyButtonProps interface (text, feedbackDuration, icon, successIcon, onCopy, onError, className)
- [ ] T066 [US7] Implement CopyButton component with forwardRef in `packages/ui/src/chat/copy-button.tsx` (uses navigator.clipboard.writeText with execCommand fallback)
- [ ] T067 [US7] Add state machine for copy states in `packages/ui/src/chat/copy-button.tsx` (idle → copying → copied → idle or error → idle)
- [ ] T068 [US7] Add success feedback timeout in `packages/ui/src/chat/copy-button.tsx` (auto-reset to idle after feedbackDuration, default 2000ms)
- [ ] T069 [US7] Integrate CopyButton into CodeBlock in `packages/ui/src/chat/code-block.tsx` (positioned absolute top-right, appears on hover)
- [ ] T070 [US7] Add hover styles to CodeBlock in `packages/ui/src/chat/code-block.tsx` (group hover pattern to show/hide copy button)
- [ ] T071 [US7] Export CopyButton, CopyButtonProps from `packages/ui/src/index.ts`
- [ ] T072 [US7] Update visual test page in `apps/client/src/App.tsx` with code blocks demonstrating copy functionality

**Checkpoint**: All user stories complete - full design system ready for use

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, validation, and final cleanup

- [ ] T073 [P] Create `packages/ui/README.md` with installation instructions and link to quickstart.md
- [ ] T074 [P] Verify all exports in `packages/ui/src/index.ts` match components implemented (MessageBubble, CodeBlock, Avatar, TypingIndicator, Timestamp, CopyButton, ThemeProvider, useTheme, cn)
- [ ] T075 [P] Add JSDoc comments to all exported component props interfaces in their respective files
- [ ] T076 [P] Verify package.json exports field correctly maps to theme CSS and main index in `packages/ui/package.json`
- [ ] T077 Run through quickstart.md steps manually to validate 10-minute setup works
- [ ] T078 Update `.github/copilot-instructions.md` with final design library tech stack confirmation (already done via update-agent-context.sh)
- [ ] T079 Create manual smoke test checklist in `specs/012-design-library-specification/checklists/visual-verification.md` (user/agent distinction, typography, dark mode, animations, copy button)
- [ ] T080 Run hygiene loop: `pnpm lint` → `pnpm format:write` → verify no errors in packages/ui
- [ ] T081 Commit all changes with message: "feat: Add chat-specific design library (P1-P3 components)"

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) - MVP starts here
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2) + User Story 1 (MessageBubble exists for integration)
- **User Story 3 (Phase 5)**: Depends on Foundational (Phase 2) - Validates theme system already built
- **User Story 4 (Phase 6)**: Depends on Foundational (Phase 2) - Independent component
- **User Story 5 (Phase 7)**: Depends on Foundational (Phase 2) + User Story 1 (integrates into MessageBubble)
- **User Story 6 (Phase 8)**: Depends on Foundational (Phase 2) + all previous stories (validates dark mode across all components)
- **User Story 7 (Phase 9)**: Depends on Foundational (Phase 2) + User Story 2 (integrates into CodeBlock)
- **Polish (Phase 10)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P1)**: Requires US1 MessageBubble component to exist (for markdown components integration)
- **User Story 3 (P1)**: Independent validation of theme system (already built in Foundational) - Can run after Foundational
- **User Story 4 (P2)**: Independent component - Can run after Foundational
- **User Story 5 (P2)**: Requires US1 MessageBubble to exist (for timestamp integration)
- **User Story 6 (P2)**: Should run after US1-US5 to validate dark mode across all components
- **User Story 7 (P3)**: Requires US2 CodeBlock to exist (for copy button integration)

### Within Each User Story

- [P] tasks can run in parallel (different files)
- Component interface definitions before implementations
- Base components (MessageBubble, CodeBlock) before integrations
- Integration tasks after component creation
- Export updates after component completion
- Visual test updates at end of each story

### Parallel Opportunities

**Phase 1 (Setup)**: T003, T004, T005 can run in parallel (different config files)

**Phase 2 (Foundational)**: No parallelization (sequential theme setup)

**Phase 3 (User Story 1)**: T021 and T022 can run in parallel (MessageBubble and Avatar are independent initially)

**Phase 4 (User Story 2)**: T031 and T032 can run in parallel (CodeBlock and markdown config are independent)

**Phase 5 (User Story 3)**: All verification tasks sequential (validate existing work)

**Phase 10 (Polish)**: T073, T074, T075, T076 can run in parallel (different files)

---

## Parallel Example: Setup Phase

```bash
# Can launch together after T002 completes:
T003: "Create packages/ui/tsconfig.json"
T004: "Initialize Tailwind in packages/ui/"
T005: "Initialize ShadCN in packages/ui/"
```

---

## Implementation Strategy

### MVP First (User Stories 1-3 Only - P1)

1. Complete Phase 1: Setup (T001-T009) → Package structure ready
2. Complete Phase 2: Foundational (T010-T020) → Theme system ready
3. Complete Phase 3: User Story 1 (T021-T030) → Message distinction working
4. Complete Phase 4: User Story 2 (T031-T038) → Typography optimized
5. Complete Phase 5: User Story 3 (T039-T043) → Color tokens validated
6. **STOP and VALIDATE**: Test P1 components independently in visual test page
7. Deploy/demo if ready - MVP delivers visual chat interface

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Commit (basic message display)
3. Add User Story 2 → Test independently → Commit (rich typography + code blocks)
4. Add User Story 3 → Test independently → Commit (theme validation)
5. Add User Story 4 → Test independently → Commit (typing indicator)
6. Add User Story 5 → Test independently → Commit (timestamps)
7. Add User Story 6 → Test independently → Commit (dark mode validated)
8. Add User Story 7 → Test independently → Commit (copy functionality)
9. Polish → Final validation → Release

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (sequential, ~1-2 hours)
2. Once Foundational is done:
   - **Developer A**: User Story 1 (MessageBubble + Avatar) - 2-3 hours
   - **Developer B**: User Story 4 (TypingIndicator) - 1 hour (can start immediately)
3. After US1 complete:
   - **Developer A**: User Story 2 (CodeBlock integration) - 2-3 hours
   - **Developer C**: User Story 5 (Timestamp integration) - 2 hours
4. After US2 complete:
   - **Developer A**: User Story 7 (CopyButton integration) - 1-2 hours
5. After all stories:
   - **Developer B**: User Story 3 (Color validation) - 1 hour
   - **Developer C**: User Story 6 (Dark mode validation) - 1 hour
6. Team completes Polish together

**Estimated Total Time**: 8-12 hours for full implementation (P1-P3)

---

## Notes

- No test tasks included per spec (manual visual verification via test page)
- [P] tasks target different files with no dependencies
- [Story] labels (US1-US7) map to spec.md user stories with priorities
- Each user story independently completable via visual test page
- Stop at Phase 5 checkpoint for MVP (P1 complete)
- Phases 6-9 are enhancements (P2-P3)
- Commit after each phase completion
- Run hygiene loop before final commit (lint → format → verify)
- Markdown rendering security handled by react-markdown defaults (per clarification)
- Error boundaries prevent markdown crashes (per clarification)
