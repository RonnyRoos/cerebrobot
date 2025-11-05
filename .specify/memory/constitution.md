<!--
SYNC IMPACT REPORT
==================
Version change: 1.2.0 → 1.3.0
Action: Add Design Library First principle to enforce component reuse and consistency

Added principles:
- IX. Design Library First: New principle mandating @workspace/ui component usage and contribution workflow

Modified principles:
- None (existing principles unchanged, renumbering only)

Sections modified:
- Core Principles: Added Principle IX after MCP Server Utilization
- Development Workflow & Quality Gates: "During implementation" now references design library check

Added stack requirements:
- @workspace/ui design library (Neon Flux theme, ShadCN UI-based primitives)
- Storybook 10.0.2+ for component documentation at http://localhost:6006
- Tailwind CSS 3.4.15+ with custom design tokens

Runtime guidance docs requiring updates:
- ⚠ docs/tech-stack.md: Should document @workspace/ui, Storybook, Tailwind, CVA versions
- ⚠ AGENTS.md: Should reference design library workflow in coding expectations
- ⚠ docs/code-style.md: Should include component composition patterns

Templates requiring updates:
- ✅ plan-template.md: No changes needed (generic principle checks)
- ✅ spec-template.md: No changes needed (implementation agnostic)
- ✅ tasks-template.md: Could reference design library contribution tasks in component work

Follow-up actions:
- Update docs/tech-stack.md to include design library stack (Tailwind, CVA, Storybook)
- Update AGENTS.md to document "check design library first, contribute missing components" workflow
- Update docs/code-style.md with component composition examples

Rationale for version 1.3.0 (MINOR):
- New principle added (Design Library First) with concrete workflow and anti-patterns
- Material guidance expansion enforcing component reuse over ad-hoc UI code
- Not breaking (MAJOR): existing code remains valid, new principle constrains future development
- Not patch (PATCH): substantive new workflow requirement, formalized design system discipline
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

Code MUST be type-safe, dependency-injected, and testable using a pragmatic 3-tier testing strategy.

**Type Safety Rules**:
- `any` type is forbidden; start from `unknown` and narrow explicitly
- Use `interface` for cross-module contracts; `type` for unions and aliases
- Model state machines with discriminated unions, not boolean flags
- Inject dependencies (LLM clients, stores) via parameters or constructors
- Prefer pure functions for graph logic; isolate I/O in adapters

**Testing Strategy (3 Tiers)**:

1. **Unit tests** (primary coverage mechanism)
   - Test LangGraph nodes, memory operations, configuration parsers with deterministic inputs/outputs
   - Mock external services only when necessary; prefer lightweight fakes (e.g., fixed embeddings for vector tests)
   - Write tests that validate behavior, not implementation details

2. **Postgres validation test** (infrastructure verification)
   - ONE test file that validates: DB schema, migrations, pgvector index using real Postgres
   - Uses test database with mocked embeddings (deterministic, no API costs)
   - Ensures persistence layer works correctly without testing every feature

3. **Manual smoke tests** (real-world validation)
   - Pre-deployment checklist validating real LLM behavior, real embeddings, real semantic search
   - Documents steps to verify integration with external APIs (DeepInfra, OpenAI)
   - Catches issues that mocked tests cannot detect

**Anti-Patterns to Avoid**:
- Do NOT create "integration tests" that mock LLMs or embeddings—they cannot validate the behavior they claim to test
- Do NOT test real API calls in automated suites (slow, expensive, flaky, breaks CI)
- Do NOT write redundant tests that duplicate coverage (e.g., multiple Postgres tests)

**Rationale**: Type safety catches errors at compile time. Dependency injection enables testing without production services. The 3-tier strategy balances automation (unit tests pass in CI), infrastructure validation (Postgres test ensures schema works), and real-world behavior (manual smoke tests before deployment) without creating pseudo-integration tests that heavily mock the very components they claim to integrate.

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
- **HTTP**: Fastify 5.6.1, @fastify/websocket 11.2.0
- **LangGraph**: @langchain/langgraph 0.4.9, langchain 0.3.34, @langchain/core 0.3.77
- **Schema**: Zod 4.1.11, zod-openapi 5.4.1
- **Database**: Prisma (latest), Postgres (LangGraph default)
- **Logging**: Pino 9.11.0

