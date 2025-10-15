# Implementation Plan: Migrate to Events & Effects Architecture

**Branch**: `008-migrate-to-events-effects` | **Date**: 2025-10-15 | **Spec**: [spec.md](./spec.md)

## Summary

Migrate all existing user message handling from direct WebSocket sends to Events & Effects architecture with transactional outbox pattern. This migration preserves all current functionality while establishing the foundation for future autonomy features (spec 009). User-visible behavior remains identical - this is purely an architectural refactoring.

## Technical Context

**Language/Version**: TypeScript 5.5+, Node.js ≥20  
**Primary Dependencies**: Fastify 5.6.1, @fastify/websocket 10.0.1, ws 8.18.0, @langchain/langgraph 0.4.9, langchain 0.3.34, @langchain/core 0.3.77, Zod 4.1.11, Pino 9.11.0  
**Storage**: PostgreSQL with Prisma ORM, PostgresCheckpointSaver (existing)  
**Testing**: Vitest, vitest-websocket-mock for WebSocket testing  
**Target Platform**: Node.js server (single-process deployment via Docker Compose)  
**Project Type**: Monorepo (apps/server for backend implementation)  
**Performance Goals**: First token latency within 10% of current (<2s), zero message loss on reconnection, support 100 concurrent sessions  
**Constraints**: Zero user-visible changes, no WebSocket protocol breaking changes, backward compatible with existing checkpoints, single-process architecture (in-process EventQueue)  
**Scale/Scope**: Migration only (no new features), 4 user stories, 31 functional requirements, 7 success criteria

## Constitution Check

### I. Hygiene-First Development
- ✅ **PASS**: Standard hygiene loop applies (`pnpm lint` → `pnpm format:write` → `pnpm test`)
- ✅ **PASS**: Migration tested before deployment

### II. Transparency & Inspectability
- ✅ **PASS**: Events/effects tables provide full audit trail (NEW capability)
- ✅ **PASS**: Structured logging for all event processing (Pino)
- ✅ **PASS**: Effect status tracking (pending/executing/completed/failed)

### III. Type Safety & Testability
- ✅ **PASS**: Zod schemas for events and effects (runtime validation)
- ✅ **PASS**: Branded SESSION_KEY type prevents string confusion
- ✅ **PASS**: Testing strategy: unit tests (deterministic), Postgres validation test (one test file for infrastructure), manual smoke tests (real LLM)

### IV. Incremental & Modular Development
- ✅ **PASS**: Migration is single focused spec, autonomy deferred to 009
- ✅ **PASS**: Each user story independently testable
- ✅ **PASS**: Modules: EventStore, OutboxStore, EventQueue, SessionProcessor, EffectRunner (clear separation)

### V. Stack Discipline
- ✅ **PASS**: Uses approved stack (no new dependencies)
- ✅ **PASS**: Extends existing Prisma schema (no new tools)

### VI. Configuration Over Hardcoding
- ✅ **PASS**: Event/effect polling intervals configurable
- ⚠️ **REVIEW**: No feature toggles needed (migration is all-or-nothing deployment)

### VII. Operator-Centric Design
- ✅ **PASS**: Single-process deployment maintained
- ✅ **PASS**: Docker Compose compatible
- ✅ **PASS**: Audit trail simplifies debugging
- ✅ **PASS**: Durable delivery reduces operational complexity

**Overall**: ✅ PASS - No constitution violations. Migration improves transparency and reliability without adding complexity.

## Project Structure

### Documentation (this feature)

```
specs/008-migrate-to-events-effects/
├── spec.md                  # This migration specification
├── plan.md                  # This implementation plan
├── research.md              # Core Events & Effects architectural decisions
├── data-model.md            # Event, Effect, SESSION_KEY entities
├── contracts/               # Zod schemas
│   ├── events.schema.ts     # user_message event type
│   └── effects.schema.ts    # send_message effect type
├── quickstart.md            # Step-by-step migration guide
├── tasks.md                 # Migration tasks with acceptance criteria
└── checklists/
    └── requirements.md      # Quality validation checklist
```

### Source Code (repository root)

```
apps/server/src/
├── events/                          # NEW: Events & Effects subsystem
│   ├── events/
│   │   ├── EventQueue.ts            # Per-SESSION_KEY event queue
│   │   ├── EventStore.ts            # PostgreSQL persistence (events table)
│   │   └── types.ts                 # Event type definitions (user_message)
│   ├── effects/
│   │   ├── EffectRunner.ts          # Background worker for effect execution
│   │   ├── OutboxStore.ts           # PostgreSQL persistence (effects table)
│   │   └── types.ts                 # Effect type definitions (send_message)
│   ├── session/
│   │   ├── SessionProcessor.ts      # Orchestrates event → graph → effects
│   │   └── types.ts                 # SESSION_KEY type, processor config
│   └── index.ts                     # Events subsystem exports
├── graph/                           # MODIFY: LangGraph integration
│   └── checkpointer.ts              # Existing checkpointer (no changes needed)
├── routes/
│   └── chat.ts                      # MODIFY: WebSocket route to create events
└── lib/
    └── websocket.ts                 # MODIFY: Trigger outbox poll on reconnect

prisma/
├── schema.prisma                    # MODIFY: Add Event, Effect models
└── migrations/
    └── YYYYMMDDHHMMSS_add_events_effects_tables/
        └── migration.sql            # NEW: Migration for events + effects tables

apps/server/src/__tests__/
└── events/                          # NEW: Migration tests
    ├── EventQueue.test.ts           # Unit tests
    ├── SessionProcessor.test.ts     # Unit tests
    ├── EffectRunner.test.ts         # Unit tests
    └── integration/
        └── postgres-migration.test.ts  # Postgres validation test
```

## Complexity Tracking

*No constitution violations requiring justification.*

This migration simplifies long-term maintenance by establishing a single unified architecture. While the initial migration adds components (EventQueue, SessionProcessor, EffectRunner), it removes complexity by:
- Eliminating direct I/O in routes.ts (moves to EffectRunner)
- Providing audit trail (debugging simplified)
- Enabling durable delivery (failure handling simplified)
- Creating foundation for autonomy (no future architectural refactoring needed)

**Trade-off**: Short-term migration cost for long-term architectural simplicity.

---

## Summary

**Planning Status**: Complete (Constitution check passed - see lines 23-70)  
**Branch**: 008-migrate-to-events-effects  
**Next Steps**: Implementation via tasks.md

**Prerequisite for**: [009-server-side-autonomy](../009-server-side-autonomy/spec.md)

**Notes for Implementation**:
- Database migration creates 2 new tables (events, effects)
- Existing checkpoints remain compatible (no checkpoint migration needed)
- routes.ts refactored to create events instead of calling agent.streamChat() directly
- EffectRunner must preserve token streaming behavior (incremental delivery, not batched)
- Consider feature flag for gradual rollout (though migration is all-or-nothing architecturally)
