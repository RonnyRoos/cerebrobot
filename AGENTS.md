# AGENTS.md

## Setup commands
- `pnpm install` — install dependencies for the entire workspace.
- `pnpm lint` → `pnpm format:write` → `pnpm test` — run the hygiene loop after every significant change ([Engineering Best Practices](docs/best-practices.md)).
- `pnpm dev` — bring up the LangGraph prototype once implemented.

## MCP servers
- Configure your coding agent (Claude Desktop, Codex CLI, GitHub Copilot, etc.) with the following MCP servers to unlock critical development capabilities.
- **SequentialThinking** (PRIMARY - MUST use): Complex multi-step task decomposition, hypothesis validation, structured reasoning
  - Install: `npx -y @modelcontextprotocol/server-sequential-thinking`
  - Use for: Code reviews, refactoring plans, debugging complex issues, feature implementation planning
  - Anti-pattern: Skipping this for multi-step tasks leads to incomplete solutions
- **Context7** (PRIMARY - MUST use): Real-time framework/library documentation
  - Config: `https://context7.liam.sh/mcp` (streamable-http transport)
  - Use for: LangChain, React, Prisma, Fastify API verification before implementation
  - Anti-pattern: Making assumptions about APIs without checking latest docs
- **Serena** (PRIMARY - MUST use): Semantic code navigation, symbol search, refactoring operations
  - Use for: Finding symbol definitions, tracking references, precise code edits
  - Anti-pattern: Using grep + manual file reading when symbolic tools are available
- **Playwright** (SPECIALIZED - SHOULD use): UI debugging, visual verification, interaction testing
  - Use for: Testing WebSocket flows, debugging React component behavior, visual regression checks
- **Memory** (SPECIALIZED - MAY use): Knowledge graph for cross-session context persistence
  - Use for: Preserving architecture decisions, codebase patterns, debugging insights
- Treat MCP servers as the default toolbox—consult them before manual searches or file scanning (see Constitution Principle VIII for detailed usage rules).

## Project snapshot
- Cerebrobot is a LangGraph-powered chatbot with an inspectable memory graph aimed at single-operator, Docker Compose deployments ([Mission Statement](docs/mission.md)).
- Phase 1 scope: scaffold the conversational core, expose operator-managed memory read/write, and prove the loop with focused tests ([Mission Statement](docs/mission.md)).
- Future phases add persistence, public APIs, frontend, and multi-agent extensions—design seams with that roadmap in mind without building them prematurely ([Mission Statement](docs/mission.md)).
- Chat transport has migrated to WebSockets (`GET /api/chat/ws`); SSE endpoints were removed, and tests rely on `vitest-websocket-mock`/`mock-socket` for client flows.

## Client-side state persistence

Cerebrobot uses browser `localStorage` to persist UI state across sessions:

### Navigation State
**Key**: `cerebrobot:navigation-state`
**Structure**:
```typescript
{
  isSidebarExpanded: boolean;  // Sidebar expansion state (mobile: false, desktop: true default)
  activeRoute: string;          // Current navigation route (e.g., '/chat', '/agents', '/memory')
}
```
**Behavior**:
- Sidebar expansion persists between page reloads
- Mobile (<768px): Sidebar always in bottom nav mode, `isSidebarExpanded` has no visual effect
- Tablet+ (≥768px): Controls sidebar width (48px collapsed ↔ 200px/280px expanded)
- Active route restored on app load for navigation highlighting

### Agent Thread Filter
**Key**: `cerebrobot:agent-filter`
**Structure**:
```typescript
{
  agentId: string;   // UUID of selected agent (from Prisma Agent model)
  agentName: string; // Display name of agent (for UI consistency)
} | null
```
**Behavior**:
- Set when user clicks "Show Threads" from agent card
- Filters thread list to show only threads for selected agent
- Auto-clears if agent is deleted (verified via agent list query)
- Cleared when user clicks "Clear Filter" button in thread list header
- Null state shows all threads across all agents

**Development Notes**:
- Use `useNavigationState()` and `useAgentFilter()` hooks from `apps/client/src/hooks/` for type-safe access
- Don't access localStorage directly; hooks handle serialization and validation
- localStorage keys prefixed with `cerebrobot:` to avoid conflicts with other apps
- Clear state on logout/reset via hooks (they handle cleanup)