**Rules**:
- No version upgrades without testing and decision documentation review
- No new libraries without evaluating fit against existing dependencies
- Justify exceptions in `docs/decisions/` (ADRs, TDRs) with rollback timeline if temporary

**Rationale**: Version lock ensures reproducibility and avoids breaking changes mid-phase. The stack balances LangGraph ecosystem requirements (OpenAI-compatible APIs, Postgres checkpointing) with hobby-friendly deployment (Docker Compose). Decision documents record trade-offs for future maintainers and LLM agents.

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

### VIII. MCP Server Utilization

LLM agents MUST leverage available Model Context Protocol (MCP) servers to enhance productivity, reduce errors, and access specialized tooling.

**Available MCP Servers (Priority Order)**:

1. **SequentialThinking** (PRIMARY - complex task decomposition)
   - MUST use for multi-step planning, architectural decisions, and complex problem-solving
   - Enables structured reasoning with revision capabilities and hypothesis validation
   - Provides thought branching for exploring alternative approaches
   - Use when: analyzing requirements, designing features, debugging complex issues, breaking down ambiguous tasks

2. **Context7** (PRIMARY - framework/library documentation)
   - MUST use before implementing features requiring external library knowledge
   - Provides up-to-date documentation for libraries (LangChain, LangGraph, Fastify, React, Zod, Prisma, etc.)
   - Use when: uncertain about API signatures, exploring framework capabilities, validating usage patterns
   - Always resolve library ID before calling get-library-docs unless user provides explicit ID

3. **Serena** (PRIMARY - semantic code analysis/modification)
   - MUST use for large-scale code navigation, refactoring, and symbol-based operations
   - Provides language-server capabilities: find symbols, references, definitions, rename operations
   - Enables precise code modifications without reading entire files
   - Use when: navigating unfamiliar code, renaming across codebase, finding usages, understanding symbol relationships
   - Prefer symbolic tools over grep/read_file for code understanding

4. **Playwright** (SPECIALIZED - UI debugging)
   - SHOULD use when automatically debugging UI issues, testing frontend flows, or capturing screenshots
   - Provides browser automation for visual verification and interaction testing
   - Use when: UI bugs reported, validating user flows, capturing error states, debugging WebSocket connections
   - Complement manual testing, don't replace it entirely

5. **Memory** (SPECIALIZED - knowledge persistence)
   - MAY use for storing project-specific learnings, architectural decisions, or operator preferences
   - Enables cross-session knowledge retention via knowledge graph
   - Use when: documenting non-obvious patterns, tracking recurring issues, preserving context between sessions

**Usage Rules**:
- Always consult SequentialThinking for tasks requiring >3 sequential steps or architectural decisions
- Query Context7 before implementing with unfamiliar libraries (avoid outdated assumptions)
- Use Serena for code navigation instead of grep + manual file reading (faster, more accurate)
- Leverage Playwright for UI issue reproduction before proposing blind fixes
- Document MCP server usage in complex workflows for auditability

**Anti-Patterns to Avoid**:
- Do NOT skip SequentialThinking for complex tasks—unstructured reasoning leads to incomplete solutions
- Do NOT guess at API signatures when Context7 can provide authoritative documentation
- Do NOT read entire files when Serena's symbol tools can precisely locate target code
- Do NOT propose UI fixes without Playwright verification when browser automation is available
- Do NOT lose context across sessions when Memory can preserve critical knowledge

**Rationale**: MCP servers provide specialized capabilities that reduce errors, improve efficiency, and enable sophisticated workflows beyond basic file operations. SequentialThinking prevents incomplete multi-step solutions. Context7 ensures implementation follows current library conventions. Serena enables surgical code changes without excessive file reading. Playwright catches UI regressions that unit tests miss. Memory preserves institutional knowledge across sessions. Mandating their use where applicable prevents LLM agents from defaulting to less effective manual approaches.

### IX. Design Library First

All UI components MUST use the `@workspace/ui` design library. Missing components MUST be added to the library before use.

**Design Library Stack**:
- **Package**: `@workspace/ui` (monorepo package at `/packages/ui/`)
- **Theme**: Neon Flux (glassmorphism, gradients, glows) with dark/light/high-contrast modes
- **Primitives**: Box, Stack, Text, Button (composable, token-driven)
- **Foundation**: ShadCN UI patterns + Tailwind CSS 3.4.15+ + CVA (class-variance-authority)
- **Documentation**: Storybook 10.0.2+ at `http://localhost:6006` (run `pnpm storybook`)
- **Tokens**: Three-tier system (primitives → semantic → component) in `/packages/ui/src/theme/tokens/`

