# Implementation Plan: Conversation Thread Management UI

**Branch**: `003-frontend-changes-to` | **Date**: 2025-10-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-frontend-changes-to/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This feature adds conversation thread management to the Cerebrobot frontend, enabling users to view all their conversation threads, resume existing conversations with full context, and start new threads. The implementation extends the existing React/TypeScript frontend and Fastify backend with new thread listing and history APIs, leveraging LangGraph checkpoint persistence in PostgreSQL.

Primary requirements:
- Thread list view as default screen after user setup
- Resume conversations with complete history and context
- Create new threads from thread list
- Simple UI with no loading indicators (KISS principle)

Technical approach:
- Frontend: New ThreadListView component + useThreads hook
- Backend: New /api/threads endpoints querying LangGraph checkpoints
- Data flow: ThreadMetadata derived from LangGraphCheckpoint table

## Technical Context

**Language/Version**: TypeScript 5.5.2, Node.js ≥20.0.0  
**Primary Dependencies**: 
- Frontend: React 18.3.1, Vite 5.3.1
- Backend: Fastify 5.6.1, Prisma 5.17.0, @langchain/langgraph 0.4.9
- Shared: Zod 4.1.11 (schema validation)

**Storage**: PostgreSQL (LangGraph checkpoints in `LangGraphCheckpoint` table)  
**Testing**: Vitest 1.6.0 (unit tests), manual smoke tests for UI  
**Target Platform**: Web (browser + Node.js server)  
**Project Type**: Web application (monorepo with apps/client + apps/server + packages/chat-shared)  
**Performance Goals**: 
- Thread list loads in <2 seconds
- Thread resume with history in <1 second
- Support 100+ threads without degradation

**Constraints**: 
- No loading indicators (KISS - keep it simple)
- No real-time sync (manual refresh only)
- Complete history always loaded (no pagination)
- Empty threads displayed (not hidden or deleted)

**Scale/Scope**: 
- Single-operator hobby deployment
- Designed for dozens to hundreds of conversation threads per user
- Frontend: 3-5 new components + 2-3 hooks
- Backend: 2 new API endpoints + thread service layer

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Initial Check (Pre-Research)

✅ **PASSED** - All principles satisfied

### Final Check (Post-Design)

#### Principle I: Hygiene-First Development ✅
- Quickstart includes hygiene loop in testing steps
- All generated code TypeScript with strict mode
- No bypasses required

#### Principle II: Transparency & Inspectability ✅
- Thread list API exposes all conversation metadata
- Error responses include actionable details
- Structured logging in ThreadService

#### Principle III: Type Safety & Testability ✅
- Zod schemas in `packages/chat-shared/src/schemas/thread.ts`
- No `any` types in design
- Testing strategy defined:
  - **Unit tests**: ThreadService, ThreadListView, hooks
  - **Postgres validation**: GIN index query performance test
  - **Manual smoke tests**: Thread creation, selection, resumption flows

#### Principle IV: Incremental & Modular Development ✅
- Design follows P1-P3 user story priorities
- Components independently testable (ThreadListItem, ThreadListView)
- Services modular (ThreadService separate from routes)

#### Principle V: Stack Discipline ✅
- Uses approved stack only:
  - TypeScript 5.5.2 ✅
  - React 18.3.1 ✅
  - Fastify 5.6.1 ✅
  - Prisma 5.17.0 ✅
  - Zod 4.1.11 ✅
- No new dependencies added

#### Principle VI: Configuration Over Hardcoding ✅
- API endpoints use environment-based URLs
- Database connection via Prisma (env configured)
- No hardcoded service URLs in code

#### Principle VII: Operator-Centric Design ✅
- KISS principle maintained:
  - No loading indicators (keep simple)
  - Manual refresh only
  - Complete history always loaded
- Single-operator focus:
  - No multi-tenant logic
  - No complex auth (userId sufficient)
  - Docker Compose compatible

**Final Gate Status**: ✅ PASS - Design fully compliant with constitution

## Project Structure

### Documentation (this feature)

```
specs/003-frontend-changes-to/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (to be generated)
├── data-model.md        # Phase 1 output (to be generated)
├── quickstart.md        # Phase 1 output (to be generated)
├── contracts/           # Phase 1 output (to be generated)
│   └── threads-api.yaml # OpenAPI spec for thread endpoints
├── checklists/
│   └── requirements.md  # Quality checklist (completed)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
apps/
├── client/              # Frontend application
│   └── src/
│       ├── components/
│       │   ├── ChatView.tsx        # Existing - will be modified
│       │   ├── ThreadListView.tsx  # NEW - main thread list component
│       │   ├── ThreadListItem.tsx  # NEW - individual thread item
│       │   └── UserSetup.tsx       # Existing - unchanged
│       ├── hooks/
│       │   ├── useChatSession.ts   # Existing - will be modified
│       │   ├── useChatMessages.ts  # Existing - may need updates
│       │   ├── useThreads.ts       # NEW - thread list management
│       │   └── useThreadHistory.ts # NEW - load thread history
│       └── App.tsx                 # Existing - routing logic updated
│
└── server/              # Backend application
    └── src/
        ├── thread/                 # NEW - thread management module
        │   ├── routes.ts           # Thread API endpoints
        │   ├── service.ts          # Thread business logic
        │   └── __tests__/          # Unit tests
        ├── chat/
        │   └── routes.ts           # Existing - may need updates
        └── app.ts                  # Existing - register thread routes

packages/
└── chat-shared/         # Shared types and schemas
    └── src/
        └── schemas/
            ├── chat.ts             # Existing
            └── thread.ts           # NEW - thread schemas

tests/
└── integration/
    └── thread-checkpoint-query.test.ts  # NEW - Postgres validation test
```

**Structure Decision**: Web application structure (Option 2 from template) with existing monorepo layout. This feature adds:
- Frontend: New ThreadListView + supporting components/hooks in `apps/client/src`
- Backend: New `thread/` module in `apps/server/src` 
- Shared: New thread schemas in `packages/chat-shared/src/schemas`
- Follows existing patterns: component-based frontend, modular backend services

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

**No violations detected** - all constitution principles satisfied.
