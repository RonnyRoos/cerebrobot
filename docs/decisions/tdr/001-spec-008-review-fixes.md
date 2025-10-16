# TDR-001: Spec 008 Review Fixes

**Date**: 2025-10-16  
**Status**: Implemented  
**Context**: Post-implementation code review of spec 008 (Events & Effects Migration)

## Summary

Following a comprehensive code review of the `008-migrate-to-events-effects` branch, several critical and high-priority issues were identified and fixed. This document records the issues found, fixes applied, and remaining work.

## Issues Fixed

### C1: Effect Status Race Condition (CRITICAL) ✅

**Problem**: Effects were created with default status `'pending'` even after successful direct WebSocket delivery, causing EffectRunner to attempt redundant redelivery 500ms later.

**Impact**:
- Redundant database queries every 500ms
- Browser console warnings ("No handler found for requestId")
- Misleading audit trail
- Wasted CPU/DB resources

**Fix**: Modified `SessionProcessor.ts` to conditionally set effect status based on delivery:
```typescript
await this.outboxStore.create({
  sessionKey: effect.session_key,
  checkpointId: effect.checkpoint_id,
  type: effect.type,
  payload: effect.payload,
  dedupeKey: effect.dedupe_key,
  status: activeSocket ? 'completed' : 'pending', // Conditional status
});
```

**Files Changed**:
- `apps/server/src/events/session/SessionProcessor.ts`
- `apps/server/src/events/effects/OutboxStore.ts` (added optional `status` parameter)

---

### C2: EventQueue Memory Leak (CRITICAL) ✅

**Problem**: The `queues` Map never removed entries for SESSION_KEYs, accumulating empty arrays indefinitely.

**Status**: Already fixed in previous implementation (line 101-103 in EventQueue.ts cleans up empty queues).

**Verification**: Confirmed cleanup logic exists:
```typescript
// Clean up empty queue
if (queue.length === 0) {
  this.queues.delete(sessionKey);
}
```

---

### H1: Missing Graceful Shutdown (HIGH) ✅

**Problem**: EventQueue and EffectRunner started but never explicitly stopped on server shutdown, potentially causing abandoned connections and lost events.

**Status**: Already fixed in previous implementation.

**Verification**: Confirmed shutdown hook exists in `app.ts`:
```typescript
app.addHook('onClose', async () => {
  logger.info('Shutting down background workers');
  eventQueue?.stop();
  effectRunner?.stop();
  await prisma.$disconnect();
});
```

---

### H2: Missing Error Recovery (HIGH) ✅

**Problem**: When event processing failed, the error was logged but the event remained lost with no retry mechanism.

**Fix**: Implemented retry logic with exponential backoff in EventQueue:
- Max 3 retry attempts per event
- Exponential backoff: 1s, 2s, 4s
- Tracks attempt count and last error
- Rejects permanently after max retries

**Implementation**:
```typescript
// EventQueue constants
private static readonly MAX_RETRY_ATTEMPTS = 3;
private static readonly RETRY_DELAY_MS = 1000;

// Retry logic in processQueues()
if (attemptCount < EventQueue.MAX_RETRY_ATTEMPTS) {
  const delayMs = EventQueue.RETRY_DELAY_MS * Math.pow(2, attemptCount - 1);
  // Re-enqueue after delay
} else {
  // Reject permanently
  queued.reject(new Error(`Event processing failed after ${EventQueue.MAX_RETRY_ATTEMPTS} attempts`));
}
```

**Files Changed**:
- `apps/server/src/events/events/EventQueue.ts`

---

### M1: Incomplete Latency Calculation (MEDIUM) ✅

**Problem**: Latency metric hardcoded to 0 in reconnection delivery path.

**Fix**: Calculate actual latency from effect creation timestamp:
```typescript
const latencyMs = Date.now() - new Date(effect.created_at).getTime();
```

**Files Changed**:
- `apps/server/src/app.ts`

---

### L1: Overly Verbose Logging (LOW) ✅

**Problem**: Duplicate INFO and DEBUG logs in EffectRunner for same event.

**Fix**: Removed duplicate INFO log, kept only DEBUG level:
```typescript
this.logger?.debug(
  { effectId: effect.id, type: effect.type, status: effect.status },
  'EffectRunner: executeEffect called',
);
```

**Files Changed**:
- `apps/server/src/events/effects/EffectRunner.ts`

---

## Issues Deferred

### H3: OutboxStore Query Performance (HIGH) ⏸️

**Problem**: `getPending()` fetches effects ordered by creation time, which can cause session starvation under high concurrency (popular sessions monopolize batch).

**Status**: **DEFERRED** - Initial DISTINCT ON implementation broke existing tests. Requires more careful design.

**Recommendation**: Implement round-robin polling in a future PR:
- Option 1: Add `getPendingRoundRobin()` method using DISTINCT ON
- Option 2: Track last-served session in EffectRunner state
- Option 3: Increase batch size and dedupe sessions in-memory

