# Architecture Scope Analysis: Events & Effects vs. Current Implementation

**Date**: 2025-10-15  
**Feature**: Originally 008-server-side-autonomy, now split into 008 + 009  
**Question**: Does this task include moving EVERYTHING to the event-effect architecture?

**DECISION: Option B - Unified Architecture (Split into Two Specs)**

---

## Decision Summary

**User chose**: Option B (Unified Architecture) with spec split

**Rationale**:
- Constitution compliance (KISS, DRY, Transparency)
- Future-proof foundation for brain UI, multi-agent
- Operational simplicity (single pattern to debug)
- Technical debt avoidance

**Implementation**:
1. **Spec 008**: Migrate existing user messages to Events & Effects (foundation)
2. **Spec 009**: Add autonomy features on top of unified architecture

---

## Split Structure

### 008-migrate-to-events-effects (Foundation)
- **Purpose**: Migrate ALL user message flows to Events & Effects
- **Scope**: user_message events, send_message effects, EventQueue, SessionProcessor, EffectRunner
- **Deliverable**: Existing chat works identically on new architecture
- **No new features**: Pure migration, behavior preservation

### 009-server-side-autonomy (Features)
- **Purpose**: Add timer-driven autonomous messaging
- **Scope**: timer events, schedule_timer effects, TimerWorker, PolicyGates
- **Prerequisite**: 008 MUST be complete
- **New features**: Autonomous follow-ups with configurable limits (.env)

---

## Configuration Requirements (009)

All autonomy parameters MUST be configurable via environment variables:

```bash
# Master toggle
AUTONOMY_ENABLED=false

# Policy gates
AUTONOMY_MAX_CONSECUTIVE=3
AUTONOMY_COOLDOWN_MS=15000

# Worker polling intervals
TIMER_POLL_INTERVAL_MS=250
EFFECT_POLL_INTERVAL_MS=250
```

---

## Benefits of Split

✅ **Clear separation**: Migration vs new features  
✅ **Independent testing**: Each spec validates separately  
✅ **Risk isolation**: Migration can't break autonomy (doesn't exist yet)  
✅ **Incremental delivery**: 008 delivers value immediately (audit trail, durable delivery)  
✅ **Constitution compliance**: Aligns with incremental development principle  
✅ **Easier review**: Smaller, focused specs  

---

**Files**:
- [008-migrate-to-events-effects/](../008-migrate-to-events-effects/) - Foundation spec
- [009-server-side-autonomy/](../009-server-side-autonomy/) - Autonomy spec (this directory)

**Branch**: Renamed from `008-server-side-autonomy` → `008-migrate-to-events-effects` to reflect current work focus


## Current Architecture Pattern

### WebSocket Message Flow (User-Initiated)
```
Client                    routes.ts                  LangGraphAgent             Graph Nodes
  │                           │                            │                          │
  ├─ WS: message ────────────►│                            │                          │
  │                           ├─ Parse + Validate          │                          │
  │                           ├─ Create AbortController    │                          │
  │                           │                            │                          │
  │                           ├─ agent.streamChat() ──────►│                          │
  │                           │                            ├─ graph.stream() ────────►│
  │                           │                            │                          ├─ LLM call
  │                           │                            │                          ├─ Tool calls
  │                           │                            │                          └─ Return messages
  │                           │                            │◄─────────────────────────┤
  │◄─ WS: token event ────────┤◄──── yield token ──────────┤
  │◄─ WS: token event ────────┤◄──── yield token ──────────┤
  │◄─ WS: final event ────────┤◄──── yield final ──────────┤
  │                           │                            │
  │                           └─ clearActiveRequest()      │
```

**Current I/O Pattern**:
- **Direct WebSocket sends**: `routes.ts` sends events directly to client (`socket.send()`) - **4 occurrences**
- **Synchronous delivery**: No outbox, no durable queue
- **No event log**: Messages are ephemeral, no audit trail
- **LangGraph nodes are PURE**: Already return state deltas, no direct I/O in nodes ✅

### Key Files with Direct I/O
1. **`apps/server/src/chat/routes.ts`**:
   - Line 107: `socket.send(JSON.stringify(cancelledEvent))`
   - Line 350: `socket.send(...)` for token events
   - Line 367: `socket.send(...)` for final events
   - Line 513: `socket.send(JSON.stringify(errorEvent))`

2. **`apps/server/src/agent/langgraph-agent.ts`**:
   - ✅ NO direct I/O - yields events (`{ type: 'token', value }`, `{ type: 'final', message }`)
   - ✅ Graph nodes are PURE - return state deltas only

---

## Events & Effects Architecture (Proposed)

