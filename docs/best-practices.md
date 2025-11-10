# Engineering Best Practices

## Purpose & Audience
This guide speaks directly to Cerebrobot's LLM teammates. Follow these rules to keep the codebase predictable, maintainable, and aligned with the human cadence before, during, and after every significant implementation step.

## Development Cadence
- Treat "major code step" as any change that alters behavior, adds a public type, or modifies dependencies.
- After each step, run the full hygiene loop locally in this order: `pnpm lint` → `pnpm format:write` → `pnpm test`.
- Do not stack more than one failing command; fix issues before continuing. Record rationale for intentional skips in commit messages or ADRs.
- Keep commits small, each representing a fully linted, formatted, and tested unit of work.

## Testing Expectations
- **Unit tests first**: Focus coverage on deterministic unit tests for LangGraph nodes, memory mutations, and configuration parsers.
- **One Postgres validation test**: Create a single test file that validates DB schema, migrations, and pgvector using **a separate test PostgreSQL container** (not production) with mocked embeddings (deterministic, no API costs).
  - **CRITICAL**: Test database MUST run in separate Docker container to prevent production contamination
  - **Architecture**: 
    - Production: `postgres` service → localhost:5432 → `cerebrobot` database
    - Test: `postgres-test` service → localhost:5434 → `cerebrobot_test` database
  - **Setup workflow**:
    1. Start test database: `./scripts/start-test-db.sh`
    2. Run tests: `pnpm test`
    3. Stop test database: `./scripts/stop-test-db.sh`
  - **Why separate containers?**
    - Clean logs: test errors don't appear in production postgres logs
    - Resource isolation: independent connection pools, memory, and process space
    - Independent lifecycle: restart/debug test DB without affecting production
  - Use `DATABASE_URL_TEST` and `LANGGRAPH_PG_URL_TEST` environment variables (port 5434)
  - Tests automatically skip if test database URLs are not configured
  - Expected: `docker logs cerebrobot-postgres-test-1` will show ~3 duplicate key errors from constraint validation tests (this is correct)
- **Manual smoke tests**: Validate real LLM behavior, real embeddings, and real semantic search accuracy manually before deployment (checklist in tasks).
- **Avoid pseudo-integration tests**: Don't create "integration" tests that mock the LLM or embeddings—they can't validate the behavior they claim to test.
- **Mock philosophy**: Prefer real implementations over heavy mocks; use lightweight fakes when isolating external services (e.g., fixed embeddings for vector tests).
- **Regression tests**: When fixing a bug, add or update a test that fails before the fix and passes afterward.
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
- Document any temporary deviations from the automated pipeline in `docs/decisions/` (ADRs, TDRs, or incident reports) with a timeline to revert.

## Guiding Principles
- **KISS**: Prefer straightforward graph flows and memory manipulations; break complex steps into smaller nodes.
- **YAGNI**: Implement only what Phase 1 needs; record future aspirations in the roadmap or decision documents instead of speculative code.
- **SOLID**: Keep LangGraph nodes focused on single responsibilities; program memory interfaces against abstractions to ease future swaps.
- **DRY**: Centralize shared typings, prompts, and helper utilities; refactor duplicated logic before it spreads across modules.
