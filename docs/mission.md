# Cerebrobot Mission Statement

## Vision
Create an immersive, LangGraph-powered chatbot that not only converses naturally but also exposes its internal memory graph so users can observe, inspect, and modify the bot's "brain" in real time—all delivered as a self-hosted, hobby-friendly stack.

## Guiding Principles
- **Transparency by design**: The memory graph should be explorable and auditable even when self-hosted by a single hobbyist operator.
- **User agency**: Memory editing must feel safe, reversible, and observable.
- **Modular architecture**: Each phase should stand on its own, enabling independent testing and incremental releases.
- **Testable increments**: Every phase must include a validation plan that confirms functionality before moving on.
- **Sustainable growth**: Decisions in early phases should anticipate later capabilities such as multi-agent collaboration and configurable personalities.
- **Configurable foundations**: All external dependencies (LLMs, storage, networking) must remain swappable via configuration, favoring OpenAI-compatible interfaces.

## Multi-Phase Roadmap

### Phase 1 — Conversational Core
- **Goal**: Ship a minimal chatbot built with LangGraph's TypeScript stack that demonstrates immersive dialogue.
- **Scope**:
  - Project scaffolding (LangChain/LangGraph, TypeScript, Docker Compose, package management).
  - Define initial agent graph with prompt templates, tools, and state transitions.
  - Implement custom prompt configuration, and read/write memory operations exposed to the single operator.
  - Implement small, focused tests to validate graph flow and message handling.
- **Deliverables**:
  - Running CLI prototype or lightweight server endpoint for manual interaction.
  - Test suite covering conversation loop and state transitions.
  - Documentation covering local setup, test strategy, and architectural overview.
- **Definition of done**: Conversation loop works end-to-end, tests pass, and the architecture is documented.

### Phase 2 — Memory Persistence & Manipulation
- **Goal**: Introduce a structured, inspectable memory layer with persistence and editing affordances that persist through Postgres (LangGraph default).
- **Scope**:
  - Formalize the memory schema (graph model, metadata, lifecycle).
  - Persistence layer using Postgres (default LangGraph integration) with versioning/snapshots.
  - APIs/utilities to read, diff, and mutate memory entries safely.
  - Guardrails for conflicting edits and rollback mechanisms.
- **Deliverables**:
  - Memory interface contracts and adapters (in-memory + persistent implementation).
  - End-to-end tests that cover saving, loading, and editing memory.
  - Developer documentation on memory architecture and workflows.
- **Definition of done**: Memory survives process restarts, exposes inspection APIs, and editing operations are validated by tests.

### Phase 3 — Public API Surface
- **Goal**: Provide programmatic access to the chatbot and memory manipulation features.
- **Scope**:
  - Design REST/GraphQL API contracts for conversation, memory inspection, and mutation.
  - Defer authentication/authorization (single user behind reverse proxy) but keep seams for future hardening.
  - Rate limiting, logging, and observability concerns sized for hobby deployments.
  - Error handling and schema validation (e.g., Zod).
- **Deliverables**:
  - API server with documented endpoints and request/response schemas.
  - Integration tests (or contract tests) for core API flows.
  - API reference documentation and quickstart examples.
- **Definition of done**: External clients can converse with the bot and manipulate its memory through stable APIs, backed by tests.

### Phase 4 — Interactive Frontend
- **Goal**: Build a simple UI to interact with the chatbot and visualize/modify memory, optimized for a single-operator experience.
- **Scope**:
  - Lightweight frontend (React/Next.js or similar) consuming the public API.
  - Conversational UI with streaming or incremental updates.
  - Memory visualization panel (graph/table view) with edit controls and safeguards.
  - Accessibility and responsive design considerations.
- **Deliverables**:
  - Functional frontend hosted locally (or via dev server) with clear setup instructions.
  - UI-level tests (component/unit) and manual testing guides.
  - UX documentation outlining flows and interaction patterns.
- **Definition of done**: Users can hold a conversation and inspect/edit memory from the UI with feedback loops (success/error states).

### Phase 5 — Advanced Capabilities
- **Goal**: Extend the platform with multi-agent coordination and configurable agent personas while remaining deployable via Docker Compose.
- **Scope**:
  - Multi-agent graph orchestration (coordination strategies, shared memory pools).
  - Admin/configuration UI for agent behaviors, prompts, and permissions.
  - Experimentation hooks (A/B testing, prompt iteration tooling).
  - Telemetry and performance monitoring enhancements.
- **Deliverables**:
  - Advanced agent modules with tests covering coordination flows.
  - Configuration UI components and documentation for administrators.
  - Playbook for extending the system with additional agents or tools.
- **Definition of done**: Multi-agent workflows run reliably, configuration changes are persisted, and monitoring surfaces key insights.

## Success Metrics
- Phase-by-phase acceptance criteria met without regressions.
- Automated test coverage for conversation, memory persistence, and APIs.
- Hobbyist operator can deploy via Docker Compose with minimal manual configuration.
- Developer onboarding time measured in hours, not days.
- User satisfaction captured via usability testing or feedback loops once the UI is available.

## Deployment & Infrastructure Assumptions
- Single-operator, hobby project with no immediate authentication layer (reverse proxy hardening deferred).
- Docker Compose remains the primary deployment story across all phases.
- Default LLM integrations rely on OpenAI-compatible APIs with DeepInfra as the preferred inference provider, but endpoints must be configurable.
- Postgres (LangGraph default) provides the persistent storage layer.
- Keep architecture simple (KISS) while leaving extension points for future scaling.

## Open Questions for Refinement
- What level of real-time collaboration (simultaneous editors) must the memory editing support?
- Do we anticipate integrating external tools or knowledge bases during the early phases?

_Resolved:_ audience (single operator), hosting (Docker Compose + configurable OpenAI-compatible providers), data sensitivity (none), immersive must-haves (memory read/write + custom prompt in Phase 1), timelines (none).

---

_This document is a living outline. We will refine it as requirements solidify and open questions are resolved._