### Autonomous Message Flow
```
Timer Fires               EventQueue              SessionProcessor         Graph Nodes
  │                           │                            │                    │
  ├─ timer event ────────────►│                            │                    │
  │                           ├─ enqueue(event)            │                    │
  │                           │                            │                    │
  │                           ├─ processOne() ────────────►│                    │
  │                           │                            ├─ Load checkpoint   │
  │                           │                            ├─ graph.invoke() ───►│
  │                           │                            │                    ├─ LLM call
  │                           │                            │                    └─ Return effects[]
  │                           │                            │◄────────────────────┤
  │                           │                            │                    
  │                           │                            ├─ Persist:
  │                           │                            │  - Checkpoint
  │                           │                            │  - Effects (outbox)
  │                           │                            │  - Metadata
  │                           │                            │  (ATOMIC TRANSACTION)
  │                           │◄───────────────────────────┤
  │                           │
  │                           ↓
  │                      EffectRunner
  │                           │
  │                           ├─ Poll outbox
  │                           ├─ Execute: send_message ───► WebSocket
  │                           └─ Update status: completed
```

**New Pattern**:
- **Event sourcing**: All inputs logged (events table)
- **Transactional outbox**: Effects persisted atomically with checkpoints
- **Durable delivery**: Failed WebSocket sends remain in outbox
- **Audit trail**: Full visibility into autonomy decisions

---

## Critical Architectural Question

### The User's Question: "Move EVERYTHING to event-effect architecture?"

**Two Possible Interpretations**:

### Option A: Autonomy-Only (Current Spec Interpretation)
- **Events & Effects ONLY for autonomous flows** (timer-driven, no user input)
- **Direct WebSocket REMAINS for user-initiated messages** (existing routes.ts pattern)
- **Result**: TWO COMPETING ARCHITECTURES in production

**Pros**:
- ✅ Minimal disruption to working code
- ✅ Faster implementation (only autonomy features)
- ✅ Lower risk of regression in existing chat

**Cons**:
- ❌ **VIOLATES KISS** - Two message delivery patterns
- ❌ **VIOLATES DRY** - Duplicate WebSocket send logic
- ❌ **Maintenance nightmare** - Which pattern for new features?
- ❌ **No audit trail for user messages** - Only autonomous messages logged
- ❌ **Different failure modes** - User messages fail differently than autonomous messages

### Option B: Unified Architecture (Constitution-Compliant)
- **Events & Effects for ALL message flows** (user AND autonomous)
- **User messages become `user_message` events**
- **All WebSocket sends go through EffectRunner**
- **Result**: ONE UNIFIED ARCHITECTURE

**Pros**:
- ✅ **OBEYS KISS** - Single message delivery pattern
- ✅ **OBEYS DRY** - All WebSocket sends in one place (EffectRunner)
- ✅ **Full audit trail** - Every message logged in events table
- ✅ **Consistent failure handling** - Durable outbox for ALL messages
- ✅ **Future-proof** - Clean foundation for multi-agent, brain UI, etc.

**Cons**:
- ❌ Larger refactoring scope
- ❌ Higher risk (touches working routes.ts)
- ❌ More testing required
- ❌ Longer implementation time

---

## Constitution Compliance Check

### Principle I: Hygiene-First Development
- **Option A**: Separate test suites for two patterns ⚠️
- **Option B**: Unified tests, cleaner hygiene ✅

### Principle II: Transparency & Inspectability
- **Option A**: User messages invisible in audit log ❌
- **Option B**: Full audit trail for ALL messages ✅

### Principle III: Type Safety & Testability
- **Option A**: Two code paths to test ⚠️
- **Option B**: Single code path, easier to test ✅

### Principle IV: Incremental & Modular Development
- **Option A**: Fast initial delivery ✅
- **Option B**: Clean incremental migration possible ✅

### Principle V: Stack Discipline
- **Both options**: Use approved stack ✅

### Principle VI: Configuration Over Hardcoding
- **Both options**: Configurable ✅

### Principle VII: Operator-Centric Design
- **Option A**: Two patterns to debug ❌
- **Option B**: Single pattern, simpler operations ✅

**Verdict**: **Option B (Unified) better aligns with constitution** (5/7 principles favor unified vs 2/7 favor separate)

---

## Current Spec/Plan Analysis

### What Spec Says

**spec.md**:
- FR-031: "Graph nodes MUST NOT perform I/O operations directly" ✅ (already true)
- FR-032: "Graph nodes MUST return state deltas and effects" ⚠️ (ambiguous: only for autonomy or all?)
- FR-036: "System MUST deliver autonomous messages via WebSocket" (explicit: autonomous only)
- **No mention of user-initiated messages becoming events**

**plan.md - Project Structure**:
```
├── routes/
│   └── chat.ts                 # Extend WebSocket route for autonomy messages
```
- States "**Extend** WebSocket route" (implies addition, not replacement)

**quickstart.md - Step 6: Integration**:
- "Refactor LangGraph nodes to return effects instead of performing I/O"
- **Ambiguous**: Does not specify if this applies to ALL flows or autonomy-only

**tasks.md**:
- T022: "Refactor LangGraph nodes to return effects instead of performing I/O"
- T025: "Add WebSocket delivery handler for send_message effects"
- **No task for migrating existing user message flow**

