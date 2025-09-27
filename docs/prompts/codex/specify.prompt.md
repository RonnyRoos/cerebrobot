---
description: Create a new feature specification inside docs/specs/ using only Codex CLI capabilities.
---

The user input to you can be provided directly by the agent or as a command argument—you **MUST** consider it before proceeding (if not empty).

User input:

$ARGUMENTS

## Goal
Turn the feature description into a ready-to-edit specification at `docs/specs/<NNN>-<slug>/spec.md`, establishing the working directory for all downstream prompts.

## Preconditions
- You are operating from the repository root.
- `docs/specs/` exists (create it if missing).
- Feature description is non-empty; if empty, request clarification.

## Execution Steps
1. **Resolve Inputs**
   - Treat `$ARGUMENTS` (or the direct user message) as the canonical feature description.
   - Derive a succinct feature title (≤8 words) and slug:
     - Normalise to lowercase.
     - Replace non alphanumeric characters with spaces.
     - Collapse whitespace, trim, and join with hyphens.
     - Limit slug to ≤5 hyphenated words.
2. **Determine Feature Directory**
   - List existing directories matching `docs/specs/<NNN>-*`.
   - Extract the highest numeric prefix; the new feature id is `highest + 1`, zero padded to three digits (e.g., `004`).
   - Construct `featureDir = docs/specs/<id>-<slug>`; create the directory.
3. **Create spec.md**
   - Generate `spec.md` inside `featureDir` with the following template (replace tokens in brackets):

```
# [Feature Title]

## Overview
Summarise the feature goals in 2–3 sentences based on the description.

## Goals
- Bullet list of primary objectives inferred from the description.

## Non-Goals
- Enumerate explicit exclusions or assumptions (include "None yet" if unknown).

## Functional Requirements
- Capture concrete behaviours the system must provide.

## Non-Functional Requirements
- Document performance, reliability, observability, or security expectations known so far.

## User Stories
- Format each as "As a <role>, I want <action> so that <outcome>".

## Edge Cases
- Note potential error paths or tricky scenarios; include "None identified" if empty.

## Open Questions
- List uncertainties that need clarification before planning.

## Clarifications
### Session [YYYY-MM-DD]
- Pending clarification.

## References
- docs/mission.md
- docs/best-practices.md
- docs/tech-stack.md
```

   - Populate sections with concrete bullets derived from the description. When information is missing, add actionable TODO-style placeholders (e.g., "TBD: operator confirmation of retention policy").
4. **Output Summary**
   - Report the new feature id, directory, spec path, and next suggested command (`/codex clarify`).

## Behavioural Rules
- Write files only inside the new feature directory.
- Use plain Markdown; do not insert YAML front matter into the spec itself.
- Keep wording concise and implementation-neutral.

## Error Handling
- If directory creation fails, stop and surface the error.
- If slug generation produces an empty result, prompt the user for a clearer description.

Completion criteria: `spec.md` exists with all sections present and populated, and the operator receives a summary with the recommended next step.