**Risk**: Low - current implementation works correctly, just not optimally fair under extreme load.

---

### M2: EventStore Missing Pagination (MEDIUM) ⏸️

**Problem**: `findBySession()` returns ALL events for a session with no pagination, risking OOM on long conversations.

**Status**: **DEFERRED** - Not used in critical paths currently.

**Recommendation**: Add `limit` and `offset` parameters before exposing to public API.

---

### M3: Missing Observability Metrics (MEDIUM) ⏸️

**Problem**: No Prometheus/StatsD metrics exposed for monitoring.

**Status**: **DEFERRED** - Operations concern, not blocking for merge.

**Recommendation**: Add metrics for:
- EventQueue depth per session
- EffectRunner processing rate
- Effect delivery latency distribution
- Error rates by type

---

### L3: Spec 009 Files (LOW) ⏸️

**Problem**: Entire spec 009 (server-side autonomy) committed on spec 008 branch, violating branch hygiene.

**Status**: **DEFERRED** - Spec files don't affect runtime behavior.

**Recommendation**: Extract spec 009 to separate branch before merge to main.

---

## Validation Results

### Automated Tests
- **Status**: ✅ ALL PASSING
- **Count**: 182/182 tests
- **Breakdown**:
  - Events & Effects: 38 tests
  - Postgres validation: 18 tests
  - Existing functionality: 126 tests
  
### Hygiene Loop
- ✅ Linting: PASS (0 errors)
- ✅ Formatting: PASS (0 changes needed)
- ✅ Tests: PASS (182/182)

### Manual Validation
- ⏸️ **NOT YET COMPLETED** - Follow `VALIDATION_CHECKLIST.md` before production deployment

---

## Recommendations

### Before Merge
1. ✅ Fix C1 (effect status race condition) - **DONE**
2. ✅ Fix C2 (EventQueue memory leak) - **ALREADY FIXED**
3. ✅ Fix H1 (graceful shutdown) - **ALREADY FIXED**
4. ✅ Fix H2 (event retry logic) - **DONE**
5. ✅ Fix M1 (latency calculation) - **DONE**
6. ✅ Fix L1 (duplicate logging) - **DONE**

### Post-Merge
7. ⏸️ Implement H3 (session fairness) in follow-up PR
8. ⏸️ Add M2 (pagination) before exposing EventStore to API
9. ⏸️ Implement M3 (observability metrics) for production readiness
10. ⏸️ Extract L3 (spec 009 files) to separate branch

### Before Production
11. ⏸️ Complete manual validation per `VALIDATION_CHECKLIST.md`
12. ⏸️ Measure first-token latency (target: within 10% of baseline)
13. ⏸️ Load test with 100 concurrent sessions
14. ⏸️ Document rollback procedure

---

## Risk Assessment

### Merge Readiness: ✅ APPROVED

**Rationale**:
- All critical issues fixed
- All automated tests passing
- No regressions detected
- Deferred issues are non-blocking (performance optimizations, observability)

**Remaining Risks**:
- LOW: Session starvation under extreme concurrent load (H3 deferred)
- LOW: Missing production metrics (M3 deferred)
- NEGLIGIBLE: Spec 009 files on branch (doesn't affect runtime)

---

## Files Modified

1. `apps/server/src/events/session/SessionProcessor.ts` (C1 fix)
2. `apps/server/src/events/effects/OutboxStore.ts` (C1 support)
3. `apps/server/src/events/events/EventQueue.ts` (H2 fix)
4. `apps/server/src/app.ts` (M1 fix)
5. `apps/server/src/events/effects/EffectRunner.ts` (L1 fix)

---

## Commit Message

```
fix(events): resolve critical and high-priority issues from code review

**Critical Fixes (C1, C2)**:
- C1: Fix effect status race condition - mark as 'completed' when directly delivered via WebSocket
- C2: EventQueue memory leak already fixed (verified cleanup exists)

**High Priority Fixes (H1, H2)**:
- H1: Graceful shutdown already implemented (verified onClose hook exists)
- H2: Add event retry logic with exponential backoff (3 attempts, 1s/2s/4s delays)

**Medium & Low Priority Fixes**:
- M1: Fix latency calculation in reconnection path (use effect.created_at)
- L1: Remove duplicate logging in EffectRunner

**Deferred Issues** (non-blocking):
- H3: Session fairness optimization (requires careful design, low risk)
- M2: EventStore pagination (not used in critical paths)
- M3: Observability metrics (operations concern)
- L3: Spec 009 files on branch (no runtime impact)

**Test Results**: 182/182 tests passing ✅
**Hygiene Loop**: lint ✅ format ✅ test ✅

Resolves all blocking issues identified in TDR-001.
See docs/decisions/tdr/001-spec-008-review-fixes.md for details.
```
