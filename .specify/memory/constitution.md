<!--
SYNC IMPACT REPORT
==================
Version change: [TEMPLATE] → 1.0.0
Action: Initial constitution ratification

Principles defined:
- I. Hygiene-First Development (NON-NEGOTIABLE)
- II. Transparency & Inspectability
- III. Type Safety & Testability
- IV. Incremental & Modular Development
- V. Stack Discipline
- VI. Configuration Over Hardcoding
- VII. Operator-Centric Design

Sections added:
- Core Principles (7 principles)
- Development Workflow & Quality Gates
- Governance

Templates requiring updates:
- ✅ plan-template.md: Constitution Check section aligns with principles
- ✅ spec-template.md: User scenarios enforce testability (Principle IV)
- ✅ tasks-template.md: Task organization supports incremental delivery (Principle IV)

Follow-up actions:
- None - all principles are concrete and actionable

Rationale for version 1.0.0:
- First formal ratification of project constitution
- Establishes foundational governance framework
- All principles extracted from existing project documentation
-->

# Cerebrobot Constitution

## Core Principles

### I. Hygiene-First Development (NON-NEGOTIABLE)

Every significant code change MUST complete the hygiene loop in strict order:

1. `pnpm lint` — ESLint validation passes with zero warnings
2. `pnpm format:write` — Prettier formatting applied
3. `pnpm test` — All tests pass

**Rules**:
- Do not stack failures; fix each step before proceeding
- Never commit code that fails any hygiene step
- Bypassing checks requires explicit ADR justification and must be temporary
- Mirror CI locally; ensure local scripts match GitHub Actions

**Rationale**: Automated quality gates prevent regressions, maintain consistency, and eliminate debates about style or broken tests. The strict ordering ensures that formatting doesn't mask lint issues and tests validate actual behavior.

### II. Transparency & Inspectability

The system's internal state, especially the memory graph, MUST be observable and auditable by operators at all times.

**Rules**:
- Memory operations (read/write/edit) must expose their effects through APIs or tooling
- LangGraph nodes must log state transitions with structured logging (Pino)
- Configuration changes must be traceable and reversible
- Error states must surface actionable context, not generic messages

**Rationale**: The mission prioritizes operator agency and transparency. Single-operator deployments require deep visibility without complex observability stacks. Inspectable state enables debugging, trust-building, and informed memory manipulation.

### III. Type Safety & Testability

Code MUST be type-safe, dependency-injected, and testable in isolation.

**Rules**:
- `any` type is forbidden; start from `unknown` and narrow explicitly
- Use `interface` for cross-module contracts; `type` for unions and aliases
- Model state machines with discriminated unions, not boolean flags
- Inject dependencies (LLM clients, stores) via parameters or constructors
- Prefer pure functions for graph logic; isolate I/O in adapters
- Write tests that validate behavior, not implementation details
- Use real implementations over mocks; leverage lightweight fakes for external services

**Rationale**: Type safety catches errors at compile time. Dependency injection enables testing without production services. Pure functions eliminate hidden state and make reasoning about graph flows straightforward. Behavior-driven tests survive refactors.

### IV. Incremental & Modular Development

Development MUST proceed in small, independently testable increments aligned with the multi-phase roadmap.

**Rules**:
- Each phase (Phase 1–5) stands alone with validation criteria before moving forward
- Commits must be small, linted, formatted, and tested
- Features decompose into user stories prioritized by value (P1, P2, P3)
- Each user story must be independently implementable and testable
- Add regression tests when fixing bugs
- Keep modules focused; split files when responsibilities multiply

**Rationale**: The mission demands sustainable growth with testable increments. Small commits reduce review burden and isolate failures. Prioritized user stories enable MVP slicing—delivering P1 functionality provides immediate value while P2/P3 extend capabilities. Modular design anticipates multi-agent and persistence extensions without premature complexity.

### V. Stack Discipline

Technology choices MUST align with the approved stack; deviations require Architecture Decision Record (ADR) justification.

**Approved Stack**:
- **Runtime**: Node.js ≥20
- **HTTP**: Fastify 5.6.1, fastify-sse-v2 4.2.1
- **LangGraph**: @langchain/langgraph 0.4.9, langchain 0.3.34, @langchain/core 0.3.77
- **Schema**: Zod 4.1.11, zod-openapi 5.4.1
- **Database**: Prisma (latest), Postgres (LangGraph default)
- **Logging**: Pino 9.11.0

