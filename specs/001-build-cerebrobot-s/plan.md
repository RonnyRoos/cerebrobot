# Implementation Plan: Long-Term Memory Layer with LangGraph Store

**Branch**: `001-build-cerebrobot-s` | **Date**: 2025-10-07 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-build-cerebrobot-s/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a cross-thread long-term memory system using LangGraph's Store abstraction backed by PostgreSQL. The system automatically retrieves user-specific memories (with ≥0.7 similarity score) before each LLM call and stores new memories when the LLM uses the upsertMemory tool. User identification is handled via a lightweight name-based user creation flow with localStorage persistence (no authentication), generating a persistent userId that scopes memory namespaces across all conversation sessions. Two new graph nodes (retrieveMemories and storeMemory) integrate into the existing conversation graph while preserving checkpoint-based short-term memory. Memory entries are flexible JSON objects (max 2048 tokens) stored under user-namespaced keys with semantic search powered by DeepInfra embeddings. The implementation follows the Python LangGraph memory article patterns, adapted for LangGraph JS, with always-on configuration and 90%+ unit test coverage.

## Technical Context

**Language/Version**: TypeScript with Node.js ≥20  
**Primary Dependencies**: @langchain/langgraph 0.4.9, langchain 0.3.34, @langchain/core 0.3.77, fastify 5.6.1, pino 9.11.0, zod 4.1.11, prisma (latest)  
**Storage**: PostgreSQL (existing from Phase 1.5 checkpoint work)  
**Testing**: Vitest (existing test framework)  
**Target Platform**: Docker Compose deployment (Linux server)  
**Project Type**: Monorepo workspace (apps/server for backend, packages/chat-shared for shared types)  
**Performance Goals**: <200ms memory retrieval latency, support 1000+ stored memories per user  
**Constraints**: Memory content max 2048 tokens, 0.7 similarity threshold for retrieval, no automatic expiration  
**Scale/Scope**: Single-operator Phase 1 deployment with multi-user namespace support for future scalability

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Phase 0 Initial Check (Before Research)

#### I. Hygiene-First Development (NON-NEGOTIABLE)
- ✅ **PASS**: Feature includes unit tests (FR-011: 90%+ coverage requirement)
- ✅ **PASS**: No bypasses planned; will follow lint → format → test loop

#### II. Transparency & Inspectability
- ✅ **PASS**: FR-015 requires structured logging (Pino) for all memory operations
- ✅ **PASS**: Memory store operations are observable through Store interface
- ✅ **PASS**: Graph nodes log state transitions per constitution

#### III. Type Safety & Testability
- ✅ **PASS**: TypeScript with strict mode (existing project convention)
- ✅ **PASS**: Memory entities defined with clear interfaces (Memory Entry, Store)
- ✅ **PASS**: Graph nodes will use dependency injection (store parameter)
- ✅ **PASS**: FR-011 mandates unit tests for Store operations and node behavior

#### IV. Incremental & Modular Development
- ✅ **PASS**: User stories prioritized (P1: cross-thread recall, P2: semantic search/LLM updates, P3: multi-user)
- ✅ **PASS**: Each user story independently testable per spec
- ✅ **PASS**: Two new nodes (retrieveMemories, storeMemory) are focused modules

#### V. Stack Discipline
- ✅ **PASS**: Uses approved stack (@langchain/langgraph 0.4.9, Postgres, Pino, Zod)
- ✅ **PASS**: DeepInfra embeddings use OpenAI-compatible interface (swappable per Constitution VI)

#### VI. Configuration Over Hardcoding
- ✅ **PASS**: FR-010 mandates environment variable configuration
- ✅ **PASS**: DeepInfra uses OpenAI-compatible endpoint (swappable)
- ✅ **PASS**: Similarity threshold (0.7), token limits (2048) will be configurable

#### VII. Operator-Centric Design
- ✅ **PASS**: Integrates with existing Docker Compose deployment
- ✅ **PASS**: FR-008 preserves existing checkpoint-based short-term memory
- ✅ **PASS**: FR-009 works alongside existing summarization features

**Phase 0 Result**: ✅ **GATE PASSED** - All principles satisfied. Proceeding to research phase.

---

### Phase 1 Re-Check (After Design Artifacts)

**Artifacts Reviewed**: `research.md`, `data-model.md`, `contracts/memory-store.schema.ts`, `quickstart.md`

#### I. Hygiene-First Development (NON-NEGOTIABLE)
- ✅ **PASS**: `data-model.md` Section 6 defines test coverage strategy (unit + integration)
- ✅ **PASS**: `quickstart.md` documents testing workflow with specific commands
- ✅ **PASS**: No bypasses introduced; hygiene loop preserved

