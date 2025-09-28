# Task Plan

## Feature
- Directory: docs/specs/001-initial-chat-api-ui
- Inputs: spec.md, plan.md

## Execution Guidelines
- Run hygiene loop after significant changes (`pnpm lint`, `pnpm format:write`, `pnpm test`).
- Follow TDD where practical: author or update failing tests before implementing behaviour.

## Tasks

1. **Setup & Environment**
   - [X] T001 — Establish pnpm workspace scaffolding (root `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.npmrc` targeting Node 20) and install baseline dependencies.
   - [X] T002 — Scaffold `apps/server`, `apps/client`, and `packages/chat-shared` with TypeScript configs, shared lint/format tooling, and seed `.env.example` with agent configuration variables (system prompt, persona tag, model name, temperature, LangMem limits).

2. **Tests**
   - [X] T003 — Create failing unit tests for chat request/response Zod schemas in `packages/chat-shared/__tests__/chat-schema.test.ts`.
   - [X] T004 [P] — Add failing tests covering session issuance/renewal logic, long-lived IDs, and memory reset on new session under `apps/server/src/session/__tests__/session.routes.test.ts`.
   - [X] T005 — Draft failing integration test validating `POST /api/chat` SSE streaming/fallback behaviour, configuration sourced from env, and absence of LangMem summaries in responses (`apps/server/src/chat/__tests__/chat-route.integration.test.ts`).
   - [X] T006 [P] — Add failing React component tests for streaming updates, error surfaces, “New Session” control, and prevention of client-side config overrides in `apps/client/src/components/__tests__/ChatView.test.tsx`.

3. **Core Implementation**
   - [X] T007 — Implement shared Zod schemas/types for chat payloads, SSE events, and correlation metadata in `packages/chat-shared`, exporting helpers consumed by server and client.
   - [X] T008 — Build LangGraph agent factory using environment configuration, LangMem hotpath memory, and summarization policy (summaries kept internal) in `apps/server/src/agent`.
   - [X] T009 — Implement session issuance endpoint/middleware issuing long-lived IDs, persisting client tokens, and resetting in-memory LangMem stores in `apps/server/src/session`.
   - [X] T010 — Implement validated `POST /api/chat` route invoking the agent factory, streaming via SSE with buffered fallback, enforcing env-derived configuration, and suppressing summary payloads in `apps/server/src/chat`.
   - [X] T011 — Implement React chat UI (EventSource hook, message log, latency placeholder, status indicators, “New Session” control, race-condition guard) in `apps/client/src` with no UI exposure of LangMem summaries.

4. **Integration**
   - T012 — Wire structured logging with Pino across server and client, logging startup configuration metadata, correlation/session IDs, latency timings, and internal LangMem summarization events without leaking summaries.
   - T013 — Configure local dev proxy/CORS alignment and shared environment loading (Vite proxy to Fastify, restart guidance) to let the client consume the API seamlessly.

5. **Polish & Documentation**
   - T014 — Document manual streaming vs fallback verification, session reset steps, environment variable management, and restart procedure in `docs/specs/001-initial-chat-api-ui/quickstart.md` (or linked docs).
   - T015 — Run hygiene loop, resolve lint/format/test issues, and record outcomes in commit notes.

## Parallel Execution Notes
- T004 and T006 touch distinct packages (server vs client) and can proceed in parallel once scaffolding from T001–T002 is complete.

## Dependency Summary
- T002 depends on T001 workspace scaffolding.
- T003–T006 depend on T002 package scaffolding.
- T007 depends on T003’s schema expectations.
- T008 depends on T007 shared schemas.
- T009 depends on T004 session tests.
- T010 depends on T005 integration test scaffolding and T008 agent factory.
- T011 depends on T006 tests and T007 shared types.
- T012 depends on T010 (server route) and T011 (client wiring).
- T013 depends on T012 logging context to propagate headers and config metadata.
- T014 depends on T010–T013 delivering observable behaviours and documented env variables.
- T015 should be final after all feature work is merged.
