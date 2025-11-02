# Implementation Plan: Agent Management UI

**Branch**: `011-agent-crud-ui` | **Date**: 2025-10-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-agent-crud-ui/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enable operators to manage agent configurations through a web UI with database-backed CRUD operations, replacing filesystem-based JSON editing. This feature adds a database table for agent configurations (stored as JSON/JSONB), REST API endpoints for CRUD operations with schema validation (Zod), and React-based UI components for viewing, creating, editing, and deleting agents. Agents are identified by auto-generated UUIDs, API keys are displayed in plain text, and deletion cascades to conversations and LangGraph checkpoints. Operators manually recreate existing filesystem agents once via the UI; after migration, database becomes the single source of truth (filesystem config/agents deprecated).

## Technical Context

**Language/Version**: TypeScript 5.5+, Node.js ≥20  
**Primary Dependencies**: Fastify 5.6.1, React 18+, Prisma (latest), Zod 4.1.11  
**Storage**: PostgreSQL with JSON/JSONB support  
**Testing**: Vitest (apps/server, apps/client), vitest-websocket-mock for client tests  
**Target Platform**: Docker Compose deployment (Linux/macOS)  
**Project Type**: Web application (frontend + backend in monorepo)  
**Performance Goals**: <2s agent list load, <500ms validation feedback, <1s save operation  
**Constraints**: Single operator, one browser session, no concurrent edit conflict resolution  
**Scale/Scope**: Small agent count (~10-50 agents), <100KB per agent config, no pagination needed

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Initial Check (Pre-Research) ✅

All principles satisfied. No violations detected.

### Post-Design Check (After Phase 1) ✅

**Hygiene-First Development** ✅
- All code will pass `pnpm lint` → `pnpm format:write` → `pnpm test` before commit
- No hygiene step bypasses planned
- Test strategy defined: Unit tests + Postgres validation test + manual smoke tests

**Transparency & Inspectability** ✅
- Agent CRUD operations expose state through REST API
- Structured logging (Pino) for all mutations
- UI provides clear feedback on save/delete operations
- Cascade delete behavior transparent through transaction logging

**Type Safety & Testability** ✅
- Zod schemas enforce runtime validation, TypeScript provides compile-time safety
- No `any` types planned (except type assertions for JSONB which is unavoidable)
- Testing strategy: Unit tests for API routes + Zod schemas, Postgres validation test updated for Agent table, manual smoke test checklist for UI flows
- Dependency injection via agentService.ts (business logic separate from routes)

**Incremental & Modular Development** ✅
- Feature decomposed into 5 prioritized user stories (P1-P4)
- Each story independently testable (view → create → edit → delete → validate)
- Quickstart provides phase-by-phase implementation guide
- Commits will be small and focused on single responsibilities

**Stack Discipline** ✅
- Uses approved stack: Fastify 5.6.1, Prisma, Zod 4.1.11, React 18+, PostgreSQL
- No new libraries introduced beyond approved dependencies
- Aligns with existing apps/server and apps/client structure
- All versions match tech-stack.md constraints

**Configuration Over Hardcoding** ✅
- Agent configs stored as JSON/JSONB (swappable structure)
- Database connection via Prisma + environment variables (`DATABASE_URL`)
- No hardcoded API endpoints or agent defaults in source
- API base URLs configurable per agent

**Operator-Centric Design** ✅
- Single-operator assumption (no auth, no concurrent edits)
- Plain text API key display (operator trusted)
- Cascade deletes provide clear warnings
- Manual agent recreation (no complex migration)
- Docker Compose deployment maintained

## Project Structure

### Documentation (this feature)

```text
specs/011-agent-crud-ui/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Web application structure (existing monorepo)
apps/
├── server/
│   ├── src/
│   │   ├── routes/
│   │   │   └── agents/           # NEW: Agent CRUD endpoints
│   │   ├── services/
│   │   │   └── agentService.ts   # NEW: Agent business logic
│   │   └── db/
│   │       └── prisma.ts         # EXISTING: Prisma client
│   └── __tests__/
│       └── routes/
│           └── agents.test.ts    # NEW: Agent API tests
│
└── client/
    ├── src/
    │   ├── components/
    │   │   └── AgentManager/     # NEW: Agent CRUD UI components
    │   ├── hooks/
    │   │   └── useAgents.ts      # NEW: Agent data fetching hooks
    │   └── services/
    │       └── agentApi.ts       # NEW: API client for agents
    └── __tests__/
        └── components/
            └── AgentManager.test.tsx  # NEW: UI component tests

prisma/
├── schema.prisma                  # MODIFIED: Add Agent model
└── migrations/
    └── YYYYMMDDHHMMSS_add_agents/ # NEW: Migration for Agent table

packages/
└── chat-shared/
    ├── src/
    │   └── schemas/
    │       └── agent.ts          # EXISTING (modified): Shared agent types/schemas
    └── __tests__/
        └── schemas/
            └── agent.test.ts     # NEW: Schema validation tests
```

**Structure Decision**: Using existing monorepo web application structure. Agent management features integrated into `apps/server` (backend API) and `apps/client` (React frontend). Shared types/schemas in `packages/chat-shared` for consistency across client and server. Prisma migrations manage database schema changes.

## Complexity Tracking

> No constitution violations detected. All principles satisfied within approved stack and existing project structure.
