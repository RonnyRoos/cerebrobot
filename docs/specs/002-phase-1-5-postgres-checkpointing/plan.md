# Implementation Plan

## Input
- Feature: docs/specs/002-phase-1-5-postgres-checkpointing/spec.md
- Summary: Introduce a Postgres-backed LangGraph checkpoint with Docker Compose orchestration, Prisma migrations, and persistence validation so Phase 1 chats survive restarts.
- Additional Context: None.

## Architecture & Stack
- Backend remains Node.js ≥20 with Fastify 5, LangGraph 0.4.9, LangChain 0.3.34, Pino logging, and Zod validation per guardrails.
- Introduce a Docker Compose stack with services for the backend, Postgres, and a one-shot Prisma migration container; use `.env`-driven configuration and health checks.
- LangGraph will use `AsyncPostgresSaver` when Postgres connection variables are present, falling back to `MemorySaver` otherwise, with structured logs explaining the mode.
- Prisma manages the checkpoint schema (matching LangGraph saver expectations) and provides typed access for operational tooling if needed.

## Data Model
- AsyncPostgresSaver requires tables for checkpoints, writes, and metadata (`checkpoints`, `writes`, `metadata`); Prisma schema must mirror these structures with correct indices and timestamps.
- Environment configuration adds connection settings (`LANGGRAPH_PG_URL`, optional pool settings) and migration history tables maintained by Prisma (`_prisma_migrations`).

## Workflow Phases
1. **Phase 0 – Research**
   - Purpose: Confirm AsyncPostgresSaver schema requirements and Prisma modelling strategy; capture differences between LangGraph auto-provisioning and manually managed migrations.
   - Deliverables: `research.md` summarising schema mappings and references to LangGraph docs.
2. **Phase 1 – Core Implementation**
   - Add/extend `docker-compose.yml` with Postgres (volume, healthcheck), backend, and `migrate` service running `pnpm prisma migrate deploy` gated on Postgres health.
   - Define Prisma schema, generate migrations, wire `.env` defaults, and update server configuration to instantiate `AsyncPostgresSaver` with DI-friendly options plus graceful MemorySaver fallback.
   - Provide helper scripts (`pnpm db:generate`, `pnpm db:migrate`, `pnpm dev:postgres`) and document environment variables.
3. **Phase 2 – Validation & Tests**
   - Implement local-only integration tests or harness (skipped in CI by default) verifying persistence across restarts, including scenarios for mid-session connection loss, plus unit tests covering fallback behaviour and configuration parsing.
   - Add manual smoke test script invoked by `pnpm verify:persistence` that boots services, simulates a chat, restarts the backend, and asserts persisted messages; document CI skip rationale.
4. **Phase 3 – Polish & Documentation**
   - Enhance logging around persistence mode, add operational docs (`quickstart.md`) with manual verification checklist, and update README/setup instructions.
   - Ensure Docker Compose and Prisma commands are referenced in docs and `.env.example` files.

## Risks & Mitigations
- Postgres startup delays break migration ordering → use Compose healthchecks plus retry logic in the migration service.
- Prisma schema drifts from LangGraph expectations → document schema mapping in research notes and add automated assertions on required tables.
- Fallback to MemorySaver hides persistence regressions → emit warning logs and expose a status endpoint or CLI check to verify current mode.
- Skipping Postgres in CI reduces coverage → maintain manual checklist, consider optional Testcontainers job later.

## Validation Strategy
- Run hygiene loop after each major change: `pnpm lint`, `pnpm format:write`, `pnpm test`.
- Add targeted unit tests for config and saver selection; create integration/manual test harness for persistence with Compose.
- Document manual verification steps and require execution before merging changes touching persistence.

## Deliverables
- `docker-compose.yml` (or updates) with backend/postgres/migrate services and volumes.
- Prisma schema (`prisma/schema.prisma`) and generated migration files.
- Backend updates (`apps/server`) configuring AsyncPostgresSaver and environment parsing.
- Test additions (`apps/server` specs) covering persistence mode selection and fallback.
- Manual verification script and instructions (`quickstart.md`, scripts in package.json).
- `research.md` capturing schema mapping decisions.
- Guardrail updates (`docs/tech-stack.md`) documenting Prisma adoption for Postgres checkpointing.

## Open Questions
- Decide whether backend should expose an explicit health/readiness probe that depends on migration completion.
- Confirm naming/location of manual verification script vs. documented checklist.

## Supporting Artefacts
- research.md: Summarise AsyncPostgresSaver schema structure, Prisma modelling notes, and migration workflow references.
- data-model.md: not required (schema captured via Prisma and research notes).
- contracts/: none.
- quickstart.md: Outline manual persistence verification checklist and Compose usage.