#### II. Transparency & Inspectability
- ✅ **PASS**: `research.md` Decision 7 mandates structured logging config (MEMORY_LOG_LEVEL)
- ✅ **PASS**: `contracts/memory-store.schema.ts` exports observable BaseStore interface
- ✅ **PASS**: `quickstart.md` Section 5 shows memory operations in logs
- ✅ **PASS**: `data-model.md` Section 4 documents state management for operator inspection

#### III. Type Safety & Testability
- ✅ **PASS**: `contracts/memory-store.schema.ts` defines Zod schemas (MemoryEntrySchema, etc.)
- ✅ **PASS**: `data-model.md` Section 2 specifies strict TypeScript interfaces
- ✅ **PASS**: `data-model.md` Section 5 validates all inputs (validateMemoryContent, validateNamespace)
- ✅ **PASS**: BaseStore interface enables dependency injection (store parameter in nodes)

#### IV. Incremental & Modular Development
- ✅ **PASS**: `research.md` Decision 3 separates retrieval (pre-LLM) from storage (post-LLM) nodes
- ✅ **PASS**: `data-model.md` Section 3 defines modular state extensions (MemoryState)
- ✅ **PASS**: Each component testable independently per `quickstart.md` Section 5

#### V. Stack Discipline
- ✅ **PASS**: `research.md` Decision 1 uses LangGraph JS BaseStore (approved @langchain/langgraph 0.4.9)
- ✅ **PASS**: `research.md` Decision 6 uses pgvector extension (existing Postgres setup)
- ✅ **PASS**: `contracts/memory-store.schema.ts` imports Zod (approved stack)
- ✅ **PASS**: No new unapproved dependencies introduced

#### VI. Configuration Over Hardcoding
- ✅ **PASS**: `research.md` Decision 7 defines 5 env vars (MEMORY_ENABLED, etc.)
- ✅ **PASS**: `data-model.md` Section 7 shows MemoryConfigSchema with defaults
- ✅ **PASS**: `quickstart.md` Section 2 documents all configuration options
- ✅ **PASS**: Embedding endpoint swappable via MEMORY_EMBEDDING_ENDPOINT env var

#### VII. Operator-Centric Design
- ✅ **PASS**: `quickstart.md` provides operator-focused setup guide (prerequisites, config, troubleshooting)
- ✅ **PASS**: `research.md` Risk Mitigation addresses operator concerns (embedding downtime, performance)
- ✅ **PASS**: `data-model.md` Section 6 includes manual testing steps for operators
- ✅ **PASS**: Always-on default (MEMORY_ENABLED=true) with toggle for operators

**Phase 1 Result**: ✅ **GATE PASSED** - All design artifacts comply with constitution. Ready for Phase 2 (tasks.md generation via `/speckit.tasks` command).

## Project Structure

### Documentation (this feature)

```
specs/001-build-cerebrobot-s/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── memory-store.schema.ts  # Store interface and types
├── checklists/
│   └── requirements.md  # Specification quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
apps/server/
├── src/
│   ├── agent/
│   │   ├── langgraph-agent.ts          # Existing agent graph (modified)
│   │   ├── checkpointer.ts              # Existing checkpointer
│   │   ├── postgres-checkpoint.ts       # Existing Postgres checkpoint
│   │   └── memory/                      # NEW: Long-term memory module
│   │       ├── index.ts                 # Public exports
│   │       ├── store.ts                 # Store implementation (Postgres-backed)
│   │       ├── nodes.ts                 # retrieveMemories & storeMemory nodes
│   │       ├── tools.ts                 # upsertMemory tool definition
│   │       └── config.ts                # Memory configuration (env vars)
│   ├── user/                            # NEW: User management module
│   │   ├── routes.ts                    # POST /api/users endpoint
│   │   └── __tests__/
│   │       └── user.routes.test.ts      # User creation tests
│   ├── __tests__/
│   │   └── agent/
│   │       └── memory/                  # NEW: Memory tests
│   │           ├── store.test.ts        # Store operations tests
│   │           ├── nodes.test.ts        # Node behavior tests
│   │           └── integration.test.ts  # End-to-end memory tests
│   └── config.ts                        # App config (add memory settings)
├── vitest.config.ts
└── package.json

packages/chat-shared/
└── src/
    └── schemas/
        ├── memory.ts                    # NEW: Shared memory types (Zod schemas)
        └── user.ts                      # NEW: User creation schemas

apps/client/
└── src/
    └── components/
        ├── ChatView.tsx                 # MODIFIED: Add userId localStorage logic
        └── UserSetup.tsx                # NEW: Name input prompt component

prisma/
├── schema.prisma                        # MODIFIED: Add User model
└── migrations/
├── schema.prisma                        # Add memory tables if needed
└── migrations/                          # Memory-related migrations
```

**Structure Decision**: Monorepo web application structure. Memory implementation lives in `apps/server/src/agent/memory/` as a focused module alongside existing agent code. Shared types in `packages/chat-shared` enable type safety across client/server boundary if memory inspection UI is added later.

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