## Working cadence for agents
1. Read the roadmap, tech stack, and style guides before coding; keep them open for cross-checks ([Tech Stack Guardrails](docs/tech-stack.md), [Engineering Best Practices](docs/best-practices.md), [TypeScript Code Style](docs/code-style.md)).
2. Use **SequentialThinking** MCP server to plan multi-step tasks and validate approach before implementation (Constitution Principle VIII).
3. Query **Context7** MCP server for framework/library documentation if uncertain about APIs (Constitution Principle VIII).
4. Plan incremental changes that keep memory and conversation flows transparent to the operator.
5. Use **Serena** MCP server for code navigation and refactoring operations (Constitution Principle VIII).
6. Implement with dependency injection and pure functions where possible so graph nodes stay testable ([TypeScript Code Style](docs/code-style.md)).
7. Update or add tests alongside behavior changes; fast-follow with documentation updates under `docs/` when APIs or flows shift ([Engineering Best Practices](docs/best-practices.md)).
8. Use **Playwright** MCP server for UI debugging when testing WebSocket flows or React components (Constitution Principle VIII).
9. Run the hygiene loop in order and address every failure before continuing ([Engineering Best Practices](docs/best-practices.md)).

## Coding & style expectations
- Use the approved Node.js, Fastify, LangGraph, Zod, and Pino versions—justify any deviation in an ADR ([Tech Stack Guardrails](docs/tech-stack.md)).
- Adhere to the TypeScript patterns for exports, typing, and async error handling instead of restating them here ([TypeScript Code Style](docs/code-style.md)).
- Keep commits small, thoroughly linted, and tied to observable behavior; document exceptions via ADRs ([Engineering Best Practices](docs/best-practices.md)).
- **Design Library First** (Constitution Principle IX): All UI components MUST use `@workspace/ui`; missing components MUST be added to the design library before use.
  - **Workflow**: Check Storybook at `http://localhost:6006` → Reuse existing primitives (Box, Stack, Text, Button) → If missing, add to `/packages/ui/src/components/` → Document in Storybook (`.stories.tsx`) → Test (unit + a11y) → Export from `/packages/ui/src/index.ts` → Import from `@workspace/ui` in apps.
  - **Anti-patterns**: Do NOT create one-off UI components in `/apps/client/src/components/` if they could be generalized; do NOT hardcode colors/spacing (use design tokens); do NOT skip Storybook documentation; do NOT mix design systems.
  - See [TypeScript Code Style](docs/code-style.md) for component composition patterns and [Tech Stack Guardrails](docs/tech-stack.md) for Neon Flux theme details.

## Testing & QA
- Mirror CI locally using the `pnpm` scripts referenced in the best practices guide; never merge with failing lint, format, or test runs ([Engineering Best Practices](docs/best-practices.md)).
- Prioritize deterministic tests around LangGraph nodes, memory persistence, and configuration parsing; add regression tests when fixing bugs ([Engineering Best Practices](docs/best-practices.md)).
- Prefer WebSocket-powered fixtures in new tests (`vitest-websocket-mock` for React hooks, route presence assertions on the Fastify side) instead of legacy SSE harnesses.
- When editing memory flows, verify persistence aligns with the Phase 2 plan so future work can extend your implementation ([Mission Statement](docs/mission.md)).

## Knowledge base for agents
- Roadmap & vision: [docs/mission.md](docs/mission.md)
- Tech constraints & approved libraries: [docs/tech-stack.md](docs/tech-stack.md)
- Engineering cadence & QA expectations: [docs/best-practices.md](docs/best-practices.md)
- TypeScript structure & stylistic rules: [docs/code-style.md](docs/code-style.md)
- Decision documentation: [docs/decisions/](docs/decisions/) (ADRs, TDRs, incident reports)
- Constitutional principles & MCP server usage: [.specify/memory/constitution.md](.specify/memory/constitution.md)

Keep this file in sync with the docs above—when they change, update the references or add short notes instead of duplicating their content.
