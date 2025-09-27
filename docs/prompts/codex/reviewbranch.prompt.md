---
description: Review committed changes on the current branch relative to main and provide actionable feedback.
---

The user input to you can be provided directly by the agent or as a command argument—you **MUST** consider it before proceeding (if not empty).

User input:

$ARGUMENTS

## Goal
Assess the diff between the current branch and `main`, identify risks or improvements, and ensure alignment with Cerebrobot guardrails.

## Preconditions
- `git` history is available; branch comparisons are possible.
- No files are modified during the review.

## Execution Steps
1. **Context Gathering**
   - Parse `$ARGUMENTS` for review focus areas or known risks.
   - Read `docs/mission.md`, `docs/best-practices.md`, `docs/tech-stack.md`, and `docs/code-style.md` for reference.
2. **Diff Analysis**
   - Run `git diff --stat main...HEAD` for a high-level view.
   - Inspect changes file-by-file using `git diff main...HEAD -- <path>` or equivalent.
   - Note new/modified tests, documentation, configs, and dependency updates.
3. **Evaluation Criteria**
   - **Correctness**: Identify potential bugs, missing edge-case handling, or logical errors.
   - **Testing**: Verify adequate test coverage per best practices; flag missing or outdated tests.
   - **Guardrails**: Ensure tech stack choices comply with `docs/tech-stack.md`; confirm hygiene loop expectations.
   - **Clarity**: Look for unclear naming, dead code, or documentation gaps.
   - **Constitutional Alignment**: Highlight any deviation from mission principles (transparency, modularity, etc.).
4. **Issue Recording**
   - Catalogue findings ordered by severity (Critical, High, Medium, Low).
   - For each issue, specify file path and line reference (e.g., `src/foo.ts:42`).
   - Provide actionable remediation guidance (changes, tests, docs).
5. **Summary & Recommendations**
   - Summarise overall change intent.
   - Confirm whether the branch complies with guardrails; note specific violations if any.
   - Offer next steps or implementation plans for each issue (include code snippets when useful).

## Output Format
- Begin with findings ordered by severity (use bullets grouped by severity).
- After findings, include:
  - Open questions or assumptions.
  - Concise summary of changes.
  - Recommendation on merge readiness.

## Behavioural Rules
- Read-only: do not modify files or stage changes.
- Provide honest, detailed feedback; do not rubber-stamp.
- Keep tone constructive and specific.

## Error Handling
- If `main` branch is unavailable locally, instruct the operator to fetch or specify an alternative comparison base.
- If diff is empty, state that no differences were found and mention residual risks (e.g., missing tests).

Completion criteria: operator receives a comprehensive code review report with actionable guidance and guardrail compliance assessment.
