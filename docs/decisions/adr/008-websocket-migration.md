# ADR 008: WebSocket Migration for Chat Streaming

## Status
Accepted

## Context

- Phase 1 chat streaming relied on Server-Sent Events (SSE) exposed from `POST /api/chat`.
- SSE blocked client-to-server messaging, required custom stream parsing, and complicated error handling and reconnection logic.
- Feature spec `specs/005-switch-to-websocket` mandates removing SSE and standardising on a bidirectional WebSocket transport.
- The workspace now includes `@fastify/websocket` on the server and `vitest-websocket-mock`/`mock-socket` helpers on the client for testing the new transport layer.

## Decision

Adopt a dedicated WebSocket endpoint (`GET /api/chat/ws`) for streaming chat responses and remove the SSE handler. The server registers the Fastify WebSocket plugin with a 1 MB payload cap and translates `streamChat` events into WebSocket frames. The React client replaces its SSE consumer with a WebSocket hook that manages lifecycle, error recovery, and retry cues. Automated tests leverage `vitest-websocket-mock` (client) and route introspection (server) instead of legacy SSE fixtures.

## Consequences

### Positive

- ✅ Bi-directional channel enables richer error feedback and future enhancements (e.g., operator interrupts).
- ✅ Client-side streaming logic simplifies—no manual SSE parsing or TextDecoder buffering.
- ✅ Structured error payloads (retryable flag, message) are consistent across client/server.
- ✅ Websocket mocks unblock deterministic unit tests; SSE-only harnesses are retired.
- ✅ Aligns with spec roadmap and codifies dependencies in `docs/tech-stack.md`.

### Negative

- ⚠️ Manual smoke tests for concurrency still require operator validation (documented follow-up).
- ⚠️ `mock-socket` only permits close codes 1000 and ≥3000, so unit tests patch the prototype to allow spec codes 1002/1011.
- ⚠️ Integration tests no longer exercise full streaming flow end-to-end due to Fastify WebSocket handshake limitations in Vitest.

## Implementation Notes

1. Installed `@fastify/websocket`, `@types/ws`, `ws` (server tests), and `vitest-websocket-mock`/`mock-socket` (client tests).
2. Registered the WebSocket plugin in `apps/server/src/app.ts` with `maxPayload: 1_048_576`.
3. Replaced SSE handler with `GET /api/chat/ws`, added comprehensive error/close logging, and removed legacy SSE helpers.
4. Rebuilt `useChatMessages` around WebSockets (state management, error handling, retry gating, connection-state tracking, cleanup).
5. Updated ChatView UI to surface retry button and display WebSocket errors.
6. Refreshed tests: client hooks now use `vitest-websocket-mock`; server spec asserts WebSocket route registration and buffered fallback behaviour.
7. Updated `docs/tech-stack.md`, `AGENTS.md`, and added this ADR per guardrails.

## Testing

- ✅ `pnpm lint`
- ✅ `pnpm format:write`
- ✅ `pnpm test` (client warnings remain for missing `act`, but assertions pass)
- ✅ Automated tests cover success + error paths; manual concurrency smoke test deferred to operator runbook.

## References

- Feature spec: `specs/005-switch-to-websocket/spec.md`
- Implementation tasks: `specs/005-switch-to-websocket/tasks.md`
- Server route: `apps/server/src/chat/routes.ts`
- Client hook: `apps/client/src/hooks/useChatMessages.ts`
- Tech stack update: `docs/tech-stack.md`

## Alternatives Considered

- **Keep SSE** – Rejected: unidirectional, brittle error semantics, spec states SSE must be removed.
- **Hybrid SSE + WebSocket** – Rejected: violates mandate to remove SSE and doubles maintenance.
- **REST polling** – Rejected: increases latency, resource heavy, and fails streaming requirement.

## Decision Date
October 13, 2025

## Last Updated
October 13, 2025
