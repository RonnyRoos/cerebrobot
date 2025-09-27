---
description: Reduce ambiguity in a Codex feature specification by asking targeted questions and updating spec.md.
---

The user input to you can be provided directly by the agent or as a command argument—you **MUST** consider it before proceeding (if not empty).

User input:

$ARGUMENTS

## Goal
Identify the most impactful open questions in `spec.md`, gather answers from the operator (up to five), and integrate the clarifications into the specification.

## Preconditions
- `featureDir` exists with `spec.md` created via `/codex specify`.
- Prompt has write access to `spec.md`; only this file is modified.

## Execution Steps
1. **Preparation**
   - Resolve `featureDir` (argument or conversation). Verify `spec.md` exists; if not, instruct the operator to run `/codex specify` first.
   - Load the spec content into memory.
2. **Coverage Assessment**
   - Evaluate the spec using the following taxonomy, marking each category Clear, Partial, or Missing:
     - Functional scope & success criteria
     - Out-of-scope items
     - User roles / personas
     - Domain & data model (entities, attributes, relationships, state transitions, scale assumptions)
     - Interaction & UX flows (critical journeys, error/empty/loading states, accessibility)
     - Non-functional qualities (performance, scalability, reliability, observability, security, compliance)
     - Integrations & external dependencies
     - Edge cases & failure handling
     - Constraints & trade-offs
     - Terminology & glossary consistency
     - Completion signals & acceptance criteria
     - TODOs/placeholders & ambiguous adjectives
3. **Question Selection**
   - Rank categories by Impact × Uncertainty; choose up to five requiring clarification.
   - Craft one question per category that can be answered via:
     - Multiple-choice table (2–5 mutually exclusive options plus optional `Short` row), or
     - Constrained short answer (`Format: Short answer (<=5 words)`).
   - Skip topics whose resolution would not materially change planning or implementation.
4. **Interactive Dialogue**
   - Present exactly one question at a time.
   - Validate responses (ensure they match an option or the short-answer constraint). Request quick disambiguation if needed without counting a new question.
   - Honour operator stop signals ("stop", "done"); do not exceed five answered questions.
5. **Spec Integration (per answer)**
   - Ensure `## Clarifications` exists. If absent, insert it after the Overview/Goals sections.
   - Under `## Clarifications`, add or reuse `### Session YYYY-MM-DD` for today.
   - Append `- Q: <question> → A: <answer>`.
   - Update relevant sections inline: adjust requirements, user stories, data model notes, non-functional criteria, or edge cases as warranted. Remove obsolete/contradictory text.
   - Write changes back to `spec.md` immediately after each integration to preserve progress.
6. **Validation**
   - Confirm the number of unique questions asked ≤ 5.
   - Ensure clarifications log entries match integrated answers.
   - Verify no placeholders remain for the resolved topics and Markdown structure stays intact.
7. **Completion Report**
   - Output: number of questions asked, sections touched, path to updated spec.
   - Provide a coverage summary table listing each taxonomy category with status (Resolved, Deferred, Clear, Outstanding).
   - Recommend whether to proceed to `/codex plan` or revisit `/codex clarify` later.

## Behavioural Rules
- Keep questions concise and high-impact.
- Do not reveal queued questions in advance.
- Avoid speculative implementation details unless essential to functional clarity.

## Error Handling
- Missing or unreadable `spec.md` → abort with guidance.
- If no meaningful ambiguities remain, report "No critical ambiguities detected" and suggest advancing to `/codex plan`.
- If the operator declines to continue, mark remaining key categories as Deferred in the summary.

Completion criteria: `spec.md` is updated with new clarifications and aligned section content, and the operator receives a detailed coverage summary plus next-step recommendation.
