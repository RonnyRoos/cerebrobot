# Implementation Plan: Thread-Persistent WebSocket Connections

**Branch**: `006-migrate-to-thread` | **Date**: October 11, 2025 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-migrate-to-thread/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Replace the current one-message-per-connection WebSocket pattern with thread-persistent connections where a single WebSocket remains open for the lifetime of an active thread session. Each thread view maintains its own persistent connection that multiplexes multiple request/response cycles, eliminating 100-300ms connection handshake overhead for subsequent messages. The system implements request/response correlation via requestId fields, explicit cancellation protocol for interrupting in-progress responses, automatic reconnection with exponential backoff [1s, 2s, 4s], and dual-ID logging (connectionId + requestId) for operational observability. Supports 1-5 concurrent thread connections (single-user deployment) with KISS approach: no authentication, no rate limiting beyond isStreaming flag, no protocol versioning overhead.

## Technical Context

**Language/Version**: TypeScript 5.5+, Node.js ≥20  
**Primary Dependencies**: Fastify 5.6.1, @fastify/websocket 10.0.1, ws 8.18.0, @langchain/langgraph 0.4.9, React 18.x  
**Storage**: N/A (connection state managed in-memory per connection; existing Postgres checkpointing unchanged)  
**Testing**: Vitest 1.6.0, vitest-websocket-mock (WebSocket mocking), mock-socket (alternative)  
**Target Platform**: Docker Compose deployment (Linux server), modern browsers (Chrome, Firefox, Safari, Edge with WebSocket + AbortController support)  
**Project Type**: Web application (frontend + backend monorepo)  
**Performance Goals**: Second message response start within 50ms (vs current 100-300ms), cancellation within 200ms, error detection within 2 seconds, reconnection within 5 seconds for 95% of transient failures  
**Constraints**: 1-5 concurrent thread connections, 500ms cleanup timeout, 90% connection stability for 5+ message conversations, no automatic idle timeout  
**Scale/Scope**: Single-user deployment, minimal resource requirements, 9 edge cases, 21 functional requirements, 10 success criteria

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Hygiene-First Development
- ✅ **PASS**: All changes will follow `lint → format → test` workflow
- ✅ **PASS**: No hygiene steps will be bypassed without ADR justification

### Transparency & Inspectability  
- ✅ **PASS**: WebSocket connection lifecycle events logged with dual-ID correlation (connectionId + requestId per FR-020)
- ✅ **PASS**: Metrics tracked: messages per connection, cancellation rate, reconnection frequency, connection duration (FR-021)
- ✅ **PASS**: Error states provide actionable context (retryable vs non-retryable per FR-015)
- ✅ **PASS**: Connection state transitions observable through structured Pino logging (FR-019)

### Type Safety & Testability
- ✅ **PASS**: Using TypeScript with strict type checking; no `any` types permitted
- ✅ **PASS**: Dependency injection maintained (WebSocket connections, abort controllers injectable/mockable)
- ✅ **PASS**: Testing strategy follows Constitution Principle III (3-tier approach):
  - Unit tests: Test connection state management, requestId correlation, cancellation logic, reconnection backoff with deterministic inputs
  - Postgres validation: N/A (no schema changes; existing test unchanged)
  - Manual smoke tests: Validate real thread connections, multi-message sessions, mid-stream cancellation, reconnection scenarios
- ✅ **PASS**: Aligns with constitution v1.1.0 testing philosophy (manual validation for real WebSocket behavior, unit tests for state logic)

### Incremental & Modular Development
- ✅ **PASS**: Feature scoped to connection lifecycle migration (one-message → thread-persistent)
- ✅ **PASS**: User stories prioritized (P1: Continuous conversation, P2: Cancellation + Recovery, P3: Multi-thread)
- ✅ **PASS**: Each user story independently testable (P1 deliverable without P2/P3)
- ✅ **PASS**: Small commits planned (connection management, requestId protocol, cancellation, reconnection, cleanup)

