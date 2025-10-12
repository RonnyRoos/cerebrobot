# Task Generation Report

**Feature**: 006-migrate-to-thread  
**Date**: October 11, 2025  
**Command**: `/speckit.tasks`  
**Output**: `/Users/ronny/dev/cerebrobot/specs/006-migrate-to-thread/tasks.md`

---

## Generation Summary

### Task Statistics

| Metric | Count |
|--------|-------|
| **Total Tasks** | 28 |
| **Setup Tasks (Phase 1)** | 3 |
| **Foundational Tasks (Phase 2)** | 3 |
| **User Story 1 Tasks (Phase 3)** | 6 |
| **User Story 2 Tasks (Phase 4)** | 4 |
| **User Story 3 Tasks (Phase 5)** | 3 |
| **User Story 4 Tasks (Phase 6)** | 4 |
| **Polish Tasks (Phase 7)** | 5 |
| **Parallelizable Tasks** | 5 (marked [P]) |

---

## Task Distribution by User Story

### User Story 1 - Continuous Thread Conversation (P1) 🎯 MVP
**Tasks**: T007-T012 (6 tasks)  
**Goal**: Single persistent connection for multiple messages  
**Key Files**:
- `apps/server/src/chat/routes.ts` (modify)
- `apps/server/src/agent/langgraph-agent.ts` (modify)
- `apps/client/src/hooks/useChatMessages.ts` (modify)
- `apps/client/src/components/ThreadView.tsx` (modify)

**Independent Test**: Open thread, send 3-5 messages, verify single WebSocket in DevTools

---

### User Story 2 - Response Interruption and Cancellation (P2)
**Tasks**: T013-T016 (4 tasks)  
**Goal**: Cancel streaming response, send new message immediately  
**Key Files**:
- `apps/server/src/chat/routes.ts` (add cancellation handler)
- `apps/client/src/hooks/useChatMessages.ts` (add cancel logic)
- `apps/client/src/components/ThreadView.tsx` (add cancel button)
- `apps/server/src/chat/connection-manager.ts` (cleanup)

**Independent Test**: Send long message, send second message mid-stream, verify first stops and second starts

---

### User Story 3 - Multi-Thread Concurrent Connections (P3)
**Tasks**: T017-T019 (3 tasks)  
**Goal**: Multiple threads = multiple independent connections  
**Key Files**:
- `apps/server/src/chat/connection-manager.ts` (monitoring)
- `apps/server/src/chat/routes.ts` (thread isolation)
- Client testing across multiple thread views

**Independent Test**: Open 3 threads simultaneously, verify 3 WebSocket connections, no cross-talk

---

### User Story 4 - Connection Recovery After Disruption (P2)
**Tasks**: T020-T023 (4 tasks)  
**Goal**: Auto-reconnect with exponential backoff, manual retry option  
**Key Files**:
- `apps/client/src/hooks/useChatMessages.ts` (integrate useReconnection)
- `apps/client/src/components/ThreadView.tsx` (reconnection UI)
- `apps/server/src/chat/connection-manager.ts` (health logging)

**Independent Test**: Disable WiFi mid-stream, verify error, auto-reconnect attempts [1s, 2s, 4s], manual retry button

---

## Parallel Execution Opportunities

### Phase 1 (Setup) - All Parallel
```bash
T001 [P] Create connection.ts schemas
T002 [P] Update chat.ts schemas  
T003 [P] Create connection types
```
**Benefit**: 3 developers can work simultaneously, complete setup in ~30 minutes

### Phase 7 (Polish) - Partial Parallel
```bash
T024 [P] Add connection metrics
T025 [P] Update documentation
T028 [P] Performance optimization
```
**Benefit**: 3 tasks can run in parallel, T026/T027 sequential

### User Stories (After Foundational)
With 2+ developers:
- **Dev A**: US1 (T007-T012) → US2 (T013-T016)
- **Dev B**: US4 (T020-T023) after US1 complete
- **Dev C**: US3 (T017-T019) validation in parallel

---

## Critical Path Analysis

### Blocking Dependencies
1. **Phase 2 (Foundational) BLOCKS Everything**
   - T004: ConnectionManager class
   - T005: useThreadConnection hook
   - T006: useReconnection hook
   - **Estimated Time**: 4-6 hours
   - **Blocker**: All user stories depend on this infrastructure

2. **User Story 1 BLOCKS US2 and US4**
   - US2 (Cancellation) needs persistent connection working
   - US4 (Reconnection) needs connection lifecycle working
   - **Estimated Time**: 3-4 hours
   - **Blocker**: Core connection functionality required first

### Recommended Sequential Order (Single Developer)
1. Setup (Phase 1): 30 min
2. Foundational (Phase 2): 4-6 hours ⚠️ CRITICAL PATH
3. US1 (Phase 3): 3-4 hours 🎯 MVP MILESTONE
4. US2 (Phase 4): 2-3 hours
5. US4 (Phase 6): 2-3 hours
6. US3 (Phase 5): 1-2 hours (validation)
7. Polish (Phase 7): 2-3 hours

