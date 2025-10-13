# Task Plan

## Feature
- Directory: docs/specs/001-agent-scoped-memory-namespace
- Inputs: spec.md, plan.md

## Execution Guidelines
- Run hygiene loop after significant changes (`pnpm lint`, `pnpm format:write`, `pnpm test`).
- Follow TDD where feasible: write failing tests before implementing behaviour.

## Tasks

1. **Setup & Environment**
   - [X] T001 — Audit repository for all namespace construction and usage points; note target files for updates (`packages/chat-shared`, `apps/server/src/agent/**/*`, Prisma store/tests).

2. **Tests**
   - [X] T002 [P] — Update/add unit tests for namespace helper and validation in `packages/chat-shared` to assert canonical tuple order and segment validation.
   - [X] T003 [P] — Extend LangGraph memory node/tool tests (`apps/server/src/agent/memory/__tests__`) to expect agent-aware namespaces and abort-on-missing-user behaviour.
   - [X] T004 — Enhance Postgres memory store tests (`apps/server/src/agent/memory/__tests__/store.test.ts`, `postgres-validation.test.ts`) to verify three-part namespaces and logging context.

3. **Core Implementation**
   - [X] T005 — Implement agent-aware namespace helper changes and typings in `packages/chat-shared/src/schemas/memory.ts`, updating exports and consumers.
   - [X] T006 — Propagate agent id through LangGraph agent setup: adjust `apps/server/src/agent/langgraph-agent.ts`, `graph/conversation-graph.ts`, and `memory/tools.ts`/`nodes.ts` to use the new helper and enforce abort logic when user/agent ids missing.
   - [X] T007 — Ensure thread and agent wiring supplies agent ids to memory operations (e.g., `apps/server/src/thread-manager/thread-manager.ts`, chat routes) and add safeguards/logging.

4. **Integration**
   - [X] T008 — Run end-to-end chat or integration tests (e.g., `apps/server/src/chat/__tests__`, manual LangGraph invocation) to confirm namespace propagation and error handling.
   - [X] T009 — Validate memory retrieval latency by diffing query counts/logging before/after or profiling a representative flow to ensure no additional database round trips.

5. **Polish & Documentation**
   - [X] T010 — Review and update logging statements to include full namespace tuples; document reset/migration guidance in relevant docs (README or new operator note).
   - [X] T011 — Capture outstanding open questions (namespace inspection tooling, null `thread.userId` migration path) in docs/decisions or backlog notes for future follow-up.

## Parallel Execution Notes
- T002 and T003 can proceed in parallel: they touch separate test suites (`packages/chat-shared` vs `apps/server/src/agent/memory/__tests__`).
- T002/T003 must complete before T005/T006 to align implementation with updated expectations.

## Dependency Summary
- T005 depends on insights from T001 and failing expectations from T002.
- T006 depends on T005 (new helper signature) and T003 results.
- T007 depends on T006 to ensure wiring matches updated APIs.
- T008 depends on core implementation tasks (T005–T007).
- T009 depends on successful integration runs (T008) and instrumented logging.
- T010 follows successful validation (T008–T009).
- T011 can run after T010 once documentation context is finalized.
