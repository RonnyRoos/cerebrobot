---
description: Generate an implementation plan for a feature using the Codex workflow.
---

The user input to you can be provided directly by the agent or as a command argument—you **MUST** consider it before proceeding (if not empty).

User input:

$ARGUMENTS

## Goal
Produce `plan.md` (and supporting artefacts when warranted) inside an existing feature directory under `docs/specs/`, aligning with the specification, repository guardrails, and any operator-provided context.

## Preconditions
- `featureDir` exists and contains `spec.md` created by `/codex specify`.
- `spec.md` includes a `## Clarifications` section with at least one dated session **unless** the operator explicitly overrides the requirement (e.g., "proceed without clarifications").

## Execution Steps
1. **Resolve Context**
   - Obtain `featureDir` from the operator (argument or conversation). Validate that `spec.md` exists; abort with guidance if missing.
   - Read `spec.md`, `docs/mission.md`, `docs/tech-stack.md`, and `docs/best-practices.md`.
   - Capture `$ARGUMENTS` as additional planning considerations (tech preferences, constraints, etc.).
2. **Clarification Gate**
   - If `spec.md` lacks `## Clarifications` or only contains placeholders, pause and instruct the operator to run `/codex clarify` unless an explicit override is present.
3. **Create/Overwrite plan.md**
   - Write `featureDir/plan.md` using this structure:

```
# Implementation Plan

## Input
- Feature: [link to spec.md relative path]
- Summary: [1–2 sentences derived from spec overview]
- Additional Context: [summarise user-provided arguments or "None"]

## Architecture & Stack
- Note approved stack assumptions (Fastify, LangGraph, etc.).
- Highlight key architectural decisions or open seams.

## Data Model
- Describe entities, attributes, relationships implied by the spec.
- Reference supporting files (e.g., data-model.md) if created.

## Workflow Phases
1. **Phase 0 – Research** (optional)
   - Purpose: [why research is needed]
   - Deliverables: [anything to capture in research.md]
2. **Phase 1 – Core Implementation**
   - Outline major components and dependencies.
3. **Phase 2 – Validation & Tests**
   - Define testing approach aligned with best practices.
4. **Phase 3 – Polish & Documentation**
   - Capture logging, observability, docs tasks.

## Risks & Mitigations
- List notable risks with mitigation strategies.

## Validation Strategy
- Describe hygiene loop usage (`pnpm lint`, `pnpm format:write`, `pnpm test`).
- Note test coverage expectations (unit, integration, contract).

## Deliverables
- Enumerate files/artifacts expected per phase (e.g., services, tests, docs).

## Open Questions
- Track unresolved decisions for follow-up.

## Supporting Artefacts
- research.md: ["not required" or bullet summary]
- data-model.md: [create if needed; describe content]
- contracts/: [list planned contract specs or "none"]
- quickstart.md: [outline scenarios or "none"]
```

4. **Optional Supporting Files**
   - If the plan references additional artefacts, create them with minimal scaffolding:
     - `research.md`: capture findings, assumptions, and references.
     - `data-model.md`: define entities in Markdown tables.
     - `contracts/<name>.md`: specify API contracts (request/response schemas).
     - `quickstart.md`: document manual test scenarios.
   - Only create files when justified by the spec or operator context; otherwise mark them as "not required" in the plan.
5. **Consistency Checks**
   - Ensure terminology matches the spec.
   - Confirm all planned work respects `docs/tech-stack.md` guardrails.
6. **Output Summary**
   - Report generated files, sections emphasising next steps, and recommend running `/codex tasks`.

## Behavioural Rules
- Modify files only within `featureDir` (and subdirectories such as `contracts/`).
- Keep writing idempotent; reruns should update existing content deterministically.
- Do not fabricate clarifications; rely on the spec.

## Error Handling
- Missing feature directory or spec → abort with instructions to run `/codex specify`.
- Clarification gate failure → warn and stop unless override provided.
- File write errors → surface and halt.

Completion criteria: `plan.md` (and any referenced supporting artefacts) exist with all sections populated and aligned to repository guardrails, and the operator receives a concise summary plus the recommended `/codex tasks` follow-up.
