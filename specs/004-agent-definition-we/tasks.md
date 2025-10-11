# Implementation Tasks: Dynamic Agent Configuration

**Feature**: 004-agent-definition-we  
**Branch**: `004-agent-definition-we`  
**Date**: October 10, 2025  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Overview

This document provides an actionable, dependency-ordered task list for implementing dynamic agent configuration. Tasks are organized by user story to enable independent implementation and testing.

**Total Tasks**: 22 (was 23, T007 removed - no startup loading needed)  
**Estimated Effort**: 2-3 days  
**MVP Scope**: User Story 1 (P1) + User Story 3 (P1) = 12 tasks

## Task Organization

Tasks are organized into phases:
- **Phase 1**: Setup (project initialization)
- **Phase 2**: Foundational (blocking prerequisites)
- **Phase 3**: User Story 1 - Agent Configuration Loading (P1) ⭐ MVP
- **Phase 4**: User Story 3 - Secure Configuration Storage (P1) ⭐ MVP
- **Phase 5**: User Story 2 - Multiple Agent Profiles (P2)
- **Phase 6**: Polish & Documentation

Each user story can be independently tested and deployed.

---

## Phase 1: Setup (Project Initialization)

### T001 [P] - Create config directory structure
**Story**: Setup  
**File**: `config/agents/`  
**Description**: Create the git-ignored directory for agent configuration files
```bash
mkdir -p config/agents
touch config/agents/.gitkeep
```
**Acceptance**: Directory exists and tracked in git

---

### T002 [P] - Update .gitignore for agent configs
**Story**: Setup  
**File**: `.gitignore`  
**Description**: Add rules to exclude agent configs while keeping template and .gitkeep
```
config/agents/*
!config/agents/.gitkeep
!config/agents/template.json
```
**Acceptance**: `git status` shows .gitkeep tracked, other files ignored

---

### T003 [P] - Create agent configuration template file
**Story**: Setup  
**File**: `config/agents/template.json`  
**Description**: Create example configuration with all required fields populated with placeholder values
- Include UUID generation instructions in comments
- Provide example values for all LLM and memory fields
- Match schema from data-model.md
**Acceptance**: Template file is valid JSON, tracked in git, contains all required fields

---

## Phase 2: Foundational (Blocking Prerequisites)

### T004 - Define Zod schema for agent configuration
**Story**: Foundational  
**File**: `apps/server/src/config/agent-config.ts`  
**Description**: Create TypeScript Zod schemas for validation
- `LLMConfigSchema`: model, temperature (0-2), apiKey, apiBase (URL)
- `MemoryConfigSchema`: all memory fields with positive/range validation
- `AgentConfigSchema`: id (UUID v4), name, systemPrompt, personaTag, llm, memory
- `AgentMetadataSchema`: id, name (for API responses)
- Export TypeScript types using `z.infer<typeof Schema>`
**Reference**: [data-model.md](./data-model.md) - Zod Schema Definition section  
**Acceptance**: Schemas compile, types exported, validation rules match spec

---

### T005 - Implement config loader with validation
**Story**: Foundational  
**File**: `apps/server/src/config/agent-loader.ts`  
**Description**: Create loader functions for on-demand config loading with fail-fast validation
- `discoverAgentConfigs()`: Scan `./config/agents/`, filter `.json` files (exclude `template.json`), validate ALL configs, throw if ANY invalid (fail-fast), return array of `AgentMetadata` (id, name only)
- `loadAgentConfig(agentId)`: Load specific config by ID, strict validation (throw on invalid), return validated `AgentConfig` object
- Fallback to `.env`-based config if directory missing/empty (for `discoverAgentConfigs`)
- Throw descriptive errors on validation failures (include filename, field, expected vs actual)
**Reference**: [research.md](./research.md) - Configuration File Discovery, Loading Lifecycle  
**Acceptance**: Discovery fails fast if any config invalid; strict loading throws clear errors

---