### What Spec Does NOT Say

- ❌ No requirement to migrate user messages to events
- ❌ No requirement to audit user messages
- ❌ No requirement to use EffectRunner for user-initiated responses
- ❌ No explicit prohibition of dual architecture

**Conclusion**: **Current spec describes Option A (Autonomy-Only)** but does not explicitly address the architectural duplication concern.

---

## Recommendation

### Immediate Action Required

**You must choose**:

1. **Option A: Autonomy-Only (Spec As Written)**
   - Events & Effects ONLY for autonomous flows
   - Keep existing routes.ts WebSocket pattern for user messages
   - Accept architectural duplication
   - Faster delivery (7-10 days MVP)
   - **Requires ADR documenting acceptance of dual architecture**

2. **Option B: Unified Architecture (Constitution-Aligned)**
   - Migrate ALL message flows to Events & Effects
   - User messages → `user_message` events
   - All WebSocket sends → EffectRunner
   - Single unified pattern
   - Longer delivery (12-15 days MVP)
   - **Requires spec update, task expansion**

### Hybrid Option C: Phased Migration
1. **Phase 1**: Implement autonomy with Events & Effects (Option A)
2. **Phase 2**: Migrate user messages to Events & Effects
3. **Phase 3**: Deprecate direct WebSocket sends in routes.ts

**Pros**:
- Delivers autonomy quickly
- Allows constitution-compliant migration
- Reduces risk of breaking working code

**Cons**:
- Still has dual architecture in interim
- Requires discipline to complete Phase 2
- More total work than Option B upfront

---

## Questions for Clarification

1. **Is architectural duplication acceptable for this feature?**
   - If YES → Proceed with Option A (current spec)
   - If NO → Update spec for Option B (unified)

2. **Should user-initiated messages have audit trail?**
   - If YES → Requires Events & Effects for user messages
   - If NO → Option A sufficient

3. **What's the priority: speed vs. clean architecture?**
   - Speed → Option A (7-10 days)
   - Clean → Option B (12-15 days)
   - Balanced → Option C (phased)

4. **Is this a foundation for brain UI / multi-agent?**
   - If YES → Option B recommended (brain needs full event log)
   - If NO → Option A acceptable

5. **Who will maintain this codebase long-term?**
   - Single operator → Option A tolerable
   - Team / future contributors → Option B strongly recommended

---

## Impact on Tasks

### If Option A (Current Spec):
- ✅ No task changes needed
- ✅ Tasks.md accurate as-is
- ⚠️ Add ADR: "ADR-XXX: Accept Dual Message Architecture for Autonomy MVP"

### If Option B (Unified):
- 🔄 Add Phase 1.5: "Migrate User Messages to Events"
  - T00X: Create user_message events on WebSocket receive
  - T00X: Update routes.ts to enqueue events instead of direct agent.streamChat()
  - T00X: Refactor existing streaming to use EffectRunner
  - T00X: Update tests for unified flow
- 📝 Update spec.md FR-032: "ALL graph invocations (user AND autonomous) MUST return effects"
- 📝 Update plan.md: Change "Extend WebSocket route" to "Migrate WebSocket route to Events & Effects"
- ⏱️ Add ~3-5 days to MVP timeline

### If Option C (Phased):
- ✅ Keep current tasks for Phase 1
- 📝 Add spec/009-unified-event-architecture/ for Phase 2
- 📝 Document migration path in ADR

---

## Recommendation Summary

**I recommend Option B (Unified Architecture)** because:

1. **Constitution Compliance**: Aligns with KISS, DRY, Transparency
2. **Future-Proof**: Brain UI, multi-agent, analytics all need full event log
3. **Operational Simplicity**: One pattern to debug, monitor, optimize
4. **Technical Debt Avoidance**: Prevents future "let's unify this" project

**However**, this requires:
- **Spec update**: Expand scope to include user message migration
- **Task expansion**: Add ~8-10 tasks for user message event handling
- **Timeline adjustment**: MVP becomes 12-15 days instead of 7-10 days

**If timeline is critical**, proceed with **Option A** but:
- ✅ Document acceptance of dual architecture in ADR
- 📝 Create follow-up spec (009) for unification
- ⏱️ Schedule unification for Phase 2 or next sprint

---

## Decision Required

**Please decide**:
- [ ] **Option A**: Autonomy-Only (accept dual architecture, faster delivery)
- [ ] **Option B**: Unified Architecture (single pattern, constitution-compliant, longer timeline)
- [ ] **Option C**: Phased Migration (deliver autonomy first, migrate user messages second)

Once decided, I will:
1. Update spec.md, plan.md, tasks.md accordingly
2. Create ADR documenting the decision
3. Provide updated timeline and task breakdown
4. Flag any constitution violations requiring justification

**Your decision will fundamentally shape the architecture of Cerebrobot going forward.** Choose wisely! 🎯
