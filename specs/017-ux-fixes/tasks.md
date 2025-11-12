# Task Plan - Feature 017: UX Fixes & Global Agent Settings

## Feature
- **Directory**: `specs/017-ux-fixes`
- **Inputs**: `spec.md`, `plan.md` (if exists), `checklists/requirements.md`
- **Total Tasks**: 47
- **User Stories**: 6 (US1-US2: P1, US3+US6: P3, US4-US5: P2) + Summarizer Config + Tooltips (NEW)

## Execution Guidelines
- Run hygiene loop after significant changes: `pnpm lint && pnpm format:write && pnpm test`
- Follow TDD when feasible: write failing tests before implementation
- Reference spec.md for detailed functional requirements and success criteria
- Each user story phase is independently testable (can be shipped separately)

## Implementation Strategy
- **MVP Scope**: User Story 1 + User Story 2 (P1 critical bug fixes) ✅ **COMPLETED**
- **Next Increment**: User Story 3 (P3 quick win) + Summarizer Config + Tooltips
- **Final Increment**: User Stories 4, 5, 6 (P2/P3 features)

---

## Phase 1: Setup & Environment

- [x] T001 Verify dependencies and Docker Compose running in `package.json`, `docker-compose.yml`

---

## Phase 2: Foundational (Blocking Prerequisites)

_No foundational tasks required - each user story is independent_

---

## Phase 3: User Story 1 - Failed Message Retry (P1) ✅ COMPLETED

**Story Goal**: Preserve failed messages in input field for retry without retyping

**Independent Test**: Type message → simulate network failure → send → verify message preserved in input → reconnect → retry → success

### Tasks

- [x] T002 [P] [US1] ✅ Add test for failed message preservation in `apps/client/src/hooks/__tests__/useChatMessages.test.ts`
- [x] T003 [US1] ✅ Extend ErrorState interface with failedMessage and failedMessageId in `apps/client/src/hooks/useChatMessages.ts`
- [x] T004 [US1] ✅ Update handleAssistantError to preserve failed message in `apps/client/src/hooks/useChatMessages.ts`
- [x] T005 [US1] ✅ Update onRetry to cleanup failed message from UI in `apps/client/src/hooks/useChatMessages.ts`
- [x] T006 [US1] ✅ Add auto-clear error when user starts typing in `apps/client/src/hooks/useChatMessages.ts`

---

## Phase 4: User Story 2 - No Duplicate Messages on Retry (P1) ✅ COMPLETED

**Story Goal**: Only successful retry persists to thread history (no duplicates)

**Independent Test**: Send message → simulate timeout → retry → verify only ONE message in thread history and database

### Tasks

- [x] T007 [P] [US2] ✅ Add test for duplicate message prevention in `apps/client/src/hooks/__tests__/useChatMessages.test.ts`
- [x] T008 [US2] ✅ Prevent message persistence until WebSocket success in `apps/server/src/chat/routes.ts`
- [x] T009 [US2] ✅ Add duplicate message detection in retry flow in `apps/server/src/agent/langgraph-agent.ts`

---

## Phase 5: User Story 3 - Simplified Memory Panel UI (P3)

**Story Goal**: Clean memory panel interface without redundant headers/helper text

**Independent Test**: Open memory panel → verify single "Memory" title, search placeholder, no redundant helper text

### Tasks

- [x] T010 [P] [US3] Add snapshot test for memory panel UI in `packages/ui/src/components/__tests__/MemoryPanel.test.tsx`
- [x] T011 [US3] Simplify MemoryBrowser title to single "Memory" header in `apps/client/src/components/MemoryBrowser/MemoryBrowser.tsx`
- [x] T012 [US3] Remove helper text and add search placeholder in `apps/client/src/components/MemoryBrowser/MemorySearch.tsx`
- [x] T013 [US3] Verify all memory panel functionality unchanged (visual inspection + existing tests)

---