### T006 - Write unit tests for config loader
**Story**: Foundational  
**File**: `apps/server/src/config/agent-loader.test.ts`  
**Description**: Test validation and loading logic (fail-fast at both points)
- ✅ `discoverAgentConfigs()`: Valid configs returned as metadata
- ✅ `discoverAgentConfigs()`: Invalid config throws error (fail-fast)
- ✅ `discoverAgentConfigs()`: `template.json` excluded from listing
- ✅ `discoverAgentConfigs()`: Fallback to .env when directory missing/empty
- ✅ `loadAgentConfig(id)`: Valid config passes validation
- ✅ `loadAgentConfig(id)`: Missing required field throws with clear message
- ✅ `loadAgentConfig(id)`: Invalid UUID format rejected
- ✅ `loadAgentConfig(id)`: Out-of-range numbers rejected (temperature > 2, negative integers)
- ✅ `loadAgentConfig(id)`: Invalid URL format rejected
- ✅ `loadAgentConfig(id)`: Unknown fields ignored AND not included in TypeScript type (strict mode, forward compatibility)
**Reference**: [data-model.md](./data-model.md) - Testing Strategy section  
**Acceptance**: All tests pass, 100% branch coverage for loader logic

---

### T007 - Remove startup config loading (NOT NEEDED)
**Story**: Foundational  
**Description**: No startup integration needed - configs loaded on-demand
- Config loading happens in GET /api/agents endpoint (T017)
- Config validation happens at thread creation time (T021)
- No app decoration, no startup validation, no caching
**Acceptance**: Server starts without config loading logic

**🛑 CHECKPOINT: Foundational tasks complete - all user stories can now proceed in parallel**

---

## Phase 3: User Story 1 - Agent Configuration Loading (P1) ⭐

**Goal**: Operators can start the server with agent config loaded from JSON files

**Independent Test**: Start server with valid JSON config, verify agent uses configured personality

### T008 [Story: US1] - Refactor agent initialization to accept config object
**File**: `apps/server/src/agent/[agent-init-file].ts`  
**Description**: Modify LangGraph agent setup to accept `AgentConfig` parameter instead of reading from `process.env`
- Replace `process.env.LANGGRAPH_SYSTEM_PROMPT` → `config.systemPrompt`
- Replace `process.env.LANGCHAIN_MODEL` → `config.llm.model`
- Replace `process.env.LANGCHAIN_TEMPERATURE` → `config.llm.temperature`
- Replace `process.env.DEEPINFRA_API_KEY` → `config.llm.apiKey`
- Replace all `LANGMEM_*` → `config.memory.*`
- Replace all `MEMORY_*` → `config.memory.*`
**Reference**: [data-model.md](./data-model.md) - Migration from .env section  
**Acceptance**: Agent initializes with config object, no `process.env` references for agent settings

---

### T009 [Story: US1] [P] - Update existing agent tests for config injection
**File**: `apps/server/src/agent/[agent-test-files].test.ts`  
**Description**: Update test fixtures to pass config objects instead of mocking env vars
- Create test config factory function
- Replace env var mocks with config parameter injection
- Ensure tests still pass with new approach
**Acceptance**: All existing agent tests pass with config-based initialization

---

### T010 [Story: US1] - Wire config selection to agent instance
**File**: Thread/conversation creation endpoint  
**Description**: Load and validate selected config when creating a new thread
- Accept `agentId` parameter in thread creation request
- Call `loadAgentConfig(agentId)` from T005
- If validation fails, return 400 error with detailed message
- Pass validated config to agent initialization function
- Log which agent ID/name is being used for this thread
**Acceptance**: Thread creation uses selected agent config; clear errors if config invalid

---

### T011 [Story: US1] [P] - Create migration helper script (OPTIONAL)
**File**: `scripts/migrate-env-to-json.js`  
**Description**: Node.js script to convert current `.env` values to JSON format (enhancement - not required by spec)
- Read `.env` file
- Parse LANGGRAPH, LANGCHAIN, LANGMEM, DEEPINFRA, MEMORY variables
- Generate UUID v4
- Output valid agent JSON to stdout
- Usage: `node scripts/migrate-env-to-json.js > config/agents/my-agent.json`
**Acceptance**: Script generates valid JSON matching schema

---

### T012 [Story: US1] - Manual test: Start server with JSON config
**Type**: Manual Test  
**Description**: Verify end-to-end agent loading with fail-fast validation
1. Create `config/agents/test-agent.json` with valid values
2. Start server: `pnpm dev`
3. Call GET /api/agents, verify test-agent appears in list (200 response)
4. Create `config/agents/broken-agent.json` with invalid temperature (e.g., 5)
5. Call GET /api/agents, verify 500 error with clear message about broken-agent.json
6. Fix broken-agent.json
7. Call GET /api/agents, verify both agents now appear (200 response)
8. Create new thread with test-agent ID
9. Send test message, verify agent responds with configured personality
10. Check agent uses configured model (inspect API calls if possible)
11. Verify no personality-related process.env references remain in agent code (complete migration)
**Acceptance**: Fail-fast validation at listing; config changes discoverable immediately; clear error messages

