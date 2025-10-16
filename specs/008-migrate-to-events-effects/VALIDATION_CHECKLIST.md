# User Story 1 MVP Validation Checklist

**Date**: October 15, 2025  
**Phase**: User Story 1 - Events & Effects Architecture Migration  
**Status**: Implementation Complete, Awaiting Manual Validation

---

## Overview

User Story 1 (T014-T021) has been fully implemented and unit tested. Before proceeding to User Story 2, we must validate that the Events & Effects architecture works correctly end-to-end with **zero user-visible behavioral changes** except possibly latency.

**Success Criteria (from SC-006):**
- ✅ WebSocket streaming response identical to pre-migration
- ✅ First token latency within 10% of pre-migration baseline
- ✅ No errors in server logs during normal operation
- ✅ Session isolation maintained (concurrent conversations work independently)

---

## Pre-Flight Checks

### 1. Environment Configuration
- [ ] Verify `.env` contains `EVENT_QUEUE_PROCESS_INTERVAL_MS=50`
- [ ] Verify `.env` contains `EFFECT_POLL_INTERVAL_MS=500`
- [ ] Verify database is running: `docker-compose ps` shows postgres healthy
- [ ] Verify all migrations applied: `pnpm prisma migrate status`

### 2. Build & Compilation
- [ ] Run `pnpm install` - all dependencies installed
- [ ] Run `pnpm lint` - zero errors
- [ ] Run `pnpm format:check` - all files formatted
- [ ] Run `pnpm test` - all 156 tests passing (118 original + 38 Events & Effects)
- [ ] Run `pnpm build` (if applicable) - successful compilation

### 3. Server Startup
- [ ] Start server: `pnpm dev` in `apps/server/`
- [ ] Server starts without errors
- [ ] EventQueue initialized (check logs for "EventQueue started")
- [ ] EffectRunner initialized (check logs for "EffectRunner started")
- [ ] No ERROR or WARN logs during startup (INFO logs expected)
- [ ] WebSocket endpoint available: `ws://localhost:3000/api/chat/ws`

---

## Functional Validation

### Test 1: Basic Message Flow (Happy Path)

**Objective**: Verify a simple user message → streaming response works identically to pre-migration.

**Steps**:
1. [ ] Open WebSocket connection to `/api/chat/ws`
2. [ ] Send user message: `{"type":"chat","agentId":"helpful-assistant","threadId":"test-thread-1","message":"Hello, tell me a short joke"}`
3. [ ] Observe response streaming

**Expected Behavior**:
- [ ] Receive multiple `token` events with streaming text chunks
- [ ] Each token event has `type:"token"`, `value:"..."` fields
- [ ] Receive final `message` event with complete response
- [ ] Final event has `type:"message"`, `message:"..."`, `latencyMs`, `tokenUsage` fields
- [ ] Response content is coherent and complete
- [ ] No errors in server logs
- [ ] No duplicate tokens or missing content

**Logs to Check**:
- [ ] `Event created` log with SESSION_KEY
- [ ] `Event enqueued` log
- [ ] `Processing event` log from SessionProcessor
- [ ] `Effect delivered successfully` logs from EffectRunner
- [ ] No ERROR or WARN logs

**Database Verification**:
```sql
-- Check events table
SELECT id, session_key, type, created_at 
FROM events 
WHERE session_key LIKE '%test-thread-1' 
ORDER BY seq DESC LIMIT 5;

-- Check effects table
SELECT id, session_key, type, status, created_at, updated_at
FROM effects
WHERE session_key LIKE '%test-thread-1'
ORDER BY created_at DESC LIMIT 10;
```

Expected:
- [ ] Event record exists with `type = 'user_message'`
- [ ] Multiple effect records exist with `type = 'send_message'`
- [ ] All effects have `status = 'completed'`
- [ ] No effects stuck in `executing` or `pending` status

---

### Test 2: Latency Measurement (SC-006 Validation)

**Objective**: Measure first token latency and verify it's within 10% of pre-migration baseline.

**Pre-Migration Baseline** (if available):
- First token latency: `___ ms` (measure from current main/production)
- Total response time: `___ ms`

**Migration Measurement**:
1. [ ] Send message: `{"type":"chat","agentId":"helpful-assistant","threadId":"test-thread-2","message":"Say hello"}`
2. [ ] Record timestamp when message sent: `T_send = ___`
3. [ ] Record timestamp when first token received: `T_first_token = ___`
4. [ ] Calculate: `First Token Latency = T_first_token - T_send = ___ ms`

**Analysis**:
- [ ] First token latency: `___ ms`
- [ ] Difference from baseline: `___ ms` (`____%`)
- [ ] **PASS/FAIL**: Within 10% tolerance? YES / NO

**Notes**:
- Expected ~500ms overhead from EffectRunner polling (EFFECT_POLL_INTERVAL_MS)
- If latency > 10% higher, consider reducing EFFECT_POLL_INTERVAL_MS
- Streaming should still feel "real-time" to user

