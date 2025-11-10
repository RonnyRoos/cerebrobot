# Implementation Plan: Metadata-Based Autonomous Message Tagging

**Branch**: `016-metadata-autonomous-messages` | **Date**: 2025-11-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/016-metadata-autonomous-messages/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Replace content-based filtering of autonomous messages with metadata-driven approach using LangChain's `HumanMessage.additional_kwargs` to eliminate system message leakage while preserving natural conversation flow. This enables clean thread history filtering, improves memory retrieval relevance during autonomous interactions, and provides structured observability without coupling to message content format.

**Technical Approach**: Tag synthetic autonomous messages with invisible metadata (`synthetic: true`, `trigger_type: string`) stored in `additional_kwargs`, use context-aware natural language prompts per trigger type, detect metadata in memory retrieval and thread filtering logic, validate metadata persistence through LangGraph checkpointing, emit structured logs at DEBUG/INFO/ERROR levels for comprehensive observability.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js ≥20)  
**Primary Dependencies**: 
- LangChain Core 0.3.77 (`@langchain/core/messages` - HumanMessage with additional_kwargs)
- LangGraph 0.4.9 (state serialization, checkpoint persistence)
- Fastify 5.6.1 (HTTP/WebSocket server)
- Pino 9.11.0 (structured logging)
- Zod 4.1.11 (schema validation)

**Storage**: PostgreSQL via Prisma (LangGraph checkpoints persist message metadata)  
**Testing**: Vitest (unit tests), deterministic fixtures for message metadata, checkpoint serialization validation  
**Target Platform**: Docker Compose deployment (Linux server)  
**Project Type**: Monorepo with separate apps/server and apps/client packages  
**Performance Goals**: <5ms overhead per message for metadata operations, zero latency impact on memory retrieval  
**Constraints**: 100% metadata persistence fidelity through checkpoints, backward compatibility with existing autonomous timer infrastructure  
**Scale/Scope**: 4 autonomous trigger types, affects SessionProcessor + memory nodes + thread service + LangGraphAgent (5 files)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Initial Check (Before Phase 0)

**I. Hygiene-First Development**: ✅ PASS
- All code changes will complete lint → format → test loop
- No bypasses planned
- CI mirrored locally

**II. Transparency & Inspectability**: ✅ PASS
- Structured logging (Pino) at DEBUG/INFO/ERROR levels tracks metadata lifecycle
- Memory operations expose metadata in logs
- Metadata visible in checkpoint inspection

**III. Type Safety & Testability**: ✅ PASS
- No `any` types; HumanMessage types from `@langchain/core`
- Dependency injection: message creation receives timer context via parameters
- Unit tests for SessionProcessor, LangGraphAgent, memory nodes, thread service (tasks T007a-T007d)
- Startup validation test for checkpoint metadata persistence (T005-T006)
- Deterministic fixtures (no real LLM calls in unit tests)

**IV. Incremental & Modular Development**: ✅ PASS
- Feature decomposes into 4 user stories (2xP1, 1xP2, 1xP3)
- Each user story independently testable
- Small commits per functional requirement
- Focused modules (SessionProcessor, memory nodes, thread service remain separate)

**V. Stack Discipline**: ✅ PASS
- Uses approved LangChain Core 0.3.77, LangGraph 0.4.9
- No new libraries introduced
- No version upgrades required

**VI. Configuration Over Hardcoding**: ✅ PASS
- Natural language prompts could become configurable (future consideration noted in spec)
- No hardcoded API endpoints or service assumptions
- Metadata structure defined in code (not configuration) per LangChain standards

**VII. Operator-Centric Design**: ✅ PASS
- Improves operator debugging via metadata-based log filtering
- No deployment complexity added (Docker Compose unchanged)
- Memory editing unaffected; metadata transparent to operators

**VIII. MCP Server Utilization**: ✅ PASS
- SequentialThinking used for multi-step planning (this planning phase)
- Context7 queried for LangChain HumanMessage documentation
- Serena available for code navigation during implementation
- Playwright not applicable (backend-only changes)

**IX. Design Library First**: ✅ N/A (Backend-only feature)
- No UI components involved
- No changes to `@workspace/ui`

**GATE RESULT**: ✅ ALL CHECKS PASS - Proceed to Phase 0

---

### Re-check After Phase 1 Design

*Validated against concrete design artifacts (data-model.md, contracts/, quickstart.md)*

