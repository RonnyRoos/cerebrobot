# Manual Validation Checklist - Spec 006

**Status**: ⏸️ Awaiting Manual Validation  
**Date**: Session in progress  
**Tester**: [To be filled by human operator]

## Prerequisites

- ✅ Backend running on `http://localhost:3030` (docker compose up -d)
- ✅ Frontend running on `http://localhost:5173` (pnpm dev)
- ✅ All automated tests passing (97 tests)
- ✅ Code hygiene complete (lint, format, test)

## Core Functional Requirements (FR)

### FR-001: Thread-Persistent WebSocket Connection

**Test**: Connection persists across multiple messages

**Steps**:
1. Open browser to `http://localhost:5173`
2. Create or select a thread
3. Send first message: "Hello, what's your name?"
4. Wait for complete response
5. Send second message: "Tell me a joke" (WITHOUT refreshing page)
6. Wait for complete response
7. Check browser DevTools → Network → WS tab

**Expected**:
- [ ] Same WebSocket connection ID used for both messages
- [ ] Connection stays "Connected" (green indicator) between messages
- [ ] No new WebSocket handshake before second message

**Actual**: [Fill in after testing]

---

### FR-004: RequestId Multiplexing

**Test**: Each message has unique requestId visible in logs

**Steps**:
1. Open browser console (F12)
2. Send message: "Count to 5"
3. Note the `requestId` in console logs
4. Send second message: "What is 2+2?"
5. Note the second `requestId`

**Expected**:
- [ ] First requestId matches pattern `[a-f0-9]{8}-[a-f0-9]{4}-...` (UUID)
- [ ] Second requestId is different from first
- [ ] Both requestIds appear in backend logs with matching threadId

**Actual**: [Fill in after testing]

---

### FR-008: Mid-Stream Cancellation

**Test**: User can abort streaming response

**Steps**:
1. Send message: "Write a long story about a dragon" (slow streaming response)
2. Wait for first few tokens to appear
3. Click "Cancel" button (or send new message while streaming)
4. Observe response stops mid-stream

**Expected**:
- [ ] Response stops streaming immediately (< 500ms)
- [ ] "Cancelled" indicator shown briefly
- [ ] Connection stays open (can send new message immediately)
- [ ] Backend logs show `Request aborted` with requestId

**Actual**: [Fill in after testing]

---

### FR-016: Dual-ID Logging

**Test**: All backend logs include both connectionId and threadId

**Steps**:
1. Send a message in thread
2. Check backend logs (`docker compose logs backend | tail -50`)
3. Look for log entries with `connectionId` and `threadId`

**Expected**:
- [ ] Every WebSocket event log has `connectionId` field
- [ ] Every WebSocket event log has `threadId` field
- [ ] Logs show connection lifecycle: registered → active request → cleared → unregistered

**Actual**: [Fill in after testing]

---

### FR-016 (Idle Timeout): No Timeout After 10 Minutes

**Test**: Connection survives idle period

**Steps**:
1. Send a message and wait for response
2. Leave browser tab open, do not interact for **10 minutes**
3. After 10 minutes, send another message

**Expected**:
- [ ] Connection still shows "Connected" after 10 minutes
- [ ] New message sends successfully without reconnection
- [ ] No WebSocket `close` event in DevTools Network tab

**Actual**: [Fill in after testing]

**Note**: This is a long test (10 min). Can be deferred to final validation.

---

## Reconnection Scenarios

### SC-001: Automatic Reconnection After Network Glitch

**Test**: Connection recovers from brief network interruption

**Steps**:
1. Send a message, wait for response
2. Simulate network loss:
   - **macOS/Linux**: `docker compose pause backend` (wait 2 seconds) → `docker compose unpause backend`
   - **OR**: Open DevTools → Network tab → Set throttling to "Offline" (2 sec) → Set back to "No throttling"
3. Observe connection status indicator
4. Wait for automatic reconnection (check console for reconnection attempts)
5. Send new message after reconnection