**✅ CHECKPOINT: User Story 1 complete - MVP functional for single agent**

---

## Phase 4: User Story 3 - Secure Configuration Storage (P1) ⭐

**Goal**: Agent configs (with secrets) excluded from version control

**Independent Test**: Create config file, verify it's git-ignored and not committable

### T013 [Story: US3] - Verify .gitignore excludes agent configs
**File**: `.gitignore`  
**Description**: Test that the .gitignore rules from T002 work correctly
- Already completed in T002, this is verification
- Create dummy config file: `config/agents/test.json`
- Run `git status`, verify file not shown
- Run `git add config/agents/test.json`, should fail or be ignored
**Acceptance**: Agent config files cannot be accidentally committed

---

### T014 [Story: US3] - Add .env migration warning to quickstart
**File**: [quickstart.md](./quickstart.md)  
**Description**: Ensure quickstart warns operators to remove old .env variables
- Already completed in quickstart.md Step 6
- Verify section exists and is clear
**Acceptance**: Quickstart includes .env cleanup instructions

---

### T015 [Story: US3] - Document security best practices
**File**: [quickstart.md](./quickstart.md)  
**Description**: Add security reminders to quickstart
- Already included in quickstart.md "Security Reminders" section
- Verify completeness (API key rotation, file permissions, unique UUIDs)
**Acceptance**: Security section complete and actionable

---

### T016 [Story: US3] - Manual test: Verify git-ignore enforcement
**Type**: Manual Test  
**Description**: End-to-end verification of secret protection
1. Create `config/agents/secret-test.json` with fake API key
2. Run `git status` - file should NOT appear in untracked files
3. Run `git add config/agents/` - should only add .gitkeep and template.json
4. Run `git commit` - verify secret-test.json not in commit
5. Clean up: `rm config/agents/secret-test.json`
**Acceptance**: No way to accidentally commit agent configs with secrets

**✅ CHECKPOINT: User Story 3 complete - Security requirements met**

---

## Phase 5: User Story 2 - Multiple Agent Profiles (P2)

**Goal**: UI lists available agents, operator selects which to use

**Independent Test**: Create 2 configs, verify UI shows both, selecting one changes agent behavior

### T017 [Story: US2] - Create GET /api/agents endpoint
**File**: `apps/server/src/api/routes/agents.ts`  
**Description**: Fastify route to list available agent configurations (lazy loading with fail-fast validation)
- Route: `GET /api/agents`
- Call `discoverAgentConfigs()` from T005 (scans filesystem, validates ALL configs)
- If ANY config invalid → return 500 with error details `{ error: "...", details: [{ file, error }] }`
- If all valid → return JSON: `{ agents: AgentMetadata[] }` where AgentMetadata = `{ id, name }`
- Handle errors (return 500 if directory unreadable)
**Reference**: [contracts/agents-api.yaml](./contracts/agents-api.yaml)  
**Acceptance**: Endpoint returns list only if ALL configs valid, fails fast with clear errors otherwise, <100ms response time

---

### T018 [Story: US2] [P] - Write integration test for /api/agents
**File**: `apps/server/src/api/routes/agents.test.ts`  
**Description**: Test API endpoint behavior (fail-fast validation)
- Create test fixtures in temp directory
- ✅ Returns 200 with agent list when all configs valid
- ✅ Response matches `AgentMetadata` schema
- ✅ Secrets (apiKey) not included in response
- ✅ Returns 500 with error details when ANY config invalid (fail-fast)
- ✅ Returns empty array when no configs (or fallback to .env)
- ✅ Returns 500 on directory read error
**Acceptance**: Tests pass, endpoint verified

---

### T019 [Story: US2] - Create AgentSelector React component
**File**: `apps/client/src/components/AgentSelector.tsx`  
**Description**: Dropdown component for selecting agents
- Fetch from `/api/agents` on mount
- Display agent names in dropdown
- Call `onSelect(agentId)` callback when selection changes
- Handle loading/error states
- Styled appropriately for UI
**Acceptance**: Component fetches and displays agent list

---

### T020 [Story: US2] - Integrate AgentSelector into chat UI
**File**: `apps/client/src/[chat-page-or-layout].tsx`  
**Description**: Add agent selector to frontend
- Import `AgentSelector`
- Place in header/sidebar
- Store selected agent ID in state
- Pass agent ID to chat API calls (may require API changes)
**Acceptance**: Selector visible in UI, selection persists during session

