# Task Plan

## Feature
- Directory: docs/specs/001-initial-chat-api-ui
- Inputs: spec.md, plan.md

## Execution Guidelines
- Run hygiene loop after significant changes (`pnpm lint`, `pnpm format:write`, `pnpm test`).
- Follow TDD where practical: author or update failing tests before implementing behaviour.

## Tasks

1. **Setup & Environment**
   - T001 — Establish pnpm workspace scaffolding (root `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.npmrc` targeting Node 20) and install baseline dependencies.
   - T002 — Scaffold `apps/server`, `apps/client`, and `packages/chat-shared` with TypeScript configs, build scripts, and shared lint/format tooling alignment.

2. **Tests**
   - T003 — Create failing unit tests for chat request/response Zod schemas in `packages/chat-shared/__tests__/chat-schema.test.ts`.
   - T004 [P] — Add failing tests covering session issuance/renewal logic and long-lived IDs under `apps/server/src/session/__tests__/session.routes.test.ts`.
   - T005 — Draft failing integration test validating `POST /api/chat` plus SSE streaming/fallback behaviour in `apps/server/src/chat/__tests__/chat-route.integration.test.ts`.
   - T006 [P] — Add failing React component tests for streaming updates, error surfaces, and “New Session” control in `apps/client/src/components/__tests__/ChatView.test.tsx`.

3. **Core Implementation**
   - T007 — Implement shared Zod schemas/types for chat payloads and streaming events in `packages/chat-shared`, exporting helpers consumed by server and client.
   - T008 — Build session issuance endpoint/middleware issuing long-lived IDs, persisting client tokens, and handling re-requests in `apps/server/src/session`.
   - T009 — Implement validated `POST /api/chat` route invoking LangGraph, emitting SSE events (with correlation IDs) and buffered fallback in `apps/server/src/chat`.
   - T010 — Implement React chat UI (EventSource hook, message log, metadata placeholder, status indicators, “New Session” control, race-condition guard) in `apps/client/src`.

4. **Integration**
   - T011 — Wire structured logging with Pino across server and client, ensuring correlation and session IDs propagate, best-effort latency metrics are recorded, and error handling surfaces actionable messages.
   - T012 — Configure local dev proxy/CORS alignment and shared env configuration to let Vite client consume Fastify API seamlessly.

5. **Polish & Documentation**
   - T013 — Document manual streaming vs fallback verification and session reset steps in new `docs/specs/001-initial-chat-api-ui/quickstart.md`.
   - T014 — Run hygiene loop, resolve lint/format/test issues, and record outcomes in commit notes.

## Parallel Execution Notes
- T004 and T006 touch distinct packages (server vs client) and can proceed in parallel once scaffolding from T001–T002 is complete.

## Dependency Summary
- T002 depends on T001 workspace scaffolding.
- T003–T006 depend on T002 package scaffolding.
- T007 depends on T003’s schema expectations.
- T008 depends on T004’s session tests.
- T009 depends on T005 integration test scaffolding and T007 shared schemas.
- T010 depends on T006 tests and T007 shared types.
- T011 depends on T009 (server route) and T010 (client wiring).
- T012 depends on T011 logging context to propagate headers.
- T013 depends on T009–T012 implementing observable behaviours.
- T014 should be final after all feature work is merged.
