# Implementation Plan: Server-Side Autonomy for Proactive Agent Follow-ups

**Branch**: `009-server-side-autonomy` | **Date**: 2025-10-15 | **Spec**: [spec.md](./spec.md)  
**Prerequisite**: [008-migrate-to-events-effects](../008-migrate-to-events-effects/spec.md) MUST be complete  
**Input**: Feature specification from `/specs/009-server-side-autonomy/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Prerequisite Checklist

**Before starting this spec, verify 008 is complete**:
- [ ] Events & Effects foundation implemented (EventQueue, SessionProcessor, EffectRunner)
- [ ] Prisma tables exist: events, effects
- [ ] User messages flow through user_message events
- [ ] Agent responses delivered via send_message effects
- [ ] Durable outbox delivery working on WebSocket reconnect
- [ ] All 008 tests passing

**If any item unchecked**, complete [008-migrate-to-events-effects](../008-migrate-to-events-effects/spec.md) first.

## Summary

Extend the Events & Effects foundation (spec 008) with timer-driven autonomous messaging and LLM-driven autonomy decisions. Add timer events, TimerWorker for polling, schedule_timer effects, and PolicyGates with fully .env-configurable limits. Introduce a dedicated autonomy evaluator LangGraph node that uses a separate LLM call to decide whether/when to schedule follow-ups based on conversation context and memory. Timers schedule future actions, the Timer Worker promotes due timers to events, and the EffectRunner handles both send_message AND schedule_timer effect types.

## Technical Context

**Language/Version**: TypeScript 5.5+, Node.js ≥20  
**Primary Dependencies**: Fastify 5.6.1, @fastify/websocket 10.0.1 (from 008), @langchain/langgraph 0.4.9, Zod 4.1.11, Pino 9.11.0  
**Storage**: PostgreSQL with Prisma, LangGraph PostgresCheckpointSaver (from 008)  
**Testing**: Vitest, vitest-websocket-mock (from 008)  
**Target Platform**: Node.js server (single-process deployment via Docker Compose)  
**Project Type**: Monorepo (apps/server for backend implementation)  
**Performance Goals**: <1s delivery latency for scheduled messages, <100ms timer cancellation on user message, 250-500ms timer polling interval, support 100 concurrent conversation sessions  
**Constraints**: Extends 008 foundation (EventQueue, SessionProcessor, EffectRunner already exist), single-process architecture, strict event ordering per SESSION_KEY, all autonomy parameters configurable via .env  
**Scale/Scope**: 100 concurrent sessions, unlimited timer durations, configurable hard cap (default 3), configurable cooldown (default 15s)

**Configuration** (.env):
- `AUTONOMY_ENABLED` (boolean, default: false) - Master feature toggle
- `AUTONOMY_MAX_CONSECUTIVE` (integer, default: 3) - Hard cap for consecutive autonomous messages
- `AUTONOMY_COOLDOWN_MS` (integer, default: 15000) - Cooldown between autonomous sends
- `TIMER_POLL_INTERVAL_MS` (integer, default: 250) - Timer worker polling frequency
- `EFFECT_POLL_INTERVAL_MS` (integer, default: 250) - Effect runner polling frequency

**Configuration Implementation**:
- **Definition**: All autonomy vars defined in `apps/server/.env.example` with defaults and documentation
- **Validation**: Loaded and validated via `apps/server/src/config/autonomy.ts` using Zod schema
- **Usage**: Injected into PolicyGates, TimerWorker, EffectRunner constructors as config object
- **Type Safety**: Export `AutonomyConfig` type from autonomy.ts for DI consistency

**Autonomy Decision-Making**:
- **Evaluator Node**: Dedicated LangGraph node runs conditionally after agent responses (only when agent.autonomy.enabled)
- **Separation of Concerns**: Main agent responds to user; evaluator decides whether to schedule follow-ups
- **Evaluator Model**: Configurable per-agent (e.g., meta-llama/Meta-Llama-3.1-8B-Instruct for cost optimization, lower temperature)
- **Structured Output**: Returns AutonomyEvaluationResponse JSON validated against Zod schema (shouldSchedule, delaySeconds, reason, followUpType, suggestedMessage)
- **Memory Context**: Evaluator receives recent N memories + conversation history + autonomy metadata
- **Agent-Level Config**: Per-agent settings in `config/agents/*.json` (enabled flag, evaluator model/prompt/temp, limits, memory context config)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Hygiene-First Development
- ✅ **PASS**: Standard hygiene loop applies (`pnpm lint` → `pnpm format:write` → `pnpm test`)
- ✅ **PASS**: No bypass required for this feature

### II. Transparency & Inspectability
- ✅ **PASS**: Event/effect system provides full audit trail via PostgreSQL tables
- ✅ **PASS**: Structured logging (Pino) for all autonomy decisions (timer firing, policy gates, delivery outcomes)
- ✅ **PASS**: Checkpoint metadata exposes autonomy counters (consecutive_autonomous_msgs, last_autonomous_at, event_seq)

### III. Type Safety & Testability
- ✅ **PASS**: Events and Effects modeled with Zod schemas (runtime + compile-time type safety)
- ✅ **PASS**: SESSION_KEY typed as branded string type
- ✅ **PASS**: Testing strategy:
  - **Unit tests**: Event processing logic, timer scheduling, policy gates, deduplication with deterministic inputs
  - **Postgres validation test**: Extend existing test to validate events, effects, timers tables and indexes
  - **Manual smoke tests**: Real LLM autonomous messaging, real WebSocket delivery, timer firing accuracy

### IV. Incremental & Modular Development
- ✅ **PASS**: Feature decomposed into 5 prioritized user stories (3 P1, 2 P2)
- ✅ **PASS**: Each story independently testable
- ✅ **PASS**: Modules: EventQueue, EffectRunner, TimerWorker, SessionProcessor, PolicyGates (separate concerns)

### V. Stack Discipline
- ✅ **PASS**: Uses approved stack (Fastify, LangGraph, PostgreSQL, Pino, Zod)
- ✅ **PASS**: No new dependencies required beyond approved versions
- ⚠️ **REVIEW**: Requires new database tables (events, effects, timers) via Prisma migration

### VI. Configuration Over Hardcoding
- ✅ **PASS**: AUTONOMY_ENABLED environment toggle
- ✅ **PASS**: Configurable max_consecutive_without_user and cooldown_ms_between_autonomous_msgs
- ✅ **PASS**: Timer Worker polling interval configurable

### VII. Operator-Centric Design
- ✅ **PASS**: Single-process deployment model maintained
- ✅ **PASS**: Docker Compose compatible
- ✅ **PASS**: No multi-tenant complexity
- ✅ **PASS**: Durable outbox ensures message delivery without complex retry logic

**Overall**: ✅ PASS - No constitution violations. Database schema changes are standard for new features and follow Prisma migration workflow.

## Project Structure

### Documentation (this feature)

```
specs/009-server-side-autonomy/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── events.schema.ts
│   ├── effects.schema.ts
│   ├── timers.schema.ts
│   └── autonomy-evaluation.schema.ts
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
apps/server/src/
├── autonomy/                    # New: Autonomy subsystem
│   ├── events/
│   │   ├── EventQueue.ts       # Per-SESSION_KEY event queue with ordering
│   │   ├── EventStore.ts       # PostgreSQL persistence for events table
│   │   └── types.ts            # Event type definitions (user_message, timer, tool_result)
│   ├── effects/
│   │   ├── EffectRunner.ts     # Processes outbox, executes side effects
│   │   ├── OutboxStore.ts      # PostgreSQL persistence for outbox table
│   │   └── types.ts            # Effect type definitions (send_message, schedule_timer)
│   ├── timers/
│   │   ├── TimerWorker.ts      # Polls for due timers, promotes to events
│   │   ├── TimerStore.ts       # PostgreSQL persistence for timers table
│   │   └── types.ts            # Timer data structures
│   ├── session/
│   │   ├── SessionProcessor.ts # Orchestrates event processing per SESSION_KEY
│   │   ├── PolicyGates.ts      # Enforces hard cap and cooldown rules
│   │   └── types.ts            # SESSION_KEY type, autonomy counters
│   └── index.ts                # Autonomy subsystem exports
├── graph/                       # Existing: LangGraph integration
│   ├── nodes/
│   │   └── autonomy-evaluator.ts  # NEW: Dedicated evaluator node
│   ├── index.ts                # Extend with conditional edge to evaluator
│   └── checkpointer.ts         # Extend to persist autonomy metadata
├── routes/
│   └── chat.ts                 # Extend WebSocket route for autonomy messages
└── lib/
    └── websocket.ts            # Extend for outbox-driven delivery

packages/chat-shared/src/
├── schemas/
│   ├── autonomy.schema.ts      # NEW: AutonomyEvaluationResponse schema
│   └── agent.schema.ts         # EXTEND: Add autonomy config section

prisma/
├── schema.prisma               # Add: timers table (events and effects already exist from spec 008)
└── migrations/
    └── YYYYMMDDHHMMSS_add_autonomy_timers/
        └── migration.sql

tests/
└── autonomy/                    # New: Autonomy unit tests
    ├── EventQueue.test.ts
    ├── TimerWorker.test.ts
    ├── PolicyGates.test.ts
    ├── EffectRunner.test.ts
    └── integration/
        └── postgres-autonomy.test.ts  # Extend existing Postgres validation test
```

**Structure Decision**: Extends existing monorepo `apps/server` structure with new `autonomy/` module organized by Events & Effects architecture. Follows established patterns: types in separate files, stores for persistence, workers for background processing. Integration points: graph checkpointer (metadata), chat route (WebSocket delivery), Prisma schema (new tables).

## Complexity Tracking

*No constitution violations requiring justification.*

All architecture decisions align with approved stack and development principles. The Events & Effects pattern follows established best practices for event sourcing and transactional outbox, maintaining KISS while providing the auditability and reliability required by the specification.

---

## Phase 0: Research Completed ✅

All technical unknowns resolved. See [research.md](./research.md) for detailed decisions.

**Key Decisions**:
1. Events & Effects architecture with transactional outbox
2. PostgreSQL schema with JSONB payloads and partial indexes
3. In-process event queue (Map<SESSION_KEY, Queue<Event>>)
4. Timer Worker with 250ms polling
5. Durable outbox for WebSocket delivery
6. Branded SESSION_KEY type with Zod validation
7. PolicyGates for hard cap and cooldown enforcement
8. Checkpoint metadata extension for autonomy state
9. Autonomy evaluator node - dedicated LangGraph node with separate LLM call for meta-decisions (not integrated into main prompt)

---

## Phase 1: Design & Contracts Completed ✅

### Data Model
See [data-model.md](./data-model.md) for complete entity definitions.

**Core Entities** (7 total):
- Event (immutable audit log)
- Effect (transactional outbox)
- Timer (scheduled actions)
- SESSION_KEY (partition key)
- AutonomyEvaluation (evaluator decision output)
- Checkpoint (persistent graph state with metadata)
- Outbox Entry (effect awaiting execution)

### Contracts
See [contracts/](./contracts/) for Zod schemas (4 total):
- `events.schema.ts`: Event types and payloads
- `effects.schema.ts`: Effect types and payloads
- `timers.schema.ts`: Timer data structures
- `autonomy-evaluation.schema.ts`: Evaluator response and context schemas

### Implementation Guide
See [quickstart.md](./quickstart.md) for step-by-step implementation instructions with code examples.

---

## Constitution Check (Post-Design) ✅

### I. Hygiene-First Development
- ✅ **PASS**: No changes from initial check

### II. Transparency & Inspectability
- ✅ **PASS**: Design maintains full audit trail through events table
- ✅ **PASS**: Structured logging integrated in all workers (TimerWorker, EffectRunner)
- ✅ **PASS**: PolicyGates log all blocked autonomous sends

### III. Type Safety & Testability
- ✅ **PASS**: Zod schemas provide runtime validation for all data structures
- ✅ **PASS**: Branded SessionKey type prevents string confusion
- ✅ **PASS**: Testing strategy detailed in quickstart.md:
  - Unit tests for PolicyGates, EventQueue, stores (deterministic)
  - Postgres validation test extended for new tables
  - Manual smoke tests for real LLM autonomous messaging

### IV. Incremental & Modular Development
- ✅ **PASS**: Modules cleanly separated (events/, effects/, timers/, session/)
- ✅ **PASS**: Each store (EventStore, OutboxStore, TimerStore) independently testable
- ✅ **PASS**: Workers (TimerWorker, EffectRunner) decoupled from business logic

### V. Stack Discipline
- ✅ **PASS**: All dependencies from approved stack
- ✅ **PASS**: Prisma migration follows standard workflow
- ✅ **PASS**: No new external dependencies introduced

### VI. Configuration Over Hardcoding
- ✅ **PASS**: Environment variables for all tunables:
  - `AUTONOMY_ENABLED` (feature toggle)
  - `AUTONOMY_MAX_CONSECUTIVE` (hard cap)
  - `AUTONOMY_COOLDOWN_MS` (cooldown period)
  - `TIMER_POLL_INTERVAL_MS` (timer worker frequency)
  - `EFFECT_POLL_INTERVAL_MS` (effect runner frequency)

### VII. Operator-Centric Design
- ✅ **PASS**: Single-process architecture maintained
- ✅ **PASS**: Durable outbox ensures no message loss
- ✅ **PASS**: Clear observability through logs and event audit trail
- ✅ **PASS**: Simple CRUD operations on tables for operator debugging

**Overall**: ✅ PASS - Design fully compliant with constitution. Ready for Phase 2 (task breakdown via `/speckit.tasks`).

---

## Summary

**Planning Status**: Complete  
**Branch**: 009-server-side-autonomy  
**Artifacts Generated**:
- ✅ plan.md (this file)
- ✅ research.md (9 technical decisions documented)
- ✅ data-model.md (7 entities with Prisma schema)
- ✅ contracts/ (4 Zod schema files)
- ✅ quickstart.md (8-step implementation guide with code)
- ✅ Agent context updated (GitHub Copilot)

---

## Phase 2: Task Breakdown Completed ✅

See [tasks.md](./tasks.md) for complete implementation task list.

**Task Organization**: 70 tasks organized by user story to enable independent implementation and testing
- Phase 1: Setup (7 tasks) - Database schema, directory structure, autonomy schemas (T005a, T005b added)
- Phase 2: Foundational (8 tasks) - Stores, EventQueue, PolicyGates (BLOCKS all user stories)
- Phase 3: User Story 1 (17 tasks) - Agent sends scheduled follow-ups (T018a, T021a, T022a added for evaluator)
- Phase 4: User Story 2 (6 tasks) - User message cancels pending follow-ups
- Phase 5: User Story 3 (9 tasks) - Autonomy hard limits prevent message storms
- Phase 6: User Story 4 (7 tasks) - System recovers from failures
- Phase 7: User Story 5 (7 tasks) - Multi-session isolation
- Phase 8: Polish (9 tasks) - Documentation, cleanup, validation

**MVP Scope**: User Stories 1, 2, 3 (all P1) = 38 tasks → 7-10 day timeline for single developer

**Parallel Opportunities**: 
- Setup: All 5 tasks parallel
- Foundational: Stores (T006-T009) parallel, then orchestration (T010-T013)
- User Stories: Can work on US1, US2, US3 in parallel after Foundational complete
- Tests within stories: All marked [P] can run in parallel

**Next Command**: Begin implementation with `T001` (Add Prisma models)

**Notes for Implementation**:
- Database migration will create 1 new table (timers) - events and effects tables already exist from 008
- Autonomy evaluator node is a separate LangGraph node with its own LLM call (not mixed into main agent prompt)
- Evaluator uses structured JSON output validated against AutonomyEvaluationResponseSchema
- Per-agent config in `config/agents/*.json` controls evaluator model, prompt, and limits
- SessionProcessor (orchestration layer) needs implementation (referenced but not detailed in quickstart)
- LangGraph nodes need refactoring to return effects instead of performing I/O
- Conditional edge after agent response routes to evaluator only when agent.autonomy.enabled
- WebSocket reconnection handler should trigger outbox poll for pending effects
- Consider adding telemetry (Prometheus metrics) for queue depths, timer lag, effect processing time, evaluator decision distribution