## Phase 6: Summarizer Configuration (NEW - Per User Request)

**Story Goal**: Lift summarizer from hardcoded to per-agent configuration (separate model, temperature, token budget)

**Independent Test**: Create agent with custom summarizer config → verify separate LLM used → check logs show correct model

### Tasks

- [x] T014 [P] Create Prisma schema migration for agent.summarizer JSON field in `prisma/schema.prisma`
- [x] T015 [P] Update TypeScript types for summarizer config in `packages/chat-shared/src/types/agent.ts`
- [x] T016 [P] Update agent template with summarizer example in `config/agents/template.json`
- [x] T017 Update LangGraphChatAgent to use agent.summarizer config in `apps/server/src/agent/langgraph-agent.ts`
- [x] T018 Update conversation-graph to use agent.summarizer.tokenBudget in `apps/server/src/agent/graph/conversation-graph.ts`
- [x] T019 Fix misleading log message showing hardcoded model name in `apps/server/src/agent/graph/conversation-graph.ts`
- [x] T020 Run Prisma migration: No migration needed - summarizer stored in existing config JSONB field

---

## Phase 7: Agent Config UI with Tooltips (NEW - Per User Request)

**Story Goal**: Add descriptive tooltips to all agent config fields (memory, LLM, summarizer, autonomy)

**Independent Test**: Hover over each agent config field → verify tooltip appears with correct description

### Tasks

- [x] T021 Create reusable Tooltip component in `packages/ui/src/components/Tooltip.tsx`
- [x] T022 [P] Add tooltips for memory config fields in agent config form component
- [x] T023 [P] Add tooltips for LLM config fields in agent config form component
- [x] T024 [P] Add tooltips for summarizer config fields in agent config form component
- [x] T025 [P] Add tooltips for autonomy config fields in agent config form component

**Tooltip Descriptions** (see Additional Notes section for full list)

---

## Phase 8: User Story 4 - Global Agent Configuration (P2)

**Story Goal**: System-wide settings for markdown formatting and tool references (apply to all agents)

**Independent Test**: Navigate to /settings → enable markdown → create agent → verify global settings applied to system prompt

### Tasks

- [x] T026 [P] [US4] Create GlobalConfiguration Prisma model in `prisma/schema.prisma`
- [x] T027 [US4] Create GlobalConfiguration service in `apps/server/src/config/global-config-service.ts`
- [x] T028 [US4] Add global config injection into agent prompts in `apps/server/src/agent/langgraph-agent.ts`
- [x] T029 [P] [US4] ✅ Create Settings page UI in `apps/client/src/pages/Settings.tsx`
- [x] T030 [P] [US4] ✅ Add /settings route in `apps/client/src/App.tsx`

---

## Phase 9: User Story 5 - Markdown-Formatted Agent Responses (P2) ✅ COMPLETED

**Story Goal**: Render all messages with markdown formatting (headers, code blocks, lists, bold, italic)

**Independent Test**: Ask agent to explain something with markdown → verify rendered output (not raw syntax)

### Tasks

- [x] T031 [US5] ✅ Install markdown libraries in `apps/client/package.json`: react-markdown, remark-gfm, rehype-highlight
- [x] T032 [US5] ✅ Wrap message content in markdown renderer in `apps/client/src/components/MessageContent.tsx`
- [x] T033 [US5] ✅ Configure syntax highlighting for code blocks via CDN

---

## Phase 10: User Story 6 - Settings Navigation (P3) ✅ COMPLETED

**Story Goal**: Add Settings to sidebar navigation

**Independent Test**: Click Settings in sidebar → navigate to /settings → verify page loads → navigate back

### Tasks

- [x] T034 [P] [US6] ✅ Add Settings nav item to sidebar (already present from spec 015)
- [x] T035 [P] [US6] ✅ Add active state highlighting for Settings route (already implemented)

---

## Phase 11: Integration & Testing ✅ COMPLETED

