# Incident Report: Autonomous Follow-Up Limit Accumulation

**Date**: 2025-01-11  
**Severity**: Medium  
**Status**: Resolved  
**Reporter**: Operator  
**Resolver**: Agent

## Summary

The autonomous follow-up system was repeatedly logging "Autonomous follow-up limit reached" warnings because the `followUpCount` state variable never reset when users sent new messages. The counter would accumulate across user turns until reaching the limit (default: 10), preventing any further autonomous scheduling even in fresh conversation contexts.

## Root Cause

The `followUpCount` state variable in `ConversationState` was incremented on each autonomous follow-up (in `autonomy-evaluator.ts`) but lacked a reset mechanism when users sent new messages. While timers and effects were correctly cleared on user messages in `SessionProcessor`, the counter state persisted indefinitely.

**Key Finding**: User messages should invalidate the autonomous scheduling context by resetting the follow-up budget, allowing fresh autonomous behavior after each user turn.

## Evidence

**Log Output** (reported by operator):
```
backend-1 | {
  "currentFollowUpCount": 10,
  "maxLimit": 10,
  "threadId": "thread-xyz",
  "msg": "Autonomous follow-up limit reached - not scheduling"
}
```

**Code Analysis**:
- `autonomy-evaluator.ts` line 172: Counter incremented on schedule
- `autonomy-evaluator.ts` line 151-158: Limit check with warning
- `SessionProcessor.ts` line 59-76: Timers/effects cleared but not counter
- `langgraph-agent.ts`: Graph invocation missing counter reset

## Solution

Added `isUserMessage?: boolean` flag to `ChatInvocationContext` to distinguish user-initiated messages from autonomous timer-triggered messages:

1. **Interface Extension** (`chat-agent.ts`):
   ```typescript
   export interface ChatInvocationContext {
     // ... existing fields
     readonly isUserMessage?: boolean; // True for user messages, false/undefined for autonomous
   }
   ```

2. **Flag Propagation** (`SessionProcessor.ts`):
   ```typescript
   const stream = agent.streamChat({
     // ... existing context
     isUserMessage: event.type === 'user_message',
   });
   ```

3. **Conditional Reset** (`langgraph-agent.ts` - both `streamChat` and `completeChat`):
   ```typescript
   const stream = await this.graphContext.graph.stream({
     // ... existing state
     effects: [],
     ...(context.isUserMessage ? { followUpCount: 0 } : {}),
   }, ...);
   ```

## Impact

**Before Fix**:
- `followUpCount` accumulated: 1 → 2 → 3 → ... → 10 (limit reached)
- After hitting limit, no autonomous follow-ups scheduled even after user messages
- Required agent restart or manual state manipulation to reset

**After Fix**:
- User message → `followUpCount: 0` (reset)
- Autonomous message → Counter preserved (continues sequence)
- Fresh autonomous budget after each user turn (as expected)

## Testing

**Unit Tests Added**:
- `SessionProcessor.test.ts`: Verified `isUserMessage: true` for `user_message` events
- `SessionProcessor.test.ts`: Verified `isUserMessage: false` for `timer` events

**Regression Tests**:
- All existing autonomy tests passing (15 tests in `autonomy-evaluator.test.ts`)
- Full test suite: 930 tests passing (472 UI + 61 shared + 152 client + 245 server)

**Manual Verification** (recommended):
1. Start conversation with autonomous agent
2. Trigger 2-3 autonomous follow-ups
3. Send user message → Verify `followUpCount` resets to 0 in checkpoint
4. Autonomous scheduling resumes normally

## Files Modified

- `/apps/server/src/chat/chat-agent.ts` - Added `isUserMessage` flag to interface
- `/apps/server/src/events/session/SessionProcessor.ts` - Set flag based on event type
- `/apps/server/src/agent/langgraph-agent.ts` - Reset counter in `streamChat()` and `completeChat()`
- `/apps/server/src/__tests__/events/SessionProcessor.test.ts` - Added verification tests

## Lessons Learned

1. **State Reset Discipline**: When adding counters/budgets tied to conversational context, ensure they reset on context boundaries (e.g., user messages)
2. **Event Type Discrimination**: Leverage existing event type information (`user_message` vs `timer`) to distinguish user-initiated vs autonomous flows
3. **Partial State Clearing**: Session processor already had infrastructure to clear timers/effects on user messages - just needed to extend to state variables
4. **Surgical Fixes**: Used conditional spread operator for minimal disruption: `...(condition ? { reset } : {})`

## Prevention

- [ ] Add integration test that verifies `followUpCount` resets across multiple user turns
- [ ] Document state reset expectations in autonomy system design docs
- [ ] Consider adding state reset checklist to autonomy feature development process

## Related Issues

- Constitution Principle IV (Hygiene-First Development): All tests passing before/after fix
- Tech Stack Adherence: No new dependencies, used existing event infrastructure
- User Expectation: "User message generates a new state and should invalidate previously scheduled follow ups" ✅

## Deployment Notes

- **Backward Compatible**: No migration needed, counter starts from 0 for new threads
- **Immediate Effect**: Existing threads with high `followUpCount` will reset on next user message
- **Monitoring**: Watch for absence of "limit reached" warnings after user messages

---

**Resolution Time**: ~30 minutes (investigation → fix → testing)  
**Test Coverage**: ✅ Unit tests, ✅ Regression verification  
**Hygiene Loop**: ✅ Lint clean, ✅ Format clean, ✅ All tests passing (930/930)
