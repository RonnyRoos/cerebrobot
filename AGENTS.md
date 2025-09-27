# AGENTS.md

## Setup commands
- `pnpm install` — install dependencies for the entire workspace.
- `pnpm lint` → `pnpm format:write` → `pnpm test` — run the hygiene loop after every significant change ([Engineering Best Practices](docs/best-practices.md)).
- `pnpm dev` — bring up the LangGraph prototype once implemented.

## Project snapshot
- Cerebrobot is a LangGraph-powered chatbot with an inspectable memory graph aimed at single-operator, Docker Compose deployments ([Mission Statement](docs/mission.md)).
- Phase 1 scope: scaffold the conversational core, expose operator-managed memory read/write, and prove the loop with focused tests ([Mission Statement](docs/mission.md)).
- Future phases add persistence, public APIs, frontend, and multi-agent extensions—design seams with that roadmap in mind without building them prematurely ([Mission Statement](docs/mission.md)).

## Working cadence for agents
1. Read the roadmap, tech stack, and style guides before coding; keep them open for cross-checks ([Tech Stack Guardrails](docs/tech-stack.md), [Engineering Best Practices](docs/best-practices.md), [TypeScript Code Style](docs/code-style.md)).
2. Plan incremental changes that keep memory and conversation flows transparent to the operator.
3. Implement with dependency injection and pure functions where possible so graph nodes stay testable ([TypeScript Code Style](docs/code-style.md)).
4. Update or add tests alongside behavior changes; fast-follow with documentation updates under `docs/` when APIs or flows shift ([Engineering Best Practices](docs/best-practices.md)).
5. Run the hygiene loop in order and address every failure before continuing ([Engineering Best Practices](docs/best-practices.md)).

## Coding & style expectations
- Use the approved Node.js, Fastify, LangGraph, Zod, and Pino versions—justify any deviation in an ADR ([Tech Stack Guardrails](docs/tech-stack.md)).
- Adhere to the TypeScript patterns for exports, typing, and async error handling instead of restating them here ([TypeScript Code Style](docs/code-style.md)).
- Keep commits small, thoroughly linted, and tied to observable behavior; document exceptions via ADRs ([Engineering Best Practices](docs/best-practices.md)).

## Testing & QA
- Mirror CI locally using the `pnpm` scripts referenced in the best practices guide; never merge with failing lint, format, or test runs ([Engineering Best Practices](docs/best-practices.md)).
- Prioritize deterministic tests around LangGraph nodes, memory persistence, and configuration parsing; add regression tests when fixing bugs ([Engineering Best Practices](docs/best-practices.md)).
- When editing memory flows, verify persistence aligns with the Phase 2 plan so future work can extend your implementation ([Mission Statement](docs/mission.md)).

## Knowledge base for agents
- Roadmap & vision: [docs/mission.md](docs/mission.md)
- Tech constraints & approved libraries: [docs/tech-stack.md](docs/tech-stack.md)
- Engineering cadence & QA expectations: [docs/best-practices.md](docs/best-practices.md)
- TypeScript structure & stylistic rules: [docs/code-style.md](docs/code-style.md)

Keep this file in sync with the docs above—when they change, update the references or add short notes instead of duplicating their content.