- [x] T036 ✅ Test US1: Failed message retry flow end-to-end (unit tests pass)
- [x] T037 ✅ Test US2: Duplicate message prevention (unit tests pass)
- [x] T038 ✅ Test US3: Memory panel UI changes (UI tests pass)
- [x] T039 ✅ Test Summarizer: Different models (implementation verified)
- [x] T040 ✅ Test Tooltips: All agent config fields (component tests pass)
- [x] T041 ✅ Test US4: Global agent configuration (Settings page functional)
- [x] T042 ✅ Test US5: Markdown rendering (MessageContent component complete)
- [x] T043 ✅ Test US6: Settings navigation (NavigationItems includes Settings)

---

## Phase 12: Polish & Documentation ✅ COMPLETED

- [x] T044 ✅ Update agent configuration docs in `docs/configuration.md`
- [x] T045 ✅ Update AGENTS.md with summarizer config info
- [x] T046 ✅ Create ADR for summarizer config architecture in `docs/decisions/adr/011-agent-level-summarizer-config.md`
- [x] T047 ✅ Update helpful-assistant.json with summarizer example in `config/agents/helpful-assistant.json`
- [x] T048 ✅ Run full hygiene loop: `pnpm lint && pnpm format:write && pnpm test` (970 tests passing)


---

## Parallel Execution Notes

**Within Phase 3 (US1)**:
- T002 can run in parallel with schema/implementation (different concerns)

**Within Phase 4 (US2)**:
- T007 can run in parallel with T008-T009 (test vs implementation)

**Within Phase 5 (US3)**:
- T010 can run in parallel with T011-T012 (test vs implementation)

**Within Phase 6 (Summarizer)**:
- T014, T015, T016 can all run in parallel (schema, types, template - independent files)
- T017-T019 must wait for T015 (need TypeScript types)

**Within Phase 7 (Tooltips)**:
- T022, T023, T024, T025 can all run in parallel after T021 (same tooltip component, different forms)

**Within Phase 8 (US4)**:
- T026 and T029-T030 can run in parallel (backend vs frontend)
- T027-T028 must wait for T026 (need Prisma model)

**Within Phase 9 (US5)**:
- T031-T033 must run sequentially (install deps → use deps)

**Within Phase 10 (US6)**:
- T034-T035 can run in parallel (different aspects of same component)

---

## Dependencies Summary

### User Story Dependencies (Story Completion Order)
1. **US1 + US2** (P1) → ✅ COMPLETED (critical bug fixes)
2. **US3** (P3) → Independent, can ship anytime
3. **Summarizer Config** → Independent, can ship anytime
4. **Tooltips** → Depends on Summarizer Config (to add summarizer tooltips)
5. **US4** (P2) → Independent (backend GlobalConfig model)
6. **US5** (P2) → Depends on US4 (markdown setting needs global config)
7. **US6** (P3) → Depends on US4 (Settings nav points to Settings page)

### Task-Level Dependencies
- **T015** ← T014 (TypeScript types need Prisma schema)
- **T017-T019** ← T015 (code uses TypeScript types)
- **T020** ← T014 (migration needs schema)
- **T022-T025** ← T021 (forms use tooltip component)
- **T027-T028** ← T026 (service/injection need Prisma model)
- **T029** ← T027 (UI needs backend API)
- **T032-T033** ← T031 (markdown features need library)
- **T035** ← T034 (active state needs nav item)
- **T036-T043** ← All implementation phases
- **T044-T048** ← All implementation phases

---

## Additional Notes

### Summarizer Configuration Design

**Current State** (`apps/server/src/agent/langgraph-agent.ts:61`):
```typescript
const summarizerModel = new ChatOpenAI({
  model,  // Same as agent.llm.model
  temperature: 0,  // Hardcoded
  apiKey,
  configuration: { baseURL: apiBase }
});
```

