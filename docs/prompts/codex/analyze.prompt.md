---
description: Perform a read-only consistency and quality analysis across spec.md, plan.md, and tasks.md for a Codex feature.
---

The user input to you can be provided directly by the agent or as a command argument—you **MUST** consider it before proceeding (if not empty).

User input:

$ARGUMENTS

## Goal
Surface inconsistencies, ambiguities, and coverage gaps across the core artefacts in `docs/specs/<NNN>-<slug>/` after `/codex tasks` has produced `tasks.md`.

## Preconditions
- `featureDir` contains `spec.md`, `plan.md`, and `tasks.md`.
- Command runs in strictly read-only mode (no file modifications).

## Execution Steps
1. **Resolve Context**
   - Accept `featureDir` and optional focus notes via `$ARGUMENTS`.
   - Verify required files exist; if any are missing, stop with instructions to run the prerequisite prompt.
2. **Load Reference Material**
   - Read: `spec.md`, `plan.md`, `tasks.md`, `docs/mission.md`, `docs/best-practices.md`, `docs/tech-stack.md`.
3. **Parse Artefacts**
   - `spec.md`: extract Overview, Goals, Functional/Non-Functional requirements, User Stories, Edge Cases, Clarifications.
   - `plan.md`: capture architecture choices, data model notes, phases, validation strategy, risks.
   - `tasks.md`: list tasks with IDs, descriptions, `[P]` markers, phases, referenced files, dependencies.
4. **Build Inventories**
   - Generate requirement slugs (kebab-case) for functional and non-functional items.
   - Map user stories to requirements.
   - Link tasks to requirements/stories by keywords, file references, or explicit mentions.
5. **Detection Passes**
   - **Duplication**: overlapping requirements or tasks.
   - **Ambiguity**: vague adjectives, TODO/TBD placeholders, undefined terms.
   - **Coverage Gaps**: requirements without tasks, tasks without requirements, missing test coverage for non-functional demands.
   - **Inconsistency**: terminology drift, contradictory architecture decisions, misordered dependencies.
   - **Guardrail Violations**: divergence from mission/best-practices/tech-stack (e.g., missing hygiene loop, unsupported libraries).
6. **Severity Assignment**
   - CRITICAL: violates guardrails or leaves baseline functionality uncovered.
   - HIGH: conflicting statements or ambiguous security/performance criteria.
   - MEDIUM: terminology drift, missing non-functional coverage.
   - LOW: minor clarity or style issues.
7. **Produce Report**
   - Output Markdown with:
     - Intro summary.
     - Findings table (`ID`, `Category`, `Severity`, `Location(s)`, `Summary`, `Recommendation`).
     - Coverage summary mapping requirement keys to task IDs and notes.
     - Guardrail issues (if any).
     - Unmapped tasks list (if any).
     - Metrics (total requirements, total tasks, coverage %, ambiguity count, duplication count, critical issues count).
     - "Next Actions" block recommending follow-up commands (e.g., `/codex clarify`, manual spec edits).
8. **Follow-up Question**
   - Ask the operator whether they want suggested remediation edits; never apply changes automatically.

## Behavioural Rules
- Do not alter files.
- Deterministic output: same inputs must yield same findings and IDs.
- Limit findings table to ≤50 rows; summarise overflow if needed.

## Error Handling
- Missing artefacts → stop and provide guidance.
- Empty sections → flag as findings with appropriate severity instead of fabricating content.

Completion criteria: operator receives a structured analysis report and optional remediation offer without any file modifications.
