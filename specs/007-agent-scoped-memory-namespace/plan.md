# Implementation Plan

## Input
- Feature: `docs/specs/001-agent-scoped-memory-namespace/spec.md`
- Summary: Add agent identifiers to Cerebrobot’s memory namespace so each persona persists and retrieves user memories within isolated Postgres-backed scopes, backed by clarified migration and failure-handling rules.
- Additional Context: None

## Architecture & Stack
- Continue using the approved Node.js/Fastify server with LangGraph orchestration, Prisma-backed Postgres storage, and shared TypeScript utilities (`docs/tech-stack.md`).
- Enforce namespace construction in `@cerebrobot/chat-shared` so all server components (tools, nodes, stores) receive the canonical tuple `['memories', agentId, userId]`.
- Ensure LangGraph agent factory passes agent ids through graph configuration without altering checkpointer wiring.

## Data Model
- Update the logical memory namespace tuple to include three ordered segments: `memories` (type marker), `agentId`, and `userId`.
- No Prisma schema changes expected; confirm existing `String[] namespace` column and unique index remain valid with three elements.
- Document operational guidance that legacy rows without agent ids must be re-imported or cleared prior to rollout.

## Workflow Phases
1. **Phase 0 – Research**
   - Purpose: Catalogue all call sites that construct or depend on namespaces, including tests and logging.
   - Deliverables: Brief notes inline in `plan.md` or commit messages; no separate research file required.
2. **Phase 1 – Core Implementation**
   - Update namespace helper and related validation in `packages/chat-shared`.
   - Propagate agent id through LangGraph agent setup, memory nodes, and tools to use the new helper.
   - Adjust thread/agent wiring to guarantee agent ids are available wherever memory operations occur.
3. **Phase 2 – Validation & Tests**
   - Refresh unit tests for namespace helper, memory nodes/tools, and Prisma store to assert the new tuple order.
   - Add regression coverage for failure cases when `userId` or `agentId` is missing (expect critical abort).
   - Profile or instrument memory retrieval flows to verify no additional database round trips or latency regressions after the namespace change.
4. **Phase 3 – Polish & Documentation**
   - Enhance logging to include the full namespace tuple for observability.
   - Update developer documentation (e.g., README snippets or ops notes) with migration/reset guidance.
   - Capture unresolved open questions (namespace inspection tooling, null `thread.userId` migration path) in docs/decisions or backlog notes for future prioritisation.

## Risks & Mitigations
- **Risk:** Missed namespace construction paths leading to mixed formats.  
  **Mitigation:** Centralise namespace building in shared helper and add assertions in memory entry schemas.
- **Risk:** Legacy memories cause unique index conflicts after upgrade.  
  **Mitigation:** Provide explicit guidance to reset or manually migrate data before deploying.
- **Risk:** Agent id absent in runtime context causing runtime errors.  
  **Mitigation:** Add guard rails that throw with actionable logs and extend tests to cover these scenarios.

## Validation Strategy
- Run the hygiene loop after implementation: `pnpm lint`, `pnpm format:write`, `pnpm test`.
- Expect unit coverage for helper logic, LangGraph nodes/tools, and Prisma store interactions; integration tests should verify end-to-end namespace usage where feasible.

## Deliverables
- Updated namespace helper and types in `packages/chat-shared`.
- Adjusted LangGraph agent wiring (`apps/server/src/agent/...`).
- Revised tests covering namespace formation, storage, and failure handling.
- Documentation updates describing upgrade/reset guidance.

## Open Questions
- Do operators need UI/API tooling to inspect agent-specific memory namespaces, or is CLI/database access sufficient?
- Should we provide a codified procedure for handling `thread.userId = null` during migrations beyond aborting at runtime (e.g., reporter script)?

## Supporting Artefacts
- research.md: not required
- data-model.md: not required
- contracts/: none
- quickstart.md: none
- backlog.md: captures deferred follow-ups for namespace inspection tooling and orphaned-memory handling