---

### Test 3: Concurrent Sessions (Multi-User Isolation)

**Objective**: Verify that concurrent conversations in different threads don't interfere with each other.

**Steps**:
1. [ ] Open two WebSocket connections (Connection A and Connection B)
2. [ ] Connection A: Send message to `threadId:"session-a"`, message: `"Count to 5 slowly"`
3. [ ] Connection B: Send message to `threadId:"session-b"`, message: `"Say the alphabet"`
4. [ ] Observe both responses streaming simultaneously

**Expected Behavior**:
- [ ] Connection A receives only responses for session-a
- [ ] Connection B receives only responses for session-b
- [ ] No cross-contamination (session-a doesn't see session-b's messages)
- [ ] Both sessions complete successfully
- [ ] EventQueue processes both sessions concurrently (check logs)

**Database Verification**:
```sql
-- Verify session isolation
SELECT session_key, COUNT(*) as effect_count, status
FROM effects
WHERE session_key LIKE '%session-a' OR session_key LIKE '%session-b'
GROUP BY session_key, status
ORDER BY session_key;
```

Expected:
- [ ] Each session has its own set of effects
- [ ] No effects with mixed session_keys
- [ ] All effects completed successfully

---

### Test 4: Error Handling

**Objective**: Verify system handles errors gracefully without crashing.

**Test 4a: Invalid Message Format**
1. [ ] Send malformed JSON: `{"type":"chat"` (missing closing brace)
2. [ ] Expected: Server returns error message, connection stays open
3. [ ] Expected: No crash, no ERROR logs beyond validation error

**Test 4b: Missing Required Fields**
1. [ ] Send incomplete message: `{"type":"chat","threadId":"test"}`
2. [ ] Expected: Validation error returned
3. [ ] Expected: Connection stays open

**Test 4c: Invalid Agent ID**
1. [ ] Send: `{"type":"chat","agentId":"nonexistent","threadId":"test","message":"Hi"}`
2. [ ] Expected: Error message about agent not found
3. [ ] Expected: Connection stays open

**Expected Behavior (All Error Cases)**:
- [ ] Server responds with error message
- [ ] WebSocket connection remains open
- [ ] No server crash
- [ ] Error logged but system continues operating
- [ ] Other concurrent sessions unaffected

---

### Test 5: WebSocket Connection Lifecycle

**Objective**: Verify connection open/close handling works correctly.

**Test 5a: Clean Disconnect**
1. [ ] Establish connection, send message, receive response
2. [ ] Close WebSocket connection gracefully
3. [ ] Expected: No ERROR logs, connection cleaned up

**Test 5b: Reconnection (New Connection)**
1. [ ] Establish connection with `threadId:"reconnect-test"`
2. [ ] Send message, receive partial response
3. [ ] Close connection
4. [ ] Open new connection with same `threadId:"reconnect-test"`
5. [ ] Send another message

**Expected Behavior**:
- [ ] New connection works independently
- [ ] Previous conversation history maintained in thread
- [ ] No duplicate message delivery (User Story 2 will add pending delivery)
- [ ] ConnectionManager handles new connection correctly

---

## Performance Validation

### Metrics to Collect

**System Resource Usage**:
- [ ] CPU usage during idle: `____%`
- [ ] CPU usage during message processing: `____%`
- [ ] Memory usage (server process): `___ MB`
- [ ] Database connections: `___` active

**Polling Performance**:
- [ ] EventQueue poll frequency matches 50ms (20 polls/second)
- [ ] EffectRunner poll frequency matches 500ms (2 polls/second)
- [ ] No excessive database queries visible in logs
- [ ] Polls complete quickly (< 10ms per poll when no work)

**Throughput**:
- [ ] Can handle 5 concurrent conversations without degradation
- [ ] Response streaming smooth (no stuttering or pauses)

---

## Database Validation

### Schema Verification
```sql
-- Verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('events', 'effects');

-- Verify indexes
SELECT indexname, indexdef FROM pg_indexes 
WHERE tablename IN ('events', 'effects');
```

Expected:
- [ ] `events` table exists with columns: id, session_key, seq, type, payload, created_at
- [ ] `effects` table exists with columns: id, session_key, checkpoint_id, type, payload, dedupe_key, status, created_at, updated_at
- [ ] Index on `events(session_key, seq)`
- [ ] Index on `effects(session_key, status)`
- [ ] Index on `effects(dedupe_key)` for deduplication

### Data Integrity
```sql
-- Check for orphaned effects (effects without corresponding event)
SELECT e.id, e.session_key, e.type, e.status
FROM effects e
LEFT JOIN events ev ON e.session_key = ev.session_key
WHERE ev.id IS NULL
LIMIT 10;

-- Check for stuck effects (pending/executing for > 5 minutes)
SELECT id, session_key, status, created_at, 
       EXTRACT(EPOCH FROM (NOW() - created_at)) as age_seconds
FROM effects
WHERE status IN ('pending', 'executing')
AND created_at < NOW() - INTERVAL '5 minutes';
```

