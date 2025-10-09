# ADR 005: Standardize on "Thread" Terminology

## Status

**Accepted** (2025-10-08)

## Context

Cerebrobot currently uses inconsistent terminology for the same concept:
- **Chat API**: Uses `sessionId` in request/response schemas
- **Thread API**: Uses `threadId` in routes and service
- **Frontend**: Mixes both `sessionId` (hooks) and `threadId` (components)
- **LangGraph**: Uses `thread_id` natively in checkpoint configuration

This inconsistency creates confusion and makes the codebase harder to understand and maintain.

### LangGraph's Standard Terminology

LangGraph's official documentation consistently uses "thread" terminology:
- Configuration: `{ configurable: { thread_id: "..." } }`
- Persistence: "thread-level persistence"
- Platform concepts: "Threads" section in LangGraph Platform
- APIs: `thread_id` parameter throughout

From the LangGraph docs:
> "If you would like to persist the outputs of the graph run (for example, to enable human-in-the-loop features), you can create a **thread** and provide the **thread ID** via the `config` argument"

### Our Data Model

```
User (1) ────< has many >──── Thread (*)
  │                              │
  └─ userId: UUID               ├─ threadId: UUID
                                 ├─ userId: UUID (FK)
                                 ├─ messages[]
                                 └─ checkpoint state
```

- 1 User can have 0 to many Threads
- 1 Thread belongs to exactly 1 User
- Each Thread represents a conversation with persistent state

## Decision

**Standardize on "thread" terminology everywhere** to align with LangGraph conventions and improve codebase clarity.

### Changes

**Backend:**
- `sessionId` → `threadId` in `ChatRequestSchema` and `ChatResponseSchema`
- `SessionManager` class → `ThreadManager` (keep file name for git history)
- Methods: `issueSession()` → `issueThread()`, `resetSession()` → `resetThread()`
- All route handlers, tests, and type definitions updated

**Frontend:**
- `useChatSession` hook internals updated (keep hook name)
- `sessionId` → `threadId` in all state variables and props
- All components and hooks updated

**Database:**
- No changes required (already uses `thread_id` in LangGraphCheckpoint table)

### What We're NOT Changing

To minimize churn and maintain git history:
- ❌ File names (`session-manager.ts`, `useChatSession.ts` stay as-is)
- ❌ Endpoint paths (`/api/session` stays for backward compat)
- ❌ Folder names (`apps/server/src/session/` stays as-is)

## Consequences

### Positive

- ✅ **Aligns with LangGraph**: Follows official framework terminology
- ✅ **Consistency**: Single term throughout codebase (userId + threadId)
- ✅ **Clarity**: No more confusion between "session" and "thread"
- ✅ **Documentation**: External docs now match our code
- ✅ **Onboarding**: Easier for developers familiar with LangGraph

### Negative

- ⚠️ **Breaking API Change**: External clients must update to use `threadId`
  - **Mitigation**: We're pre-production with no external users
- ⚠️ **Test Updates**: All tests referencing `sessionId` must be updated
  - **Mitigation**: Comprehensive test suite will catch regressions
- ⚠️ **Git Churn**: Touched ~12 files in one change
  - **Mitigation**: Single focused commit with clear message

### Neutral

- 🔄 **Learning Curve**: Developers must adopt new terminology
- 🔄 **File Names**: Slight mismatch between file names and content
  - Acceptable trade-off to preserve git history

## Implementation Notes

### Order of Changes

1. Update shared schema (breaking change foundation)
2. Update backend bottom-up (SessionManager → routes → agent)
3. Update backend tests
4. Update frontend hooks and components
5. Run full hygiene loop
6. Manual smoke test

### Testing Strategy

- Unit tests verify all schema/interface changes
- Integration test verifies end-to-end thread creation
- Manual test verifies UI/API interaction

## Alternatives Considered

### Alternative 1: Keep "session" terminology

**Rejected** because:
- Conflicts with LangGraph's standard terminology
- Creates confusion when reading LangGraph documentation
- Thread API already uses `threadId`, creating internal inconsistency

### Alternative 2: Use both terms interchangeably

**Rejected** because:
- Increases cognitive load
- Makes code reviews harder
- Violates DRY principle for terminology

### Alternative 3: Rename all files and folders

**Rejected** because:
- Breaks git history and blame
- Creates unnecessary churn
- Doesn't add significant value

## References

- [LangGraph Documentation on Threads](https://langchain-ai.github.io/langgraphjs/concepts/low_level/#threads)
- [LangGraph Persistence Guide](https://langchain-ai.github.io/langgraphjs/how-tos/persistence/)
- [AGENTS.md](../../AGENTS.md) - Project coding guidelines
## References

- [LangGraph Documentation on Threads](https://langchain-ai.github.io/langgraphjs/concepts/low_level/#threads)
- [LangGraph Persistence Guide](https://langchain-ai.github.io/langgraphjs/how-tos/persistence/)
- [AGENTS.md](../../../AGENTS.md) - Project coding guidelines
- [Engineering Best Practices](../../best-practices.md) - Engineering standards

## Review History

- **2025-10-08**: Initial ADR created as part of terminology standardization
- **2025-10-09**: Moved to `docs/decisions/adr/` with updated references
- **Authors**: Refactoring to align with LangGraph conventions
- **Reviewers**: N/A (documentation-only change)

---

**Summary**: Use "thread" everywhere to match LangGraph. Change `sessionId` → `threadId` in schemas, backend services, and frontend code. Keep file names unchanged to preserve git history.
