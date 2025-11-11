# Implementation Plan: Agent Brain Activity Transparency

**Branch**: `017-agent-brain` | **Date**: 2025-11-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/017-agent-brain/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Surface agent decision-making process (tool calls, memory operations, autonomy decisions, context pruning) in real-time via Events & Effects architecture. Implements hybrid storage (Events + Effects tables), parallel query API, and Activity tab UI within AgentBrain component (apps/client/src/components/AgentBrain/, renamed from MemoryBrowser). Brain events tracked: tool_call (upsertMemory), memory_search, context_pruned, schedule_timer. WebSocket streaming for real-time updates. Database migration adds EventSource enum and 'source' column to Event table (USER|AGENT|SYSTEM with composite index). No polling fallback, unlimited retention, immutable audit logs.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js ≥20  
**Primary Dependencies**: Fastify 5.6.1, @langchain/langgraph 0.4.9, Prisma (latest), React, Zod 4.1.11  
**Storage**: PostgreSQL (existing Events/Effects tables + migration for 'source' column)  
**Testing**: Vitest, vitest-websocket-mock (existing test infrastructure)  
**Target Platform**: Docker Compose deployment (Linux server, single-operator)  
**Project Type**: Monorepo (apps/server + apps/client + packages/*)  
**Performance Goals**: <500ms latency (tool call → UI), 90% queries <200ms (50-100 events), 1000 events without degradation  
**Constraints**: Unlimited payload storage, no polling fallback, WebSocket-only real-time, immutable audit logs  
**Scale/Scope**: Thread-scoped brain activity (hundreds of events per thread), agent-scoped access control

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Hygiene-First Development ✅
- **Status**: COMPLIANT
- **Evidence**: Existing CI/CD enforces `pnpm lint → pnpm format:write → pnpm test`
- **Plan Impact**: All brain activity code will follow hygiene loop

### Principle II: Transparency & Inspectability ✅
- **Status**: COMPLIANT (feature ENHANCES transparency)
- **Evidence**: Spec explicitly surfaces agent decision-making (tool calls, memory searches, autonomy, context pruning) via Activity tab
- **Plan Impact**: BrainActivityDecorator transforms events for operator visibility; WebSocket provides real-time inspection

### Principle III: Type Safety & Testability ✅
- **Status**: COMPLIANT
- **Evidence**: 
  - No `any` types planned; BrainActivityEvent uses discriminated unions for eventType
  - Parallel query logic is pure function (EventStore + OutboxStore → BrainActivityEvent[])
  - Graph node modifications inject effects (testable via state inspection)
- **Testing Strategy**: Unit tests (decorator, parallel queries, graph nodes), integration tests (E2E WebSocket flow), performance tests (1000 events)
- **Plan Impact**: BrainActivityDecorator is pure transformation; ActivityList uses dependency injection for WebSocket

### Principle IV: Incremental & Modular Development ✅
- **Status**: COMPLIANT
- **Evidence**: 
  - 4 prioritized user stories (P1-P4), each independently testable
  - 2-week timeline with incremental milestones (Week 1: backend, Week 2: frontend)
  - P1 (tool calls) delivers value without P2-P4
- **Plan Impact**: Implement P1 (tool tracking) → P2 (memory search) → P3 (autonomy) → P4 (context pruning) sequentially

### Principle V: Stack Discipline ✅
- **Status**: COMPLIANT
- **Evidence**: 
  - Uses approved stack: Fastify, LangGraph, Prisma, Zod, Pino, React
  - No new libraries introduced (vitest-websocket-mock already in use)
  - Prisma migration follows existing schema patterns
- **Plan Impact**: Reuses existing infrastructure (WebSocket, SessionProcessor, OutboxStore, EventStore)

### Principle VI: Configuration Over Hardcoding ✅
- **Status**: COMPLIANT
- **Evidence**: 
  - No hardcoded endpoints; brain activity API follows existing `/api/agents/:agentId/...` pattern
  - WebSocket reconnection parameters could be configurable (3 retries, 5s delay) if needed
- **Plan Impact**: Brain activity queries use existing Prisma client (configured via DATABASE_URL)

### Principle VII: Operator-Centric Design ✅
- **Status**: COMPLIANT (feature ENHANCES operator control)
- **Evidence**: 
  - Activity tab provides transparency into agent behavior
  - Empty state guides operators on feature value
  - Immutable audit logs prevent accidental data loss
  - Manual reconnect button gives operators control
- **Plan Impact**: UI prioritizes clarity (informative empty state, connection status indicator, visual event type distinction)

### Principle VIII: MCP Server Utilization ✅
- **Status**: COMPLIANT
- **Evidence**: SequentialThinking used for multi-step planning, Context7 consulted for LangGraph patterns
- **Plan Impact**: Use Serena for code navigation during implementation, Playwright for Activity tab UI testing

### Principle IX: Design Library First ✅
- **Status**: COMPLIANT
- **Evidence**: 
  - Spec requires renaming MemoryBrowser → AgentBrain (existing @workspace/ui component)
  - ActivityList will use Box, Stack, Text primitives from @workspace/ui
  - Visual indicators (color-coded icons) will use Neon Flux design tokens
- **Plan Impact**: Check Storybook before implementing ActivityList; add missing components (e.g., EventCard, ConnectionStatusBadge) to @workspace/ui first

## Project Structure

### Documentation (this feature)

```text
specs/017-agent-brain/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── brain-activity-api.yaml  # OpenAPI schema for GET /api/agents/:agentId/threads/:threadId/activity
├── requirements.md      # Requirements checklist (already created)
└── spec.md             # Feature specification (already created)
```

### Source Code (repository root)

```text
# Monorepo structure (web application: backend + frontend + shared packages)

apps/server/src/
├── agent/
│   ├── graph/
│   │   ├── conversation-graph.ts          # MODIFY: Add InstrumentedToolNode wrapper
│   │   └── nodes/
│   │       ├── retrieve-memories.ts       # MODIFY: Add brain_activity effect
│   │       ├── summarize.ts              # MODIFY: Add brain_activity effect
│   │       └── autonomy-evaluator.ts     # EXISTING: Already emits schedule_timer
│   └── memory/
│       └── tools.ts                       # EXISTING: upsertMemory tool (tracked)
├── events/
│   ├── session/
│   │   └── SessionProcessor.ts           # EXISTING: Persists effects to OutboxStore
│   ├── events/
│   │   └── EventStore.ts                 # EXISTING: Query for source='agent' events
│   └── effects/
│       └── OutboxStore.ts                # EXISTING: Query for brain_activity effects
└── api/
    └── routes/
        └── brain-activity.ts             # NEW: GET /api/agents/:agentId/threads/:threadId/activity

apps/client/src/
├── components/
│   ├── AgentBrain/                       # RENAME FROM: MemoryBrowser/
│   │   ├── AgentBrain.tsx               # MODIFY: Add Activity tab
│   │   ├── MemoryList.tsx               # EXISTING: Memories tab
│   │   └── ActivityList.tsx             # NEW: Activity tab component
│   └── ActivityEventCard/                # NEW (via @workspace/ui contribution)
│       └── ActivityEventCard.tsx         # Display individual brain events
└── hooks/
    └── useBrainActivity.ts               # NEW: WebSocket subscription + query logic

packages/ui/src/
├── components/
│   ├── activity-event-card.tsx           # NEW: Event display component
│   └── connection-status-badge.tsx       # NEW: WebSocket status indicator
└── stories/
    ├── activity-event-card.stories.tsx   # NEW: Storybook examples
    └── connection-status-badge.stories.tsx  # NEW: Storybook examples

packages/chat-shared/src/
└── types/
    └── brain-activity.ts                 # NEW: BrainActivityEvent, BrainActivityPayload types

prisma/
├── schema.prisma                         # MODIFY: Add EventSource enum, Event.source column
└── migrations/
    └── YYYYMMDDHHMMSS_add_event_source/  # NEW: Migration script
        └── migration.sql
```

**Structure Decision**: Monorepo web application structure. Backend (apps/server) handles brain activity capture and API. Frontend (apps/client) renders Activity tab. Shared types in packages/chat-shared. Design library components in packages/ui. Existing Events & Effects infrastructure (EventStore, OutboxStore, SessionProcessor) supports hybrid storage without new architectural layers.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations detected.** All constitution principles are satisfied:
- Reuses existing infrastructure (no new architectural patterns)
- Follows approved stack (TypeScript, Fastify, LangGraph, Prisma, React)
- Maintains type safety and testability
- Enhances operator transparency (core mission goal)
- Uses @workspace/ui design library for UI components

---

## Phase 1 Completion Summary

**Date**: 2025-11-11  
**Status**: ✅ COMPLETE

### Artifacts Generated

1. **data-model.md** (1,200 lines)
   - Core entities: BrainActivityEvent, Event (modified), Effect (existing)
   - Payload schemas: ToolCallPayload, MemorySearchPayload, ContextPrunedPayload, ScheduleTimerPayload
   - Entity lifecycle diagrams (tool call flow, memory search flow)
   - Access control rules (agent-scoped filtering)
   - Performance considerations (parallel query pattern, index usage)
   - Migration checklist (EventSource enum, source column)

2. **contracts/brain-activity-api.yaml** (650 lines)
   - OpenAPI 3.0.3 schema for `GET /api/agents/:agentId/threads/:threadId/activity`
   - Query parameters: type, startDate, endDate, limit, offset
   - Response schemas: BrainActivityResponse, BrainActivityEvent, 4 payload types
   - Error responses: 400, 403, 404, 500 with examples
   - WebSocket event documentation: `brain_activity.created`

3. **quickstart.md** (800 lines)
   - 5-minute local setup (dependencies, database, dev servers)
   - Design Library First workflow (create ActivityEventCard + ConnectionStatusBadge)
   - 10-minute testing guide (memory search, tool call, empty state, reconnection)
   - Development workflow (ToolNode instrumentation, API endpoint, Activity tab)
   - Debugging tips (common issues, fixes, database queries)
   - Quality gates (lint, format, type check, tests, smoke test)

4. **Agent Context Updated**
   - `.github/copilot-instructions.md` updated with:
     - TypeScript 5.x, Node.js ≥20 + Fastify 5.6.1, @langchain/langgraph 0.4.9, Prisma, React, Zod 4.1.11
     - PostgreSQL (Events/Effects tables + migration for 'source' column)

### Next Steps

**Phase 2**: Generate implementation tasks
```bash
# Run speckit.tasks command to create tasks.md
/speckit.tasks
```

Expected output:
- `specs/017-agent-brain/tasks.md` with week-by-week breakdown
- Week 1: Backend foundation (database migration, ToolNode instrumentation, API endpoint)
- Week 2: Frontend implementation (design library components, Activity tab, WebSocket integration)
- Week 3: Testing & polish (Postgres validation tests, UI tests, documentation updates)

**Ready for Development**: All Phase 1 artifacts complete, agent context updated, constitution compliant.
