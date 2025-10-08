# Implementation Plan

## Input
- Feature: [spec.md](./spec.md)
- Summary: Ship a Fastify-backed chat API and lightweight web UI that exercises the LangGraph conversation loop with streaming responses and operator-visible metadata seams.
- Additional Context: None

## Architecture & Stack
- Fastify v5 with `fastify-sse-v2` exposes `POST /api/chat` plus an SSE endpoint for streaming assistant turns.
- LangGraph (via `@langchain/langgraph`) orchestrates a single-node agent backed by LangMem hotpath memory; configuration (system prompt, persona tag, model name, temperature, memory limits) is loaded from environment variables at boot.
- Client uses Vite + React with TypeScript, consuming SSE via the Fetch EventSource API and falling back to buffered fetch.
- Shared Zod schemas define request/response payloads across server and client; no per-request agent overrides are accepted in Phase 1.
- Pino logging provides structured events with correlation IDs per chat turn and emits agent configuration metadata at startup.

## Data Model
- `Session`: `{ id: string, createdAt: Date }`; issued by backend, persisted client-side; backend tracks active sessions in-memory and maps session IDs to LangMem stores.
- `ChatMessage`: `{ id: string, sessionId: string, role: 'user' | 'assistant', content: string, createdAt: Date, metadata?: Record<string, unknown> }`; stored transiently per request for UI rendering and future persistence seams.
- `StreamEvent`: `{ type: 'token' | 'complete' | 'error', data: unknown, correlationId: string }`; represents SSE payloads, enabling fallback consolidation into buffered replies.
- `MemorySummary`: `{ sessionId: string, summary: string, updatedAt: Date }`; retained in-memory only, generated when LangMem hotpath thresholds trigger summarization and not exposed to clients.
- No dedicated persistence layer in Phase 1; plan leaves seams (`sessionId`, correlation IDs, memory summaries) for Phase 2 memory storage alignment.

## Workflow Phases
1. **Phase 0 – Research**
   - Purpose: Confirm Fastify SSE integration patterns and LangGraph streaming APIs behave together, and document any required polyfills for browsers.
   - Deliverables: Notes inline in `plan.md`; create `research.md` only if deviations from guardrails surface.
2. **Phase 1 – Core Implementation**
   - Implement session issuance endpoint or middleware that returns long-lived IDs on UI load.
   - Build validated `POST /api/chat` route using Zod, invoke LangGraph agent, and emit SSE updates with correlation IDs while ensuring agent configuration is sourced exclusively from environment variables.
   - Create React components: session bootstrapper, chat log, input form with optimistic state, status indicators, and “New Session” control that refreshes ID and history.
   - Wire SSE subscription with graceful fallback to buffered response when EventSource unsupported or on failure, and hide LangMem summary activity from the UI.
3. **Phase 2 – Validation & Tests**
   - Add unit tests for request validation, session issuance, and graph invocation hooks (mocking LangGraph boundary).
   - Add integration test covering SSE handshake (can use supertest or light harness) plus fallback path, including assertions that LangMem summaries are not returned.
   - Implement React component tests for streaming updates, error surface, and new-session reset behavior, ensuring configuration values cannot be overridden client-side.
   - Document manual verification steps for streaming vs fallback and multi-submit race handling.
4. **Phase 3 – Polish & Documentation**
   - Ensure structured logging includes correlation and session IDs; surface minimal latency placeholder in UI, capture best-effort timing metrics, and log LangMem summarization events without exposing summaries.
   - Update repository docs with API usage, local dev instructions, troubleshooting tips, and the procedure for changing agent environment variables (including restart requirement).
   - Run hygiene loop (`pnpm lint`, `pnpm format:write`, `pnpm test`) and capture outcomes.
   - Prepare README snippet or quickstart instructions referenced from plan (can live in spec folder if needed).

## Risks & Mitigations
- **SSE compatibility gaps**: Mitigate with buffered fallback and documented browser requirements; test on evergreen browsers.
- **LangGraph streaming integration**: Encapsulate graph invocation behind adapter to ease testing; add integration test to catch regressions.
- **Session longevity without persistence**: Document that sessions reset on server restart and ensure client gracefully re-requests IDs when missing.
- **Concurrent submissions**: Queue outgoing prompts client-side and tag responses with correlation ID to preserve ordering.
- **CORS / local dev mismatch**: Co-locate UI and API or configure proxy in Vite dev server early in implementation.
- **Configuration drift**: Because environment changes require a server restart, document change procedures to avoid stale configuration during testing.

## Validation Strategy
- Follow hygiene loop per significant change: `pnpm lint` → `pnpm format:write` → `pnpm test`.
- Target unit coverage for Zod schemas, session issuance, and SSE emitter utilities.
- Integration tests validate end-to-end chat turn flow, streaming behavior, and the absence of LangMem summaries in responses.
- Frontend tests cover component rendering, SSE event handling, and session reset UX.

## Deliverables
- Fastify route module, LangGraph invocation adapter, and SSE streaming utilities.
- Shared TypeScript types/Zod schemas consumed by both server and client packages.
- React UI components, hooks for EventSource handling, and styling aligned with guardrails.
- Test suites (server unit/integration, client component) plus manual test checklist.
- Documentation updates: feature quickstart or README section detailing setup, streaming expectations, reset behavior, and environment configuration management (including restart requirement).

## Open Questions
- How will Phase 2 memory persistence map session IDs, LangMem summaries, and chat transcripts to stored conversations? (Requires follow-up before persistence work begins.)

## Supporting Artefacts
- research.md: not required unless SSE+LangGraph integration reveals novel constraints.
- data-model.md: not required; entities documented above.
- contracts/: none planned for Phase 1; reassess when external API consumers emerge.
- quickstart.md: to be authored during Phase 3 to capture manual streaming verification steps.
