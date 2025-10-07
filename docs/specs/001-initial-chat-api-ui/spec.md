# Initial Chat API and UI

## Overview
Establish a minimal LangGraph-backed chat service that exposes an HTTP API and companion web client so operators can exercise the Phase 1 conversation loop end to end. The deliverable spans three layers: a single-node LangGraph agent driven by LangMem hotpath memory, a Fastify API that fronts the agent, and a web UI that consumes the API.

## Goals
- Provide a documented Fastify HTTP endpoint that brokers chat turns through the LangGraph agent.
- Implement a single-node LangGraph agent (LLM node + LangMem hotpath memory) whose prompt, model, temperature, and memory limits are operator-configurable via environment settings.
- Deliver a lightweight web client that can submit prompts, stream/display responses, and show basic request metadata.
- Ensure the API and UI scaffolding align with Phase 1 requirements and remain extensible toward memory inspection in later phases.

## Non-Goals
- Implement persistent memory storage or editing workflows (Phase 2 scope).
- Add authentication, rate limiting, or production hardening beyond logging and error reporting.
- Build advanced UI features such as memory visualization or multi-session management.

## Functional Requirements
- Define a Fastify route (e.g., `POST /api/chat`) accepting a validated payload with session identifier and user message; agent configuration derives solely from environment settings (no per-request overrides in Phase 1).
- Instantiate a LangGraph agent graph composed of a single LLM node backed by LangMem hotpath memory (in-memory store), seeded with operator-configurable prompt, model, temperature, and memory size values from environment configuration; the prompt is a single system message with an optional operator-provided persona tag.
- Invoke the LangGraph agent per request using the caller's session context, returning assistant messages plus correlation identifiers; richer telemetry (timestamps, node trace IDs) is deferred to later phases.
- Support incremental/streaming responses using Server-Sent Events (SSE) as the primary transport with buffered replies as a fallback.
- Issue a long-lived session identifier when the UI loads, persist it client-side without automatic expiry, and include it with each API call.
- Provide a “New Session” control that requests a fresh server-issued session ID, resets message history, and reconnects the stream using the new identifier.
- Implement client-side interface with input form, message history pane, and status indicators using approved frontend stack (e.g., Vite + React per tech guardrails).
- Defer rich metadata display; Phase 1 may surface a basic latency placeholder but full telemetry arrives in later iterations.
- Persist LangMem hotpath memory in process (one store per session), summarizing older entries into condensed memory messages when the hotpath limit is reached, and allow the API to reset or garbage-collect session memory when a new session is issued; summaries remain internal and are not surfaced in Phase 1 responses.
- Provide inline error handling surfaced to the client UI with actionable messaging.

## Non-Functional Requirements
- Adhere to TypeScript code style and linting rules across server and client packages.
- Log structured events with Pino, including correlation IDs for each chat turn and agent configuration metadata (model, temperature) at startup.
- Aim for hobbyist-friendly latency (target <5s for default model) on a best-effort basis by instrumenting basic timing logs; detailed concurrency guarantees are deferred.
- Write unit/integration tests covering request validation, graph invocation, and frontend component rendering.
- Document setup, configuration, and troubleshooting steps in repository docs.
- Document environment variables that tune the agent (system prompt text, optional persona tag, model name, temperature, LangMem hotpath size) and how operators can modify them; clarify that updates require a server restart in Phase 1.

## User Stories
- As an operator, I want to send a message through the API so that I can verify the LangGraph agent responds correctly.
- As an operator, I want a simple web UI so that I can interact with the chatbot without crafting manual HTTP requests.
- As a developer, I want structured logs and metadata so that I can debug graph execution issues quickly.
- As an operator, I want to tweak the agent prompt and model configuration via environment settings so that I can iterate on behaviour without code changes.

## Edge Cases
- Invalid request payloads (UI should prevent submission and API must return descriptive validation errors).
- SSE/stream transport unsupported by browser (fallback to buffered response).
- Multiple rapid submissions creating race conditions in UI rendering order.
- Session identifier collisions or loss (UI must request a fresh ID if absent and preserve the assigned value across reloads).
- LangMem hotpath store invalidation when sessions reset or server restarts (ensure memory initializes cleanly per session).

## Open Questions
- TBD: Clarify how session identifiers map to future memory persistence expectations.
- TBD: Define strategy for handling network or LLM provider timeouts and communicating retriable states to operators.

## Clarifications
### Session 2025-09-27
- Q: Preferred streaming transport? → A: Server-Sent Events (SSE) as the primary streaming mechanism with buffered fallback
- Q: How should session identifiers be managed in Phase 1? → A: Server issues long-lived session ID per UI load; persists client-side without timeout
- Q: Minimum metadata to expose in Phase 1? → A: Defer until later
- Q: How should conversation resets behave? → A: Provide “New Session” control that fetches fresh ID and clears history
- Q: How should LangMem hotpath retention behave? → A: Summarize older entries using LangGraph’s summarization pattern
- Q: What structure should the agent prompt use? → A: Single system prompt with optional operator-provided persona tag
- Q: Do we allow request-level agent overrides in Phase 1? → A: No overrides; environment config only
- Q: Should LangMem summaries be exposed? → A: Keep summaries internal for Phase 1
- Q: How are configuration changes applied? → A: Reload by restarting the server; no hot reload in Phase 1

## References
- docs/mission.md
- docs/best-practices.md
- docs/tech-stack.md
