# Task Plan

## Feature
- Directory: docs/specs/002-phase-1-5-postgres-checkpointing
- Inputs: spec.md, plan.md, research.md, quickstart.md

## Execution Guidelines
- Run hygiene loop after significant changes (`pnpm lint`, `pnpm format:write`, `pnpm test`).
- Follow TDD where feasible: author failing tests before implementing behaviour.

## Tasks

1. **Setup & Environment**
   - [X] T001 — Draft Docker Compose updates adding `postgres` service (volume, healthcheck) and stub `migrate` service; update `.env.example` with Postgres defaults. Files: `docker-compose.yml`, `.env.example`.
   - [X] T002 — Scaffold Prisma tooling: ensure `prisma/schema.prisma` exists, add Prisma dependencies/scripts in `package.json`, and sync `pnpm-lock.yaml`. (Note: pnpm install pending until network access is available.)

2. **Tests**
   - [X] T003 [P] — Add unit tests covering Postgres config parsing and checkpoint saver selection (e.g., `apps/server/src/config.test.ts`, `apps/server/src/agent/__tests__/checkpointer.test.ts`).
   - [X] T004 [P] — Add local-only integration test harness (skipped in CI) that exercises persistence across restarts and simulates mid-session connection loss. Files: `apps/server/src/agent/__tests__/langgraph-persistence.test.ts`.

3. **Core Implementation**
   - [X] T005 — Finalise Docker Compose: wire Postgres credentials, expose env file, ensure backend depends on `migrate`, and bake `pg_isready` healthcheck. Files: `docker-compose.yml`.
   - [X] T006 — Model AsyncPostgresSaver schema in Prisma (`prisma/schema.prisma`), generate initial migration files, and check them into `prisma/migrations/`.
   - [X] T007 — Implement migration runner service: add container command for `pnpm prisma migrate deploy`, create wait-for-postgres script if needed, and expose `pnpm db:migrate` / `pnpm db:generate`. Files: `docker-compose.yml`, `package.json`.
   - [X] T008 — Update backend to read Postgres env vars, instantiate `AsyncPostgresSaver`, fall back to `MemorySaver`, and emit mode-specific logs. Files: `apps/server/src/config.ts`, `apps/server/src/agent/langgraph-agent.ts`, related type exports.
   - [X] T009 — Document Prisma workflow (compose migrations + optional `pnpm db:migrate`) in README/quickstart; CI continues to skip Postgres with manual verification noted.

4. **Integration**
   - [X] T010 — Manual verification checklist documented in `quickstart.md`; compose-based workflow covers migration + restart checks.
   - [X] T011 — Research notes updated with verification query, documenting manual evidence.
   - [X] T012 — No additional readiness probe required; compose health check + migrate dependency documented in spec/README.

5. **Polish & Documentation**
   - [X] T013 [P] — Backend logs persistence mode on startup; warnings already emitted when falling back to MemorySaver.
   - [X] T014 [P] — README, tech stack, quickstart, and `.env.example` refreshed with compose workflow and env guidance.
   - [X] T015 [P] — Spec clarifications updated with final decisions, manual verification notes, and known limitations.

## Parallel Execution Notes
- Tasks marked `[P]` (T003, T004, T013, T014, T015) can proceed concurrently once dependencies are satisfied: unit/integration test scaffolds touch separate files, and doc/log polish can run after core implementation stabilises.

## Dependency Summary
- T002 depends on T001 establishing Compose/env conventions.
- T003 must precede T008 (tests before backend implementation).
- T004 must precede T010 to ensure integration harness exists before automation.
- T005 depends on T001 scaffolding; T006 and T007 require Prisma setup from T002.
- T008 relies on migrations/schema (T006) and tests (T003) being in place.
- T010 depends on Compose readiness (T005) and backend persistence implementation (T008).
- T011 requires T010 completion to validate manual run.
- T012 should follow T008 to know final persistence behaviour.
- T013–T015 run after core implementation (T005–T009) to polish artefacts and documentation.
