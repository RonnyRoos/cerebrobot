# TypeScript Code Style

## Purpose & Scope
LLM teammates must follow this guide when writing or editing TypeScript. Formatting and linting are owned by automated tools; the rules below cover structural and stylistic decisions not enforced by those tools.

## Module & File Conventions
- Keep files focused; if a module exceeds one responsibility or becomes hard to scan, split it instead of exceeding arbitrary LOC caps.
- Use named exports by default; reserve default exports for framework-required entry points.
- Prefer absolute import aliases (e.g., `@/memory/store`) over deep relative paths once tooling supports it.
- Group imports: Node built-ins → external packages → internal modules, separated by blank lines.

## Type System Usage
- Favor `interface` for contracts consumed by multiple modules; use `type` for unions, mapped types, or aliases.
- Model state machines with discriminated unions rather than boolean flags.
- Treat `any` as forbidden; start from `unknown` and narrow explicitly.
- Derive literal types from constants (`as const`) to keep enums and message roles in sync.

## Functions & Classes
- Keep functions small and purposeful; extract helpers when branching or side effects multiply.
- Prefer pure functions for graph logic; isolate I/O in adapters or service classes.
- Inject dependencies (LLM clients, stores) via parameters or constructors to simplify testing and swapping implementations.
- Avoid unnecessary classes—favor functions and object literals unless stateful behavior is required.

## Async & Error Handling
- Standardize on `async/await`; avoid mixing with `.then()` chains for readability.
- Surface domain errors with typed error classes or `Result` objects instead of generic `Error` instances when context matters.
- Ensure every `await` lives inside try/catch where failure is expected; propagate errors with context rather than silent fallbacks.
- Close over cancellations and abort signals where possible to keep long-running LangGraph operations interruptible.

## Testing Patterns
- Mirror production import paths in tests; keep test files alongside source files with `.test.ts` suffixes.
- Name tests after observable behavior (`shouldPersistMemorySnapshotOnSuccess`) rather than implementation details.
- Prefer real factories or builders over hand-rolled objects; centralize them under `test/support/`.
- Use Vitest lifecycle hooks sparingly; reset shared state in `beforeEach` to avoid cross-test coupling.

## Comments & Documentation
- Write comments to explain intent, trade-offs, or links to decision documents; delete comments that merely restate obvious code.
- Add TSDoc blocks to exported functions or types when the signature alone does not convey usage.
- Reference decision documents with relative links (`docs/decisions/adr/...`, `docs/decisions/tdr/...`) when extra context is required.
- Capture TODOs with issue numbers (`TODO(#123):`) and avoid leaving anonymous TODOs in shared code.
