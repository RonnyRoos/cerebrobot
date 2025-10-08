# Phase 1.5 Postgres Checkpointing

## Overview
Introduce persistent LangGraph checkpointing backed by Postgres so Phase 1 conversations survive process restarts. Establish local Docker Compose plumbing, configuration, and smoke tests without altering the current memory feature set.

## Goals
- Provide a reproducible Postgres instance for local development and CI smoke tests.
- Swap the LangGraph checkpointer to an AsyncPostgresSaver while retaining current agent behaviour.
- Verify conversation state survives server restarts through automated tests or scripts.
- Document setup, configuration, and rollback expectations for operators.

## Non-Goals
- Do not add long-term memory stores or retrieval nodes (reserved for Phase 2).
- Do not expose new HTTP endpoints or UI flows.
- Do not tune performance or indexing beyond defaults unless required for correctness.

## Functional Requirements
- Add a Docker Compose service (or equivalent) that provisions Postgres with default credentials suitable for local use.
- Extend server configuration to read Postgres connection details from environment variables with sane defaults.
- Initialize schema or migrations required by AsyncPostgresSaver on startup.
- Update LangGraph compilation to use AsyncPostgresSaver when Postgres is configured, with a fallback to MemorySaver if unavailable.
- Provide a repeatable manual test script (e.g., npm/pnpm script) that starts the server, conducts a chat, restarts, and confirms prior messages persist.
- Document why CI skips Postgres-backed hot-path validation and outline the manual verification path.
- Compose includes a one-shot migration service that blocks backend start until completion.

## Non-Functional Requirements
- Store credentials and URLs via env vars without hardcoding secrets.
- Ensure fallback to in-memory mode logs warnings but keeps the app usable.
- Migration step must be idempotent for repeated boots.
- CI skips Postgres persistence, so document a manual verification checklist.

## User Stories

- As an operator, I want Cerebrobot to retain recent conversation history after a restart so that I can resume sessions without data loss.
- As a developer, I want a scripted way to stand up Postgres locally so that onboarding stays under an hour.
- As CI maintainers, we want automated checks that prove persistence works so regressions are caught before release.

## Edge Cases
- Postgres unavailable at startup: agent should degrade to MemorySaver and log actionable guidance.
- Connection loss mid-session: ensure retries or error propagation avoid corrupting checkpoint state.
- Schema mismatch between versions: define migration behaviour or fail safely with instructions.
- Persistence regressions caught only locally: plan a fail-fast manual smoke checklist.

## Open Questions

- TBD: Determine if we need a health-check endpoint for Postgres readiness before serving traffic.

## Clarifications
### Session 2025-10-01
- Q: How should CI provide Postgres for persistence tests? → A: Skip Postgres in CI; rely on local verification.
- Q: What tooling should power the migration service? → A: Prisma migrate.
- Q: How should migrations run in the Docker Compose workflow? → A: Dedicated migration service before backend.
- Compose now runs migrations + backend + client (`docker compose up`). Manual verification lives in `docs/specs/002-phase-1-5-postgres-checkpointing/quickstart.md` and optional automated tests run via `LANGGRAPH_PG_TESTS=true pnpm --filter @cerebrobot/server test`.
- Known limitation: the UI always requests a fresh session (one LangGraph thread per page load). Persistence is confirmed via database inspection; session reuse will be tackled in a later phase.

## References
- docs/mission.md
- docs/best-practices.md
- docs/tech-stack.md