### Stack Discipline
- ✅ **PASS**: No new dependencies required (@fastify/websocket, ws, React already approved)
- ✅ **PASS**: UUID library needed for requestId generation (evaluate existing or add minimal dependency)
- ✅ **PASS**: All stack choices align with approved versions (Fastify 5.6.1, LangGraph 0.4.9, React 18.x)
- 📝 **ACTION**: Document UUID library choice in research.md (options: crypto.randomUUID() built-in vs uuid package)

### Configuration Over Hardcoding
- ✅ **PASS**: WebSocket endpoint remains configurable (ws:// dev, wss:// prod)
- ✅ **PASS**: Connection limits (1-5), timeouts (500ms cleanup), backoff delays [1s, 2s, 4s] can be extracted to config if needed
- ✅ **PASS**: Existing LLM/storage configuration unchanged
- ✅ **PASS**: No authentication hardcoded (deferred to future work per clarification Q4)

### Operator-Centric Design
- ✅ **PASS**: Docker Compose deployment unchanged
- ✅ **PASS**: Single-user deployment targets maintained (1-5 connections)
- ✅ **PASS**: No authentication complexity added (deferred per clarification)
- ✅ **PASS**: Error messages user-friendly with retry guidance (reconnection progress visible, manual retry available)
- ✅ **PASS**: KISS approach throughout: no rate limiting, no protocol versioning, discard-and-retry recovery

**Overall Status**: ✅ PASS  
**Blockers**: None  
**Required Actions Before Phase 0**:
1. Research UUID generation approach (built-in crypto.randomUUID() vs uuid package) in research.md
2. No tech stack changes required (all dependencies already approved)

## Project Structure

### Documentation (this feature)

```
specs/006-migrate-to-thread/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── message-protocol.md
│   └── connection-lifecycle.md
├── checklists/
│   └── requirements.md  # Already created during /speckit.specify
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
apps/
├── server/
│   └── src/
│       ├── chat/
│       │   ├── routes.ts                         # MODIFY: Add connection state tracking, requestId echo, cancellation handling
│       │   ├── connection-manager.ts             # NEW: Per-connection state management (connectionId, active requestId, abort controller)
│       │   ├── chat-agent.ts                     # MODIFY: Add AbortSignal support to streamChat() for cancellation
│       │   └── __tests__/
│       │       ├── connection-manager.test.ts    # NEW: Unit tests for connection state, requestId tracking
│       │       └── chat-route.test.ts            # MODIFY: Add tests for multiplexed messages, cancellation, reconnection
│       └── agent/
│           ├── langgraph-agent.ts                # MODIFY: Add AbortSignal parameter to streaming methods
│           └── __tests__/
│               └── langgraph-agent.test.ts       # MODIFY: Add tests for AbortController termination
└── client/
    └── src/
        ├── hooks/
        │   ├── useThreadConnection.ts            # NEW: Thread-persistent WebSocket hook (mount/unmount lifecycle)
        │   ├── useChatMessages.ts                # MODIFY: Use useThreadConnection, add requestId generation, cancellation logic
        │   └── useReconnection.ts                # NEW: Exponential backoff reconnection logic [1s, 2s, 4s]
        ├── components/
        │   └── ThreadView.tsx                    # MODIFY: Use useThreadConnection hook, display reconnection state
        └── test/
            ├── useThreadConnection.test.ts       # NEW: Unit tests for connection lifecycle, cleanup
            ├── useChatMessages.test.ts           # MODIFY: Update for requestId correlation, cancellation
            └── useReconnection.test.ts           # NEW: Unit tests for backoff timing, retry logic

packages/
└── chat-shared/
    └── src/
        └── schemas/
            ├── chat.ts                           # MODIFY: Add requestId field, cancellation event type
            └── connection.ts                     # NEW: Connection state types, cancellation signal schema
```

**Structure Decision**: Web application (monorepo) with existing `apps/server` (Fastify backend) and `apps/client` (React frontend) structure. New connection management layer added server-side (`connection-manager.ts`), new React hooks for thread-persistent connections client-side (`useThreadConnection.ts`, `useReconnection.ts`). Changes touch both transport layer and agent integration (AbortSignal support for cancellation). Shared schemas extended with requestId and cancellation events.

## Complexity Tracking

*No violations requiring justification. This feature maintains existing architecture patterns with connection lifecycle enhancement. All changes align with Constitution principles (KISS approach, no authentication, no rate limiting, type-safe, testable, incremental).*

---

## Planning Phase Progress

### Phase 0: Research ✅ COMPLETE
**Status**: All technical unknowns resolved  
**Objective**: Resolve all technical unknowns and document patterns

**Research Tasks**:
1. ✅ UUID generation approach (crypto.randomUUID() vs uuid package) → Use built-in `crypto.randomUUID()`
2. ✅ AbortController integration with LangGraph streaming → Pass `signal` to `agent.stream()` config
3. ✅ React useRef + useEffect patterns for persistent WebSocket connections → `useThreadConnection` hook pattern
4. ✅ Exponential backoff implementation patterns → `useReconnection` hook with [1s, 2s, 4s] delays
5. ✅ WebSocket message correlation best practices → Server echoes `requestId` in all responses
6. ✅ Server-side per-connection state management → `ConnectionManager` class with `Map<connectionId, ConnectionState>`
7. ✅ Client-side requestId generation and tracking → `inflightRequests: Map<requestId, ResponseHandler>` in useRef

**Output**: ✅ `research.md` with 7 decisions documented

### Phase 1: Design ✅ COMPLETE
**Status**: All design artifacts generated  
**Objective**: Generate data model, contracts, and developer guide

**Design Tasks**:
1. ✅ Document runtime entities in `data-model.md` (Thread Connection, Request Correlation, Cancellation Signal, Connection State)
2. ✅ Create `contracts/message-protocol.md` (requestId fields, cancellation event schema, backward compatibility)
3. ✅ Create `contracts/connection-lifecycle.md` (mount, multiplexing, cancellation, unmount flows)
4. ✅ Generate `quickstart.md` (developer migration guide from one-message to thread-persistent pattern)
5. ✅ Update agent context (`.github/copilot-instructions.md`) via `update-agent-context.sh copilot`

**Output**: ✅ `data-model.md`, `contracts/`, `quickstart.md`, agent context updated

### Phase 2: Task Decomposition ⏸️ PENDING
**Status**: Ready to begin - design artifacts complete  
**Command**: `/speckit.tasks` (NOT executed by `/speckit.plan`)  
**Input**: spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md

**Next Steps**:
1. Run `/speckit.tasks` to generate `tasks.md` with fine-grained implementation tasks
2. Tasks will be ordered by dependency (client hooks → server route → shared schemas)
3. Each task will include acceptance criteria, affected files, and testing requirements

---

## Phase 1 Completion Report

**Date**: October 11, 2025  
**Status**: ✅ COMPLETE

### Deliverables Generated
- ✅ `research.md` - 7 technical decisions documented
- ✅ `data-model.md` - 4 runtime entities with state machines
- ✅ `contracts/message-protocol.md` - WebSocket message schemas with requestId
- ✅ `contracts/connection-lifecycle.md` - Connection state machine flows
- ✅ `quickstart.md` - Developer migration guide (15+ code examples)
- ✅ `.github/copilot-instructions.md` - Agent context updated with new tech stack
- ✅ `PHASE1_SUMMARY.md` - Complete Phase 1 metrics and validation report

### Validation
- ✅ Constitution compliance verified (all 7 gates passing)
- ✅ Specification alignment confirmed (all FRs mapped to design artifacts)
- ✅ No blocking issues or open questions
- ✅ Ready for task decomposition (/speckit.tasks command)

**See `PHASE1_SUMMARY.md` for detailed metrics and artifact references.**  
**Input**: spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md