**Expected**:
- [ ] Connection indicator changes to yellow/red during outage
- [ ] Automatic reconnection attempts logged in console (1s, 2s, 4s delays)
- [ ] Connection indicator returns to green after recovery
- [ ] New message sends successfully after reconnection

**Actual**: [Fill in after testing]

---

### SC-006: Cleanup Completes Within 500ms

**Test**: Connection cleanup is fast

**Steps**:
1. Send a message, wait for response
2. Close browser tab or navigate away
3. Check backend logs for `Connection unregistered` message
4. Note the timestamp difference between close event and cleanup completion

**Expected**:
- [ ] `Connection unregistered` log appears within 500ms of close
- [ ] Log shows `durationMs`, `messageCount`, `connectionId`, `threadId`
- [ ] No "orphaned connection" errors in logs

**Actual**: [Fill in after testing]

---

## Memory System Validation

### Memory Retrieval (retrieve-memories node)

**Test**: Agent retrieves relevant memories from past conversations

**Steps**:
1. Start new thread
2. Send: "My name is Alice and I love jazz music"
3. Wait for response (confirms memory stored)
4. Send: "What do you know about me?"

**Expected**:
- [ ] Response mentions "Alice" and "jazz music"
- [ ] Backend logs show `retrieve-memories` node execution
- [ ] Backend logs show successful semantic search with similarity scores

**Actual**: [Fill in after testing]

---

### Memory Storage (upsertMemory tool)

**Test**: Agent stores new information using memory tool

**Steps**:
1. Start new thread
2. Send: "Remember that I have blue eyes"
3. Wait for response
4. Check backend logs for `upsertMemory` tool call

**Expected**:
- [ ] Backend logs show: `[Memory] upsertMemory tool called with input:`
- [ ] Logs show: `[Memory] Successfully stored memory for user`
- [ ] No "validation failed" errors in logs
- [ ] Agent confirms storing the information in its response

**Actual**: [Fill in after testing]

---

## Error Handling

### Invalid ThreadId

**Test**: Server rejects connection with invalid threadId

**Steps**:
1. In browser console, manually create WebSocket:
   ```javascript
   const ws = new WebSocket('ws://localhost:3030/api/chat/ws?threadId=invalid');
   ws.onclose = (e) => console.log('Close code:', e.code, 'Reason:', e.reason);
   ```
2. Observe close event

**Expected**:
- [ ] WebSocket closes immediately
- [ ] Close code is 1008 (policy violation)
- [ ] Reason includes "Invalid threadId format"

**Actual**: [Fill in after testing]

---

### Missing ThreadId

**Test**: Server rejects connection without threadId

**Steps**:
1. In browser console:
   ```javascript
   const ws = new WebSocket('ws://localhost:3030/api/chat/ws');
   ws.onclose = (e) => console.log('Close code:', e.code, 'Reason:', e.reason);
   ```

**Expected**:
- [ ] WebSocket closes immediately
- [ ] Close code is 1008 (policy violation)
- [ ] Reason includes "threadId is required"

**Actual**: [Fill in after testing]

---

## Final Validation

**All tests passing?**
- [ ] All checkboxes above are marked ✅
- [ ] No unexpected errors in browser console
- [ ] No unexpected errors in backend logs
- [ ] Performance feels responsive (< 100ms to start streaming first token after send)

**Manual testing completed by**: [Name]  
**Date completed**: [Date]  
**Overall status**: [PASS / FAIL / NEEDS WORK]

---

## Notes & Observations

[Add any unexpected behavior, edge cases discovered, or suggestions for improvement]

---

## Next Steps After Manual Validation

If all tests PASS:
1. ✅ Mark T027 as complete in TODO list
2. → Proceed to T028 (Create ADR documenting thread-persistent WebSocket pattern)
3. → Close out spec 006 implementation

If any tests FAIL:
1. Document failures in "Actual" fields above
2. Create bug tickets for each failure
3. Fix bugs and re-run manual validation
