# Implementation Plan: Switch to WebSocket Communication Protocol

**Branch**: `005-switch-to-websocket` | **Date**: October 11, 2025 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-switch-to-websocket/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Replace the current Server-Sent Events (SSE) unidirectional streaming mechanism with WebSocket bidirectional persistent connections for chat communication. This migration removes all SSE code while maintaining existing chat functionality (token-by-token streaming, error handling, connection lifecycle management). The system will support up to 5 concurrent connections (single-user deployment) with 1MB message size limits and structured logging for operational monitoring.

## Technical Context

**Language/Version**: TypeScript 5.5+, Node.js ≥20  
**Primary Dependencies**: Fastify 5.6.1, @fastify/websocket, ws, @langchain/langgraph 0.4.9  
**Storage**: N/A (connection state managed in-memory; existing Postgres checkpointing unchanged)  
**Testing**: Vitest 1.6.0, vitest-websocket-mock (for WebSocket mocking)  
**Target Platform**: Docker Compose deployment (Linux server), modern browsers (Chrome, Firefox, Safari, Edge)  
**Project Type**: Web application (frontend + backend monorepo)  
**Performance Goals**: First token within 2 seconds, error display within 1 second, connection cleanup within 500ms  
**Constraints**: Max 5 concurrent connections, 1MB message size limit, no automatic timeout (connections persist until explicit close)  
**Scale/Scope**: Single-user deployment, minimal resource requirements, ~6 edge cases, 18 functional requirements

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Hygiene-First Development
- ✅ **PASS**: All changes will follow `lint → format → test` workflow
- ✅ **PASS**: No hygiene steps will be bypassed without ADR justification

### Transparency & Inspectability  
- ✅ **PASS**: WebSocket connection lifecycle events logged with correlation IDs (FR-016, FR-017)
- ✅ **PASS**: Error states provide actionable context (retryable vs non-retryable)
- ✅ **PASS**: Connection state transitions observable through structured logging

### Type Safety & Testability
- ✅ **PASS**: Using TypeScript with strict type checking; no `any` types permitted
- ✅ **PASS**: Dependency injection maintained (agent passed to route handlers)
- ✅ **PASS**: Testing strategy follows Constitution Principle III (3-tier approach):
  - Manual smoke tests validate real WebSocket behavior in browser (primary validation)
  - Existing unit tests preserved (no new automated tests added per spec)
  - vitest-websocket-mock installed for future unit test capability if needed
- ✅ **PASS**: Aligns with constitution v1.1.0 testing philosophy (manual validation for real integrations)

### Incremental & Modular Development
- ✅ **PASS**: Feature scoped to single migration (SSE → WebSocket removal)
- ✅ **PASS**: User stories prioritized (P1: Streaming, P2: Error handling, P3: Lifecycle)
- ✅ **PASS**: Each user story independently testable
- ✅ **PASS**: Small commits planned (route handler, client hook, cleanup, tests)

### Stack Discipline
- ⚠️ **MODIFICATION REQUIRED**: Adding `@fastify/websocket` and `ws` to approved dependencies
- ⚠️ **MODIFICATION REQUIRED**: Removing `fastify-sse-v2` from dependencies
- ✅ **PASS**: All other stack choices unchanged (Fastify 5.6.1, LangGraph 0.4.9, etc.)
- 📝 **ACTION**: Document dependency changes in ADR or update tech-stack.md

### Configuration Over Hardcoding
- ✅ **PASS**: WebSocket endpoint configurable via environment (ws:// dev, wss:// prod)
- ✅ **PASS**: No hardcoded connection limits; 1MB message size can be extracted to config
- ✅ **PASS**: Existing LLM/storage configuration unchanged

### Operator-Centric Design
- ✅ **PASS**: Docker Compose deployment unchanged
- ✅ **PASS**: Single-user deployment targets maintained (1-5 connections)
- ✅ **PASS**: No authentication changes required
- ✅ **PASS**: Error messages user-friendly with retry guidance

**Overall Status**: ✅ CONDITIONAL PASS  
**Blockers**: None (dependency changes are expected for this migration)  
**Required Actions Before Phase 0**:
1. Update `docs/tech-stack.md` to reflect @fastify/websocket addition and fastify-sse-v2 removal
2. No ADR required (migration spec itself serves as decision documentation)

## Project Structure

### Documentation (this feature)

```
specs/005-switch-to-websocket/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── websocket-protocol.md
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
│       │   ├── routes.ts                    # MODIFY: Replace SSE with WebSocket handler
│       │   ├── chat-agent.ts                # UNCHANGED: Interface remains same
│       │   └── __tests__/
│       │       └── chat-route.integration.test.ts  # MODIFY: Update mocks for WebSocket
│       └── agent/
│           ├── langgraph-agent.ts           # UNCHANGED: streamChat() generator unchanged
│           └── __tests__/
│               └── langgraph-agent.test.ts  # UNCHANGED: No changes to agent tests
└── client/
    └── src/
        ├── hooks/
        │   └── useChatMessages.ts           # MODIFY: Replace fetch/SSE with WebSocket API
        └── test/
            └── useChatMessages.test.ts      # MODIFY: Update mocks for WebSocket

packages/
└── chat-shared/
    └── src/
        └── schemas/
            └── chat.ts                      # UNCHANGED: Event schemas remain same
```

**Structure Decision**: Web application (monorepo) with existing `apps/server` (Fastify backend) and `apps/client` (React frontend) structure. Changes isolated to transport layer (`routes.ts` and `useChatMessages.ts`) with no modifications to agent logic or shared schemas.

## Complexity Tracking

*No violations requiring justification. This feature maintains existing architecture patterns with protocol-layer substitution only.*

---

## Planning Phase Completion

### Phase 0: Research ✅ COMPLETE
- ✅ `research.md` created with 7 technical decisions documented
- ✅ Decision 1: Library selection (@fastify/websocket + ws)
- ✅ Decision 2: Message format (JSON text frames, existing schema)
- ✅ Decision 3: Connection lifecycle (one-message-per-connection)
- ✅ Decision 4: Error handling (close codes + JSON error events)
- ✅ Decision 5: Testing approach (vitest-websocket-mock + manual)
- ✅ Decision 6: Logging strategy (Pino structured logging)
- ✅ Decision 7: Migration strategy (complete SSE removal)

### Phase 1: Design ✅ COMPLETE
- ✅ `data-model.md` created with 2 runtime entities (WebSocket Connection, Chat Event)
- ✅ `contracts/websocket-protocol.md` created with protocol specification
- ✅ `quickstart.md` created with developer migration guide
- ✅ Agent context updated (copilot-instructions.md)

### Next Steps
**Ready for Phase 2**: Task decomposition  
**Command**: `/speckit.tasks`  
**Input artifacts**: spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md  
**Expected output**: tasks.md with granular implementation tasks