**Rules**:
- No version upgrades without testing and ADR review
- No new libraries without evaluating fit against existing dependencies
- Justify exceptions in `docs/adr/` with rollback timeline if temporary

**Rationale**: Version lock ensures reproducibility and avoids breaking changes mid-phase. The stack balances LangGraph ecosystem requirements (OpenAI-compatible APIs, Postgres checkpointing) with hobby-friendly deployment (Docker Compose). ADRs document trade-offs for future maintainers and LLM agents.

### VI. Configuration Over Hardcoding

External dependencies (LLMs, storage, networking) MUST remain swappable via configuration.

**Rules**:
- LLM endpoints must accept OpenAI-compatible APIs (default: DeepInfra)
- Database connections must use environment variables and Prisma schema
- Feature flags and hot-path memory limits (`LANGMEM_HOTPATH_LIMIT`, `LANGMEM_HOTPATH_TOKEN_BUDGET`) configurable via `.env`
- Avoid hardcoded URLs, API keys, or service assumptions in source code

**Rationale**: Single-operator deployments vary widely in infrastructure preferences. Configurable endpoints enable experimentation (local vs. cloud LLMs) and cost optimization. Swappable storage supports future migrations (e.g., Postgres → Turso) without core rewrites.

### VII. Operator-Centric Design

Architecture and UX decisions MUST optimize for single-operator, self-hosted hobby deployments.

**Rules**:
- Docker Compose remains the primary deployment story across all phases
- Authentication/authorization deferred (reverse proxy hardening assumed)
- Memory editing must feel safe, reversible, and provide clear feedback
- Documentation must enable onboarding in hours, not days
- Performance targets match hobby scale (not enterprise SLAs)

**Rationale**: The mission explicitly targets hobbyist operators, not multi-tenant SaaS. Overengineering auth, scaling, or high-availability features violates YAGNI and complicates setup. Operator trust requires reversible actions and transparent feedback loops.

## Development Workflow & Quality Gates

**Before starting any implementation**:
1. Read the roadmap (`docs/mission.md`), tech stack (`docs/tech-stack.md`), best practices (`docs/best-practices.md`), and code style (`docs/code-style.md`)
2. Verify the feature aligns with the current phase scope
3. Check the constitution for applicable principles

**During implementation**:
1. Write or update tests alongside behavior changes (Principle III, IV)
2. Run the hygiene loop after every significant change (Principle I)
3. Keep commits small and focused (Principle IV)
4. Document API or flow changes in `docs/` (Principle II)

**Before merging**:
1. All hygiene steps pass (`pnpm lint`, `pnpm format:write`, `pnpm test`)
2. Integration tests cover new API endpoints or graph flows
3. Documentation updated (README, ADRs, phase specs)
4. Constitution compliance verified (no unapproved stack changes, no `any` types, configuration exposed)

**After merging**:
1. Monitor for regressions in subsequent development
2. Update ADRs if decisions evolve
3. Sync templates (plan, spec, tasks) if constitution principles change

## Governance

**Authority**: This constitution supersedes all other practices, style guides, or informal conventions. When conflicts arise, constitution principles take precedence.

**Amendments**:
- Require explicit documentation in this file
- Must include version bump (semantic versioning: MAJOR for breaking principle removals, MINOR for additions, PATCH for clarifications)
- Trigger sync validation across templates (plan, spec, tasks, commands)
- Follow-up actions documented in Sync Impact Report (HTML comment prepended to this file)

**Compliance**:
- LLM agents (`AGENTS.md`) MUST reference this constitution before coding
- All implementations must verify alignment with Core Principles
- Deviations require ADR justification and timeline to restore compliance
- Use `docs/best-practices.md`, `docs/code-style.md`, and `docs/tech-stack.md` for detailed runtime guidance

**Reviews**:
- Constitution reviewed at each phase transition (Phase 1→2, 2→3, etc.)
- Principles tested against actual development friction; prune or refine as needed
- Versioning and amendment history preserved in git commits

**Version**: 1.0.0 | **Ratified**: 2025-10-07 | **Last Amended**: 2025-10-07