---

### T021 [Story: US2] - Pass selected agent ID to backend
**File**: `apps/server/src/[thread-creation-route].ts`, `apps/client/src/[chat-service].ts`  
**Description**: Thread selected agent through to thread creation
- Frontend: Include `agentId` in thread creation request payload
- Backend: Accept `agentId` parameter in thread creation endpoint
- Call `loadAgentConfig(agentId)` from T005 (strict validation)
- If config invalid or not found, return 400/404 error with details
- Pass validated config to agent initialization (from T008)
- Fallback to .env-based config if agentId not provided (backward compatibility)
**Acceptance**: Threads use selected agent's configuration; clear errors for invalid/missing configs

---

### T022 [Story: US2] - Manual test: Switch between agents
**Type**: Manual Test  
**Description**: End-to-end multi-agent workflow with fail-fast validation
1. Create 2 agent configs with different personalities:
   - `config/agents/agent-a.json` (e.g., professional tone)
   - `config/agents/agent-b.json` (e.g., casual tone)
2. Start server
3. Call GET /api/agents, verify both agents appear (200 response)
4. Open frontend, verify dropdown shows both agents
5. Select agent A, start new thread, verify professional responses
6. Start new thread with agent B, verify casual responses
7. Add a third config `agent-c.json` with invalid field (e.g., temperature: 5)
8. Call GET /api/agents, verify 500 error with details about agent-c.json
9. Fix agent-c.json, call GET /api/agents, verify all 3 agents appear
10. Test agent C in new thread
**Acceptance**: Fail-fast validation at listing; each agent's personality distinct; new configs discoverable immediately; invalid configs block listing with clear errors

**✅ CHECKPOINT: User Story 2 complete - Multiple agent profiles functional**

---

## Phase 6: Polish & Documentation

### T023 [P] - Update README with JSON config instructions
**File**: `README.md`  
**Description**: Add section on agent configuration
- Link to [quickstart.md](./quickstart.md)
- Brief example of creating an agent config
- Mention .env fallback for backward compatibility
**Acceptance**: README guides new operators to quickstart

---

## Task Summary by User Story

| User Story | Priority | Task Count | Parallelizable | MVP |
|------------|----------|------------|----------------|-----|
| Setup | - | 3 | 3 | ✅ |
| Foundational | - | 3 | 0 | ✅ |
| US1: Agent Config Loading | P1 | 5 | 1 | ✅ |
| US3: Secure Storage | P1 | 4 | 0 | ✅ |
| US2: Multiple Profiles | P2 | 6 | 2 | ❌ |
| Polish | - | 1 | 1 | ❌ |
| **Total** | - | **22** | **7** | **12 MVP** |

---

## Dependency Graph

```
Phase 1 (Setup)
├── T001 (Create directory) ────┐
├── T002 (Update .gitignore) ───┤
└── T003 (Create template) ─────┤
                                │
                                ▼
Phase 2 (Foundational) ◄────────┘
├── T004 (Zod schema) ──────────┐
├── T005 (Config loader) ◄──────┤
├── T006 (Loader tests) ◄───────┤
└── T007 (Server integration)◄──┤
                                │
    ┌───────────────────────────┴───────────────────┐
    │                                               │
    ▼                                               ▼
Phase 3 (US1) - Agent Loading              Phase 4 (US3) - Security
├── T008 (Refactor agent init)             ├── T013 (Verify .gitignore)
├── T009 (Update tests) [P]                ├── T014 (Migration warning)
├── T010 (Wire config)                     ├── T015 (Security docs)
├── T011 (Migration script) [P]            └── T016 (Manual test)
└── T012 (Manual test)                             │
    │                                              │
    └──────────────────┬───────────────────────────┘
                       │
                       ▼
              Phase 5 (US2) - Multiple Agents
              ├── T017 (API endpoint)
              ├── T018 (API tests) [P]
              ├── T019 (UI component) [P]
              ├── T020 (Integrate UI)
              ├── T021 (Wire agent selection)
              └── T022 (Manual test)
                       │
                       ▼
              Phase 6 (Polish)
              └── T023 (Update README) [P]
```

---

## Parallel Execution Opportunities

### Phase 1 (Setup)
All 3 tasks can run in parallel:
- T001, T002, T003 (different files, no dependencies)