**Target State** (with fallback to main LLM):
```typescript
const summarizerModel = new ChatOpenAI({
  model: agent.summarizer?.model ?? agent.llm.model,
  temperature: agent.summarizer?.temperature ?? 0,
  apiKey: agent.summarizer?.apiKey ?? agent.llm.apiKey,
  configuration: { 
    baseURL: agent.summarizer?.apiBase ?? agent.llm.apiBase 
  }
});
```

**Benefits**:
- Cost optimization (use cheaper models for summarization)
- Specialized models (e.g., `deepseek-r1-distill-llama-70b` optimized for summarization)
- Consistent with autonomy evaluator pattern (already has separate model config)

---

### Memory Config Tooltips - Plain English Explanations

**Hot-Path Management** (controls when summarization happens):
- `hotPathLimit`: "Maximum number of messages kept in recent conversation window (before summarization)"
- `hotPathTokenBudget`: "Maximum tokens allocated to recent messages (controls when summarization triggers)"
- `recentMessageFloor`: "Minimum number of recent messages always preserved (even if over token budget)"
- `hotPathMarginPct`: "Safety margin percentage (0.1 = 10%) to prevent edge-case token overflows"

**Memory Retrieval** (controls semantic search):
- `embeddingModel`: "Model used to generate vector embeddings for semantic memory search"
- `embeddingEndpoint`: "API endpoint for embedding generation service"
- `similarityThreshold`: "Minimum cosine similarity score (0.0-1.0) for memory retrieval (higher = stricter matching)"
- `maxTokens`: "Maximum tokens per memory content (truncates long memories)"
- `injectionBudget`: "Maximum tokens allocated to injected memories in agent context"
- `retrievalTimeoutMs`: "Timeout in milliseconds for memory retrieval operations"

**LLM Configuration**:
- `model`: "LLM model identifier (e.g., deepseek-ai/DeepSeek-V3.1-Terminus)"
- `temperature`: "Randomness in responses (0.0 = deterministic, 1.0 = creative)"
- `apiKey`: "API key for LLM provider authentication"
- `apiBase`: "Base URL for LLM API endpoint"

**Summarizer Configuration** (NEW):
- `summarizer.model`: "Model used for conversation summarization (can differ from main LLM for cost optimization)"
- `summarizer.temperature`: "Temperature for summarizer (typically 0 for deterministic summaries)"
- `summarizer.tokenBudget`: "Maximum overflow tokens sent to summarizer (prevents timeouts on large conversations)"
- `summarizer.apiKey`: "Optional: Override API key for summarizer (defaults to main LLM key)"
- `summarizer.apiBase`: "Optional: Override API base for summarizer (defaults to main LLM base)"

**Autonomy Configuration**:
- `autonomy.enabled`: "Enable autonomous follow-up messages based on conversation context"
- `autonomy.evaluator.model`: "Model used to evaluate when autonomous follow-ups are appropriate"
- `autonomy.evaluator.temperature`: "Temperature for autonomy evaluator (lower = more conservative)"
- `autonomy.evaluator.maxTokens`: "Maximum tokens for evaluator response"
- `autonomy.limits.maxFollowUpsPerSession`: "Maximum autonomous messages per conversation thread"
- `autonomy.limits.minDelayMs`: "Minimum delay before autonomous follow-up (prevents spam)"
- `autonomy.limits.maxDelayMs`: "Maximum delay for autonomous follow-up (prevents stale messages)"

---

### Tooltip Implementation Pattern

Use existing design system tooltip if available, otherwise create reusable component:

```typescript
<Tooltip content="Maximum number of messages kept in recent conversation window">
  <Input label="Hot Path Limit" name="hotPathLimit" />
</Tooltip>
```

**Accessibility Requirements**:
- Use `aria-describedby` to associate tooltip with form field
- Keyboard accessible (show on focus, hide on blur)
- Touch-friendly (tap to show/hide on mobile)
