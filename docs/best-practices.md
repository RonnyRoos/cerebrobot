# Engineering Best Practices

## Purpose & Audience
This guide speaks directly to Cerebrobot's LLM teammates. Follow these rules to keep the codebase predictable, maintainable, and aligned with the human cadence before, during, and after every significant implementation step.

## Development Cadence
- Treat "major code step" as any change that alters behavior, adds a public type, or modifies dependencies.
- After each step, run the full hygiene loop locally in this order: `pnpm lint` → `pnpm format:write` → `pnpm test`.
- Do not stack more than one failing command; fix issues before continuing. Record rationale for intentional skips in commit messages or ADRs.
- Keep commits small, each representing a fully linted, formatted, and tested unit of work.

## Testing Expectations
- Focus on coverage on deterministic unit tests for LangGraph nodes, memory mutations, and configuration parsers.
- Prefer real implementations over heavy mocks; use lightweight fakes when isolating external services.
- When fixing a bug, add or update a test that fails before the fix and passes afterward.
- Keep `test/` utilities minimal and shared; remove dead fixtures quickly to avoid drift.

## Linting & Formatting Discipline
- ESLint enforces code quality; never commit with outstanding warnings or `eslint-disable` comments without explicit justification.
- Prettier owns formatting; rely on `pnpm format:write` or editor integrations instead of manual whitespace tweaks.
- Sync config changes between local `.eslintrc`, `.prettierrc`, and CI scripts immediately to avoid divergence.
- Treat new lint rules as opt-out by exception only; if a rule is noisy, propose adjustments via ADR rather than ignoring per file.

## Setup & Automation Alignment
- Mirror CI locally: run the same pnpm scripts that GitHub Actions executes (`lint`, `format:check`, `test`).
- Keep Docker Compose definitions up to date with env files and scripts so local runs match deployment behavior.
- Automate repetitive hygiene with pre-commit hooks (lefthook or husky) to catch regressions before they reach PR review.
- Document any temporary deviations from the automated pipeline in `docs/adr/` with a timeline to revert.

## Guiding Principles
- **KISS**: Prefer straightforward graph flows and memory manipulations; break complex steps into smaller nodes.
- **YAGNI**: Implement only what Phase 1 needs; record future aspirations in the roadmap or ADRs instead of speculative code.
- **SOLID**: Keep LangGraph nodes focused on single responsibilities; program memory interfaces against abstractions to ease future swaps.
- **DRY**: Centralize shared typings, prompts, and helper utilities; refactor duplicated logic before it spreads across modules.