**Total Estimated Time**: 15-21 hours

---

## MVP Scope

**Recommended MVP**: Complete through User Story 1 only

**MVP Tasks**: T001-T012 (12 tasks)
- Setup: T001-T003
- Foundational: T004-T006
- User Story 1: T007-T012

**MVP Delivers**:
- ✅ Single persistent WebSocket per thread
- ✅ Multiple messages over same connection
- ✅ RequestId correlation working
- ✅ 100-300ms handshake overhead eliminated
- ✅ Success Criteria SC-001, SC-002, SC-007 met

**Post-MVP Increments**:
- **Increment 2**: Add US2 (T013-T016) → Cancellation support
- **Increment 3**: Add US4 (T020-T023) → Reconnection recovery
- **Increment 4**: Add US3 (T017-T019) → Multi-thread validation
- **Increment 5**: Polish (T024-T028) → Metrics and optimization

---

## Implementation Notes

### No Test Tasks
- Feature spec has no explicit test requirement
- Following constitution v1.1.0: manual smoke tests for WebSocket behavior
- Unit tests mentioned in quickstart.md are implementation examples, not required deliverables
- Manual test scenarios documented in each user story's "Independent Test" section

### Foundational Phase Criticality
- **T004** (ConnectionManager): Server-side state management for all connections
- **T005** (useThreadConnection): Client-side connection lifecycle hook
- **T006** (useReconnection): Exponential backoff reconnection logic
- These 3 tasks enable ALL user stories - cannot proceed without them

### User Story Independence
Each story is independently testable:
- **US1**: DevTools shows single connection for multiple messages
- **US2**: Cancel button works, first response stops, second starts
- **US3**: Multiple threads = multiple connections, no cross-talk
- **US4**: WiFi disconnect → auto-reconnect → manual retry

### Tech Stack Alignment
All tasks use approved technology:
- TypeScript 5.5+ (no new language features)
- Fastify 5.6.1 + @fastify/websocket 10.0.1 (existing)
- React 18.x hooks (useRef, useEffect, useState)
- crypto.randomUUID() (built-in, no dependencies)
- AbortController (standard web API)

---

## Success Validation

### After User Story 1 (MVP)
Verify:
- [ ] SC-001: Second message response starts <50ms (handshake eliminated)
- [ ] SC-002: 90% of 5+ message conversations use single connection
- [ ] SC-007: Average messages per connection ≥3

### After User Story 2
Verify:
- [ ] SC-003: Cancellation completes within 200ms
- [ ] Cancelled event acknowledged before new response

### After User Story 3
Verify:
- [ ] SC-005: 5 concurrent connections, <100ms latency increase
- [ ] No cross-thread message leakage

### After User Story 4
Verify:
- [ ] SC-004: Connection drop detected within 2 seconds
- [ ] SC-009: Reconnection succeeds within 5 seconds for 95% transient failures

### After Polish (Complete)
Verify:
- [ ] SC-006: Cleanup completes within 500ms
- [ ] SC-008: Cancellation rate measurable in logs
- [ ] SC-010: Dual-ID logging (connectionId + requestId) visible

---

## Files Modified/Created

### New Files (9)
1. `packages/chat-shared/src/schemas/connection.ts`
2. `packages/chat-shared/src/types/connection.ts`
3. `apps/server/src/chat/connection-manager.ts`
4. `apps/client/src/hooks/useThreadConnection.ts`
5. `apps/client/src/hooks/useReconnection.ts`

### Modified Files (6)
1. `packages/chat-shared/src/schemas/chat.ts` (add requestId, cancelled event)
2. `apps/server/src/chat/routes.ts` (persistent connections, cancellation)
3. `apps/server/src/agent/langgraph-agent.ts` (AbortSignal support)
4. `apps/client/src/hooks/useChatMessages.ts` (use new hooks, cancel logic)
5. `apps/client/src/components/ThreadView.tsx` (connection status, cancel button)
6. `docs/` (architecture documentation updates)

**Total Files Affected**: 15

---

## Next Actions

1. **Review tasks.md** with team/stakeholders
2. **Estimate capacity**: Single developer or parallel team?
3. **Commit to MVP scope**: US1 only or broader?
4. **Start implementation**:
   - If single developer: T001 → T028 sequential
   - If team: Parallelize Setup, assign user stories after Foundational
5. **Track progress**: Update task checkboxes as work completes
6. **Validate at checkpoints**: Test each user story independently before proceeding

---

**Tasks Ready for Implementation** ✅  
See `/Users/ronny/dev/cerebrobot/specs/006-migrate-to-thread/tasks.md` for complete task list.
