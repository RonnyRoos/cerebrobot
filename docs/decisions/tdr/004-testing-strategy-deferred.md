# TDR 004: Testing Strategy - Phased Approach (Integration First, Unit Later)

## Status
Accepted (2025-10-08), Amended (2025-10-09)

## Context

During implementation of thread discovery and history retrieval (Phase 3-4), we discovered and fixed several critical bugs:

1. **Thread Discovery Bug**: LangGraph checkpoints store state in `channel_values`, not at top level
2. **System Message Leakage**: System messages (memory injection) were being shown to users

These fixes were made incrementally during feature implementation. The question arose: should we write unit tests for ThreadService immediately, or defer to Phase 7 as originally planned?

## Decision

**Defer comprehensive ThreadService unit tests to Phase 7 (tasks T033-T034)** as originally planned in the spec.

## Rationale

### 1. Spec Alignment
The tasks document explicitly schedules unit tests for Phase 7:
- T033: Unit tests for `ThreadService.listThreads`
- T034: Unit tests for `ThreadService.getThreadHistory`

### 2. Current Validation Is Sufficient
The current implementation is validated by:
- ✅ **60 existing tests pass** (including postgres-validation.test.ts)
- ✅ **Manual testing confirmed** thread list, history, and filtering work correctly
- ✅ **Integration validated** via real API calls and UI interaction
- ✅ **Hygiene loop passes** (lint, format, test)

### 3. Bug Fixes vs. Regressions
Best practices say: "When fixing a bug, add or update a test that fails before the fix and passes afterward."

However, our fixes were:
- **Discoveries during implementation**, not regressions in existing functionality
- **Architecture corrections** based on understanding LangGraph checkpoint structure
- **Feature enhancements** (filtering system messages) during initial development

None of these are regressions in previously-working code.

### 4. Phase-Based Development
The spec uses phased development:
- **Phase 3-4**: Build features with manual validation
- **Phase 7**: Add comprehensive unit tests (T033-T038)

This is intentional to avoid premature optimization and maintain velocity.

## Consequences

### Positive
- ✅ **Maintains spec alignment** - following planned task sequence
- ✅ **Avoids premature abstraction** - write tests when patterns stabilize
- ✅ **Preserves velocity** - continue feature work without test scaffolding overhead
- ✅ **Defers to Phase 7** - when test infrastructure and patterns are clearer

### Negative
- ⚠️ **No unit-level regression protection** - until Phase 7 tests are written
- ⚠️ **Manual validation required** - for each change until tests exist

### Mitigation
- ✅ **Manual testing checklist** - documented in quickstart.md (T041)
- ✅ **Integration coverage** - postgres-validation.test.ts validates DB interactions
- ✅ **Architecture documented** - langgraph-checkpoint-structure.md explains patterns
- ✅ **Phase 7 committed** - T033-T034 will add comprehensive ThreadService tests

## Alternatives Considered

### Alternative 1: Write Tests Immediately
**Rejected** because:
- Violates spec task sequencing (Phase 7 is designated for testing)
- Requires scaffolding that's planned for later (mock patterns, test utilities)
- Slows feature velocity during active development phase

### Alternative 2: Write Minimal Regression Tests Only
**Rejected** because:
- Our "fixes" aren't regressions - they're discoveries during initial implementation
- Half-written tests create maintenance burden
- Better to write comprehensive tests in Phase 7 with full context

## References

- **Spec**: [tasks.md](../../../specs/003-frontend-changes-to/tasks.md) - T033, T034, T038
- **Best Practices**: [best-practices.md](../../best-practices.md) - Testing expectations
- **Architecture**: [langgraph-checkpoint-structure.md](../../architecture/langgraph-checkpoint-structure.md)

## Review History

- **2025-10-08**: Initial TDR after thread discovery and filtering fixes
- **2025-10-09**: Moved to `docs/decisions/tdr/` and reclassified as Technical Decision Record
- **Decision**: Defer ThreadService unit tests to Phase 7 (T033-T034)
- **Validation**: Manual testing + existing integration tests sufficient until then
- **Update**: Route integration tests were added in October 2025 (earlier than Phase 7) due to code review findings. See PR #4 for details.