### Phase 2 (Foundational)
Must run sequentially (each depends on previous)

### Phase 3 (US1) - After T008 completes
- T009 (Update tests) [P] can run parallel with T010, T011
- T011 (Migration script) [P] is optional, can run anytime

### Phase 4 (US3)
Mostly verification tasks, can run in any order after Phase 2

### Phase 5 (US2) - After T017 completes
- T018 (API tests) [P] + T019 (UI component) [P] can run in parallel
- T020 depends on T019
- T021 depends on T017, T020

### Phase 6 (Polish)
- T023 can run anytime after documentation exists

---

## Implementation Strategy

### MVP Scope (Recommended First Iteration)
**Goal**: Single agent config loading with security

**Tasks**: T001-T016 (12 tasks, ~1-2 days)
- ✅ Setup: Config directory, .gitignore, template
- ✅ Foundational: Schema, loader, tests (no startup integration)
- ✅ US1: Agent loading from JSON on-demand
- ✅ US3: Git-ignore enforcement

**Deliverable**: Operators can create JSON configs, server loads them on-demand, secrets protected, no restart needed for new configs

**Test**: Create `config/agents/my-agent.json`, call GET /api/agents, verify listed, create thread with agent, verify works, add another config, verify appears without restart

---

### Second Iteration (Full Feature)
**Goal**: Add UI for selecting between multiple agents

**Tasks**: T017-T023 (10 tasks, ~1 day)
- ✅ US2: API endpoint (lazy loading), UI component, agent selection

**Deliverable**: Complete multi-agent selection workflow with hot-reload support

**Test**: Create 2 configs, use UI to switch between them, add third config, verify appears without restart

---

## Testing Strategy

### Unit Tests (Vitest)
- T006: Config loader validation logic
- T018: API endpoint responses

### Manual Tests
- T012: End-to-end agent loading
- T016: Git-ignore security verification
- T022: Multi-agent switching

### No Integration Tests Required
Per constitution (3-tier testing strategy), we have:
1. Unit tests for config validation (T006)
2. Postgres validation not needed (no database schema changes)
3. Manual smoke tests (T012, T016, T022)

---

## File Paths Reference

### Backend
- `apps/server/src/config/agent-config.ts` - Zod schemas
- `apps/server/src/config/agent-loader.ts` - Loading logic
- `apps/server/src/config/agent-loader.test.ts` - Unit tests
- `apps/server/src/index.ts` - Server startup integration
- `apps/server/src/agent/[agent-init-file].ts` - Agent initialization
- `apps/server/src/api/routes/agents.ts` - GET /api/agents endpoint
- `apps/server/src/api/routes/agents.test.ts` - API tests

### Frontend
- `apps/client/src/components/AgentSelector.tsx` - Dropdown component
- `apps/client/src/[chat-page-or-layout].tsx` - Integration point

### Configuration
- `config/agents/` - Git-ignored directory
- `config/agents/.gitkeep` - Directory marker (tracked)
- `config/agents/template.json` - Example config (tracked)
- `.gitignore` - Exclusion rules

### Scripts
- `scripts/migrate-env-to-json.js` - Migration helper (optional)

### Documentation
- `README.md` - Project overview
- `specs/004-agent-definition-we/quickstart.md` - Operator guide

---

## Validation Checklist

Before marking the feature complete, verify:

- [x] Each user story can be tested independently
- [x] User Story 1 delivers working MVP (single agent loading)
- [x] User Story 3 prevents secret exposure (git-ignore works)
- [x] User Story 2 enables agent switching via UI
- [x] All unit tests pass (`pnpm test`)
- [x] All manual tests executed and documented
- [x] Hygiene loop passed (`pnpm lint && pnpm format:write && pnpm test`)
- [x] Quickstart documentation accurate and tested
- [x] Template config file has all required fields
- [x] Backward compatibility verified (.env fallback works)
- [x] Constitution principles upheld (type safety, testability, operator-centric)

**✅ ALL ITEMS VERIFIED** - See [VALIDATION_REPORT.md](./VALIDATION_REPORT.md) for detailed evidence (validated October 10, 2025)

---

## Next Steps

1. **Start with MVP**: Execute T001-T016 to get basic functionality working
2. **Test thoroughly**: Run manual tests T012, T016 before proceeding
3. **Iterate**: Add US2 (T017-T022) for full multi-agent support
4. **Polish**: Complete T023 for documentation

**Ready to implement!** All tasks are specific, dependency-ordered, and independently verifiable.
