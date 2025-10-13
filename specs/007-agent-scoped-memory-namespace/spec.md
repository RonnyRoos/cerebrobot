# Agent-Scoped Memory Namespace

## Overview
Expand Cerebrobot's long-term memory namespace so each agent stores and retrieves user memories under an agent-aware scope. This prevents cross-agent leakage while preserving the existing Postgres-backed storage and LangGraph tooling. The specification captures code touchpoints, verification needs, and migration considerations for introducing agent identifiers into memory namespaces.

## Goals
- Ensure every memory namespace includes both the agent id and user id so data is agent-isolated.
- Update shared helpers and LangGraph integrations to construct and consume the new namespace shape.
- Provide a clear path to migrate existing memories that currently only track user-scoped namespaces.
- Strengthen automated coverage around namespace construction and memory store queries.

## Non-Goals
- Changing the underlying `memories` table structure beyond namespace content (no new columns).
- Introducing new public APIs for memory management or UI changes.
- Implementing full multi-agent persistence, routing, or sharing strategies beyond namespace isolation.

## Functional Requirements
- Replace the user-only namespace helper with an agent-aware builder that returns `['memories', <agentId>, <userId>]` (agent id precedes user id), validating each segment (`packages/chat-shared/src/schemas/memory.ts:216`).
- Inject the active agent id when wiring memory nodes/tools so search and upsert operations target the new namespace (`apps/server/src/agent/memory/nodes.ts:31`, `apps/server/src/agent/memory/tools.ts:24`).
- Propagate agent ids from `AgentConfig.id` into the memory subsystem when instantiating LangGraph agents, including tool bindings and graph state initialization (`apps/server/src/agent/langgraph-agent.ts:97`, `apps/server/src/agent/langgraph-agent.ts:283`).
- Update Prisma-backed memory store tests and query expectations to assert the agent-aware namespace array for CRUD operations (`apps/server/src/agent/memory/__tests__/store.test.ts:72`, `apps/server/src/agent/memory/__tests__/nodes.test.ts:32`).
- Ensure thread metadata continues supplying agent ids so chat routes and thread management can resolve the correct namespace (`prisma/schema.prisma:74`, `apps/server/src/thread-manager/thread-manager.ts:21`).
- Document upgrade guidance that keeps the system simple: operators either export/reimport manually or reset the Postgres memories state before enabling the new namespace (`prisma/schema.prisma:55`).
- Validate that namespace arrays remain ordered and stable for the unique index `(namespace, key)` and pgvector search queries (`apps/server/src/agent/memory/store.ts:69`).

## Non-Functional Requirements
- Maintain current memory retrieval latency by avoiding additional database round trips; any transformation must remain in-process.
- Preserve observability: logs and metrics should include the expanded namespace tuple for auditing (`apps/server/src/agent/memory/store.ts:108`).
- Guarantee backward-compatible error handling when agent id is missing—log critical events and degrade gracefully without crashing the chat loop (`apps/server/src/agent/memory/tools.ts:63`).
- Keep operational burden low: do not introduce automated migrations; provide clear guidance that development deployments can reset data if that is simpler than manual export/import.

## User Stories
- As an operator, I want each agent to persist memories separately so that experimenting with a new persona does not reuse another agent’s history.
- As an agent developer, I want to know which helper constructs namespaces so I can inject agent ids consistently during tool and node setup.
- As a maintainer, I need migration guidance so production data that lacks agent ids can be upgraded confidently.

## Edge Cases
- Agent id unavailable when the memory tool runs (e.g., misconfigured thread metadata) → namespace builder must fail fast with actionable logging (`apps/server/src/agent/langgraph-agent.ts:289`), defaulting to the canonical ordering `['memories', agentId, userId]` when usable identifiers exist.
- Missing `thread.userId` (anonymous threads) → abort memory read/write operations and emit a critical error so operators fix threading/auth flows rather than silently persisting orphaned data.
- Legacy memories stored without agent ids → instruct operators to reset the memories dataset or perform a manual export/import before enabling the new format; no automated backfill.
- Concurrent namespace writes during migration → ensure idempotent updates and protect the unique `(namespace, key)` constraint when reshaping arrays.
- Legacy environments where data can be reset → document that dropping the memories table is acceptable for development-only deployments before enabling the new namespace.
- Multi-agent, single-user scenarios → namespaces remain fully isolated; agents do not read or write each other’s memories even when the user id matches.
- TBD: Do we need to surface agent-aware namespaces through operator tooling or APIs for inspection?
- TBD: Should the migration include an automatic fallback for memories created by anonymous threads with `thread.userId = null`?

## Clarifications
### Session 2025-10-13
- Q: Choose the canonical order for the memory namespace tuple. → A: A (`['memories', agentId, userId]`)
- Q: Pick the backfill strategy for legacy memories (rows without agentId). → A: C (operators may export/reimport manually or reset the dev database)
- Q: Decide how to handle memory operations when `thread.userId` is missing (e.g. anonymous thread). → A: Abort memory operations and log critical error
- Q: When multiple agents share the same user, what is the canonical behaviour? → A: Treat namespaces as fully isolated (no sharing)

## References
- docs/mission.md
- docs/best-practices.md
- docs/tech-stack.md
