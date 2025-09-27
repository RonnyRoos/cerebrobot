# Initial Chat API and UI

## Overview
Establish a minimal LangGraph-backed chat service that exposes an HTTP API and companion web client so operators can exercise the Phase 1 conversation loop end to end. The deliverable demonstrates message routing through the graph, returning responses, and rendering them in a thin browser UI.

## Goals
- Provide a documented HTTP endpoint that brokers chat turns through the LangGraph agent.
- Deliver a lightweight web client that can submit prompts, stream/display responses, and show basic request metadata.
- Ensure the API and UI scaffolding align with Phase 1 requirements and remain extensible toward memory inspection in later phases.

## Non-Goals
- Implement persistent memory storage or editing workflows (Phase 2 scope).
- Add authentication, rate limiting, or production hardening beyond logging and error reporting.
- Build advanced UI features such as memory visualization or multi-session management.

## Functional Requirements
- Define a Fastify route (e.g., `POST /api/chat`) accepting a validated payload with session identifier, user message, and optional config overrides.
- Invoke the LangGraph agent graph per request, returning assistant messages plus correlation identifiers; richer telemetry (timestamps, node trace IDs) is deferred to later phases.
- Support incremental/streaming responses using Server-Sent Events (SSE) as the primary transport with buffered replies as a fallback.
- Issue a long-lived session identifier when the UI loads, persist it client-side without automatic expiry, and include it with each API call.
- Provide a “New Session” control that requests a fresh server-issued session ID, resets message history, and reconnects the stream using the new identifier.
- Implement client-side interface with input form, message history pane, and status indicators using approved frontend stack (e.g., Vite + React per tech guardrails).
- Defer rich metadata display; Phase 1 may surface a basic latency placeholder but full telemetry arrives in later iterations.
- Provide inline error handling surfaced to the client UI with actionable messaging.

## Non-Functional Requirements
- Adhere to TypeScript code style and linting rules across server and client packages.
- Log structured events with Pino, including correlation IDs for each chat turn.
- Aim for hobbyist-friendly latency (target <5s for default model) on a best-effort basis by instrumenting basic timing logs; detailed concurrency guarantees are deferred.
- Write unit/integration tests covering request validation, graph invocation, and frontend component rendering.
- Document setup, configuration, and troubleshooting steps in repository docs.

## User Stories
- As an operator, I want to send a message through the API so that I can verify the LangGraph agent responds correctly.
- As an operator, I want a simple web UI so that I can interact with the chatbot without crafting manual HTTP requests.
- As a developer, I want structured logs and metadata so that I can debug graph execution issues quickly.

## Edge Cases
- Invalid request payloads (UI should prevent submission and API must return descriptive validation errors).
- SSE/stream transport unsupported by browser (fallback to buffered response).
- Multiple rapid submissions creating race conditions in UI rendering order.
- Session identifier collisions or loss (UI must request a fresh ID if absent and preserve the assigned value across reloads).

## Open Questions
- TBD: Clarify how session identifiers map to future memory persistence expectations.
- TBD: Define strategy for handling network or LLM provider timeouts and communicating retriable states to operators.

## Clarifications
### Session 2025-09-27
- Q: Preferred streaming transport? → A: Server-Sent Events (SSE) as the primary streaming mechanism with buffered fallback
- Q: How should session identifiers be managed in Phase 1? → A: Server issues long-lived session ID per UI load; persists client-side without timeout
- Q: Minimum metadata to expose in Phase 1? → A: Defer until later
- Q: How should conversation resets behave? → A: Provide “New Session” control that fetches fresh ID and clears history

## References
- docs/mission.md
- docs/best-practices.md
- docs/tech-stack.md