**I. Hygiene-First Development**: ✅ PASS (CONFIRMED)
- quickstart.md documents hygiene loop: `pnpm lint && pnpm format:write && pnpm test`
- Checkpoint metadata validation test ensures fail-fast on errors
- Development workflow enforces testing at each stage

**II. Transparency & Inspectability**: ✅ PASS (CONFIRMED)
- data-model.md Section 9: Three-tier logging strategy (DEBUG/INFO/ERROR) with structured fields
- quickstart.md Section 6: Log patterns for message creation, memory retrieval, thread filtering
- Metadata persists in checkpoints for post-mortem analysis

**III. Type Safety & Testability**: ✅ PASS (CONFIRMED)
- data-model.md Section 1: Full TypeScript interface definitions (MessageMetadata, AutonomousTriggerType)
- data-model.md Section 7: Strict boolean checks (`=== true`), type guards for metadata existence
- tasks.md T007a-T007d: Unit tests for all modified components (SessionProcessor, LangGraphAgent, memory nodes, thread service)
- quickstart.md Section 3: Checkpoint persistence validation test with deterministic fixtures
- No `any` types; all metadata optional properties handled safely

**IV. Incremental & Modular Development**: ✅ PASS (CONFIRMED)
- data-model.md Section 11: Migration strategy enables phased rollout (dual filtering support during transition)
- quickstart.md: Development loop encourages file-by-file implementation
- Each layer (SessionProcessor → LangGraphAgent → Memory/Thread) independently testable

**V. Stack Discipline**: ✅ PASS (CONFIRMED)
- research.md confirms LangChain Core 0.3.77 supports `additional_kwargs` (no upgrade needed)
- data-model.md Section 10: No new dependencies introduced
- Uses existing Pino logger, Zod validators, Vitest framework

**VI. Configuration Over Hardcoding**: ✅ PASS (CONFIRMED)
- data-model.md Section 2: Natural prompts mapped to trigger types via code (not hardcoded strings in multiple places)
- contracts/README.md: No external API changes (internal refactoring only)
- Future configurability noted but not required for initial implementation

**VII. Operator-Centric Design**: ✅ PASS (CONFIRMED)
- quickstart.md Section 6: Operators can filter logs by metadata fields (`grep -i metadata`)
- data-model.md Section 8: Empty thread edge case logs ERROR but continues (fail operational)
- Checkpoint database inspection commands documented for debugging

**VIII. MCP Server Utilization**: ✅ PASS (CONFIRMED)
- SequentialThinking used throughout planning phase (6 thoughts)
- Context7 queried for LangChain documentation (`/langchain/core/messages`)
- Serena tools activated for codebase navigation during research
- Properly leveraged during both research and design phases

**IX. Design Library First**: ✅ N/A (Backend-only feature)
- contracts/README.md: No UI changes, no client code affected
- Confirmed no `@workspace/ui` involvement

**GATE RESULT**: ✅ ALL CHECKS PASS - Design approved, proceed to implementation

**Design Impact Summary**:
- No new violations introduced
- Design enhances Transparency (II) with structured logging
- Design strengthens Type Safety (III) with strict metadata interfaces
- Design preserves Modularity (IV) through layered architecture
- All principles satisfied by concrete implementation plan

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/
├── server/
│   └── src/
│       ├── events/
│       │   └── session/
│       │       └── SessionProcessor.ts     # Create HumanMessage with metadata
│       ├── agent/
│       │   ├── langgraph-agent.ts          # Handle string + HumanMessage inputs
│       │   ├── memory/
│       │   │   └── nodes.ts                # Detect metadata, use alternative query
│       │   └── graph/
│       │       └── conversation-graph.ts   # Metadata flows through state
│       └── thread/
│           └── service.ts                  # Filter using metadata checks
└── client/ (no changes for this feature)

packages/
└── chat-shared/
    └── src/
        └── types/ (potential metadata type definitions if needed)

tests/
└── server/
    ├── events/session/
    │   └── SessionProcessor.test.ts        # Metadata creation tests
    ├── agent/memory/
    │   └── nodes.test.ts                   # Memory query detection tests
    └── thread/
        └── service.test.ts                 # Thread filtering tests
```

**Structure Decision**: Existing monorepo structure unchanged. Feature implementation touches existing files in `apps/server/src/` across events, agent, and thread modules. No new top-level directories or packages required. Tests mirror source structure under `apps/server/src/__tests__/` or adjacent `*.test.ts` files per existing convention.

## Complexity Tracking

> **No violations - this section intentionally empty**

All Constitution Check gates passed. No complexity justifications required.