**Workflow (NON-NEGOTIABLE)**:
1. **Check design library first** — Browse Storybook at `http://localhost:6006` or search `/packages/ui/src/` for existing components
2. **Reuse existing components** — Use Box, Stack, Text, Button primitives to compose layouts; import from `@workspace/ui`
3. **If component missing** — Add it to `/packages/ui/src/components/` following existing patterns (polymorphic, token props, CVA variants)
4. **Document in Storybook** — Create `.stories.tsx` file in `/packages/ui/src/stories/` with interactive examples
5. **Test thoroughly** — Add unit tests (`/packages/ui/__tests__/components/`) and accessibility tests (axe-core)
6. **Then use in app** — Import from `@workspace/ui` in `/apps/client/` or `/apps/server/`

**Rules**:
- Do NOT create one-off UI components in `/apps/client/src/components/` if they could be generalized
- Do NOT use inline Tailwind classes for complex styling; extract to design library components with proper variants
- Do NOT hardcode colors/spacing; use design tokens (`--color-accent-primary`, `--space-4`, etc.)
- Do NOT skip Storybook documentation; undocumented components become unmaintainable
- All design library changes MUST pass hygiene loop (`pnpm lint`, `pnpm format:write`, `pnpm test`)

**Component Contribution Checklist**:
- [ ] Component file in `/packages/ui/src/components/` (e.g., `card.tsx`)
- [ ] TypeScript types exported (props interface, ref forwarding if needed)
- [ ] CVA variants for visual variations (size, variant, state)
- [ ] Token-driven styling (colors from semantic tokens, spacing from `--space-*`)
- [ ] Polymorphic `as` prop if appropriate (render as different HTML elements)
- [ ] Unit tests in `/packages/ui/__tests__/components/`
- [ ] Accessibility tests with axe-core validation
- [ ] Storybook stories in `/packages/ui/src/stories/` (at least 3 variants)
- [ ] Exported from `/packages/ui/src/index.ts`
- [ ] Used in at least one app to validate real-world usage

**Anti-Patterns to Avoid**:
- Do NOT create `/apps/client/src/components/ui/` directory—design library is `/packages/ui/`
- Do NOT copy-paste ShadCN UI components directly—adapt to Neon Flux theme and token system
- Do NOT mix design systems—stick to Neon Flux aesthetic (gradients, glassmorphism, glows)
- Do NOT skip tests for "simple" components—accessibility issues hide in trivial code
- Do NOT use external component libraries (Material-UI, Chakra, etc.) without ADR justification

**Rationale**: Centralized design library ensures visual consistency, reduces code duplication, and accelerates development by providing battle-tested primitives. The Storybook-driven workflow prevents undocumented components and enables interactive exploration. Token-based theming supports dark/light modes without scattered color logic. The "add then use" workflow treats the design library as first-class infrastructure, not an afterthought, ensuring every component is tested, documented, and reusable across features.

## Development Workflow & Quality Gates

**Before starting any implementation**:
1. Read the roadmap (`docs/mission.md`), tech stack (`docs/tech-stack.md`), best practices (`docs/best-practices.md`), and code style (`docs/code-style.md`)
2. Verify the feature aligns with the current phase scope
3. Check the constitution for applicable principles
4. **Use SequentialThinking MCP server to plan multi-step tasks** (Principle VIII)
5. **Query Context7 MCP server for framework/library documentation if uncertain** (Principle VIII)

**During implementation**:
1. Write or update tests alongside behavior changes (Principle III, IV)
2. Run the hygiene loop after every significant change (Principle I)
3. Keep commits small and focused (Principle IV)
4. Document API or flow changes in `docs/` (Principle II)
5. **Check design library (`@workspace/ui`) before creating UI components; contribute missing components first** (Principle IX)
6. **Use Serena MCP server for code navigation and refactoring** (Principle VIII)
7. **Use Playwright MCP server for UI debugging when applicable** (Principle VIII)

**Before merging**:
1. All hygiene steps pass (`pnpm lint`, `pnpm format:write`, `pnpm test`)
2. Unit tests cover new behavior; Postgres validation test updated if schema changed; manual smoke test checklist updated if new external integrations added
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

**Version**: 1.3.0 | **Ratified**: 2025-10-07 | **Last Amended**: 2025-11-03