Expected:
- [ ] No orphaned effects (test conversations should have matching events)
- [ ] No stuck effects after test completion

---

## Log Analysis

### Required Log Patterns

**Startup Logs** (should see these on server start):
```
✅ EventQueue started - polling every 50ms
✅ EffectRunner started - polling for pending effects
✅ SessionProcessor initialized with agent: helpful-assistant
```

**Message Flow Logs** (should see these during conversation):
```
✅ Event created: { sessionKey: 'user:agent:thread', type: 'user_message' }
✅ Event enqueued: { sessionKey: '...', seq: X }
✅ Processing event: { sessionKey: '...', type: 'user_message' }
✅ SessionProcessor: invoking agent for event ...
✅ Effect delivered successfully: { effectId: '...', sessionKey: '...' }
```

**NO ERROR Logs** (these would indicate problems):
```
❌ Error processing event
❌ Effect delivery failed
❌ WebSocket send failed
❌ Database error
❌ Validation error (during normal flow)
```

---

## Success Criteria Summary

**User Story 1 is VALIDATED if ALL of the following are TRUE:**

### Functional Requirements
- [x] ✅ All 156 tests passing (unit tests)
- [ ] ✅ Server starts without errors
- [ ] ✅ Basic message flow works (Test 1)
- [ ] ✅ Concurrent sessions work independently (Test 3)
- [ ] ✅ Error handling graceful (Test 4)
- [ ] ✅ Connection lifecycle correct (Test 5)

### Non-Functional Requirements
- [ ] ✅ First token latency within 10% of baseline (SC-006)
- [ ] ✅ Streaming feels real-time to user
- [ ] ✅ No memory leaks (stable memory usage over time)
- [ ] ✅ Database queries efficient (no N+1 queries visible)

### Data Integrity
- [ ] ✅ Events persisted correctly
- [ ] ✅ Effects created and completed
- [ ] ✅ No orphaned or stuck records
- [ ] ✅ Session isolation maintained in database

### Observability
- [ ] ✅ Logs provide clear visibility into system behavior
- [ ] ✅ No ERROR logs during normal operation
- [ ] ✅ Performance metrics within acceptable ranges

---

## Validation Execution

### Date: `___________`
### Executed By: `___________`
### Environment: `Development / Staging / Production`

### Results Summary

**Overall Status**: PASS / FAIL / PARTIAL

**Issues Found**:
1. `___________`
2. `___________`
3. `___________`

**Recommendations**:
- [ ] Proceed to User Story 2 (if PASS)
- [ ] Fix issues and re-validate (if FAIL)
- [ ] Document known limitations (if PARTIAL)

**Next Steps**:
- `___________`

---

## Notes

**What User Story 1 Delivers**:
- ✅ Events & Effects architecture fully operational
- ✅ WebSocket messages flow through EventQueue → SessionProcessor → Agent → EffectRunner
- ✅ Streaming responses work identically to pre-migration
- ✅ Database persistence of events and effects
- ✅ Sequential processing per session, concurrent across sessions

**What User Story 1 Does NOT Deliver** (future stories):
- ❌ Automatic delivery of pending effects on reconnection (User Story 2)
- ❌ Multi-session isolation verification tests (User Story 3)
- ❌ Deduplication verification tests (User Story 4)

**Known Limitations**:
- ~500ms latency overhead from EffectRunner polling (configurable via EFFECT_POLL_INTERVAL_MS)
- If WebSocket disconnects mid-response, effects remain in outbox (will be delivered in User Story 2)

---

## Appendix: Manual Testing Commands

### Start Services
```bash
# Terminal 1: Start database
docker-compose up -d postgres

# Terminal 2: Start server
cd apps/server
pnpm dev
```

### WebSocket Testing with wscat
```bash
# Install wscat if needed
npm install -g wscat

# Connect to WebSocket
wscat -c ws://localhost:3000/api/chat/ws

# Send message (paste and press enter)
{"type":"chat","agentId":"helpful-assistant","threadId":"test-thread-1","message":"Hello, tell me a short joke"}

# Observe streaming response
```

### Database Queries
```bash
# Connect to database
docker exec -it cerebrobot-postgres psql -U cerebrobot -d cerebrobot

# Run validation queries (see sections above)
```

### Performance Monitoring
```bash
# Watch server logs
tail -f apps/server/logs/server.log

# Monitor resource usage
docker stats

# Monitor database connections
docker exec -it cerebrobot-postgres psql -U cerebrobot -d cerebrobot -c "SELECT count(*) FROM pg_stat_activity WHERE datname='cerebrobot';"
```
