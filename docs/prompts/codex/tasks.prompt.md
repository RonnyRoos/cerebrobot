---
description: Generate an actionable, dependency-ordered tasks.md for a feature using Codex-native workflows.
---

The user input to you can be provided directly by the agent or as a command argument—you **MUST** consider it before proceeding (if not empty).

User input:

$ARGUMENTS

## Goal
Create `tasks.md` inside `docs/specs/<NNN>-<slug>/` that breaks the feature into numbered tasks aligned with the plan, ready for incremental execution by Codex agents.

## Preconditions
- `featureDir` exists and contains `spec.md` and `plan.md` produced by the Codex prompts.
- Optional supporting artefacts such as `research.md`, `data-model.md`, `contracts/`, or `quickstart.md` may exist; incorporate them when present.

## Execution Steps
1. **Load Artefacts**
   - Resolve `featureDir` (argument or conversation) and verify `plan.md` exists; abort if missing.
   - Read:
     - `plan.md` (required)
     - `spec.md` (for cross-reference)
     - `data-model.md` (if present)
     - Each file under `contracts/` (if the directory exists)
     - `quickstart.md` (if present)
     - Any operator context from `$ARGUMENTS`
2. **Identify Work Streams**
   - Extract phases, components, and dependencies from `plan.md`.
   - Enumerate required tests (unit, integration, contract) and supporting documentation tasks.
   - Determine file-level touchpoints (e.g., new services, tests, docs).
3. **Construct Task List**
   - Use the following template to create `tasks.md`:

```
# Task Plan

## Feature
- Directory: docs/specs/<NNN>-<slug>
- Inputs: spec.md, plan.md [plus additional artefacts]

## Execution Guidelines
- Run hygiene loop after significant changes (`pnpm lint`, `pnpm format:write`, `pnpm test`).
- Follow TDD: author failing tests before implementing behaviour when feasible.

## Tasks

1. **Setup & Environment**
   - T001 — [description] (files, dependencies)
   - ...
2. **Tests**
   - T00X [P] — [pre-implementation tests]
   - ...
3. **Core Implementation**
   - T00Y — [...]
4. **Integration**
   - ...
5. **Polish & Documentation**
   - ...

## Parallel Execution Notes
- Detail which `[P]` tasks can run concurrently and why (different files/services).

## Dependency Summary
- Bullet list of critical dependencies (e.g., "T003 depends on T002 schema updates").
```

   - Number tasks sequentially (`T001`, `T002`, ...).
   - Mark tasks that can run in parallel with `[P]` suffix.
   - Reference files/directories to edit or create.
   - For contracts or tests derived from plan artefacts, include explicit commands or instructions.
4. **Validation**
   - Ensure every functional and non-functional requirement from the spec has at least one corresponding task.
   - Confirm tests precede implementation tasks affecting the same files.
   - Verify hygiene loop reminder appears prominently.
5. **Output Summary**
   - Report total tasks, count of `[P]` tasks, and advise running `/codex analyze` after `/codex tasks` when ready.

## Behavioural Rules
- Write only to `featureDir/tasks.md`.
- Keep tasks specific enough for an LLM to act without additional context.
- Avoid referencing unavailable scripts or infrastructure.

## Error Handling
- Missing plan or spec → abort with instructions to run preceding prompts.
- If required supporting artefacts are absent (e.g., promised contracts), note the gap in the output summary and suggest updating the plan.

Completion criteria: `tasks.md` exists with an ordered, dependency-aware task list covering setup, tests, core work, integration, and polish, and the operator receives a concise summary plus recommended next steps.
