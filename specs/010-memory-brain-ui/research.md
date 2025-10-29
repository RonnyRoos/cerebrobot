# Research Document: Memory Brain Surfacing

**Feature**: `010-memory-brain-ui`  
**Phase**: 0 (Research)  
**Status**: In Progress  
**Created**: 2025-10-29

## Purpose

This document identifies technical unknowns that must be resolved before proceeding to design and contracts (Phase 1). Each unknown maps to a specific functional requirement from the spec and must be researched independently.

## Technical Unknowns

### 1. WebSocket Event Broadcasting for Real-Time Memory Updates

**Requirement**: FR-002, FR-007 (auto-open sidebar when memory created, sync all views without refresh)

**Unknown**: How to emit memory lifecycle events (created/updated/deleted) to all connected WebSocket clients for a specific thread? The existing `ConnectionManager` tracks thread-persistent connections, but there's no established pattern for broadcasting non-chat events.

**Questions**:
- Should memory events reuse the `ChatStreamEvent` type or define new event types?
- Should memory events use the existing request/response multiplexing (requestId correlation), or broadcast without correlation?
- How do we handle multiple browser tabs (5-10 concurrent connections per spec) without duplicating events?
- Should memory events be delivered via the EffectRunner/OutboxStore pattern (spec 008) or inline broadcasts?

**Research Needed**:
- Review `ChatStreamEvent` schema in `packages/chat-shared/src/schemas/messages.ts`
- Examine `ConnectionManager.getConnectionsByThread()` for broadcast pattern
- Check if EffectRunner already supports custom effect types beyond assistant.message
- Determine if memory events should be persistent (outbox-backed) or ephemeral (direct WebSocket)

**Impact**: Determines event schema design and WebSocket handler implementation in Phase 1.

---

### 2. Semantic Search Pagination Strategy

**Requirement**: FR-005, FR-019, FR-020 (rank search results by relevance, responsive for 100+ memories, <3s for 1000 memories)

**Unknown**: How to paginate semantic search results efficiently when similarity scores determine ranking? The existing `PostgresMemoryStore.search()` method supports `limit` option but no offset/cursor pattern.

**Questions**:
- Should pagination use offset-based (`OFFSET n LIMIT m`) or cursor-based (`WHERE similarity > threshold AND id > cursor`)?
- Does pgvector's IVFFlat index maintain consistent ordering for `ORDER BY embedding <=> query_embedding` across paginated queries?
- What threshold should filter results before pagination to balance relevance vs. result count?
- Should the UI implement infinite scroll, "Load More" button, or traditional page navigation?

**Research Needed**:
- Test if pgvector IVFFlat index produces stable sort order for multiple queries with identical embeddings
- Benchmark query performance with OFFSET vs. cursor-based pagination for 1000+ memories
- Review existing migrations (`20251007110700_add_ivfflat_index`) for index configuration
- Check if Prisma rawQuery supports cursor-based pagination patterns

**Impact**: Determines REST API contract for `/api/memory/search` endpoint and UI infinite scroll implementation.

---

### 3. Duplicate Detection Implementation Strategy

**Requirement**: FR-015, FR-016 (prevent duplicates at 0.95 threshold, show similarity indicators at 0.90)

**Unknown**: Should duplicate detection run synchronously during `upsertMemory` tool execution (blocking), asynchronously via background job, or client-side before submission?

**Questions**:
- Can duplicate detection complete within LLM tool timeout limits (~5-10 seconds for upsertMemory)?
- Should the agent be blocked from storing duplicates, or should duplicates be flagged after storage?
- How do we handle the agent rejecting duplicate storage—return error to LLM or silently skip?
- Should similarity checks scan ALL memories in namespace or only recent N memories?

**Research Needed**:
- Benchmark `PostgresMemoryStore.search()` latency for similarity=0.95 queries against 100/500/1000 memories
- Review existing `upsertMemory` tool implementation in `apps/server/src/agent/memory/nodes.ts`
- Check if LangGraph tool nodes support async validation hooks or pre-execution checks
- Determine if duplicate detection should emit warnings to operator via UI notifications

**Impact**: Determines whether duplicate detection lives in MemoryService (backend), tool node (agent), or UI (client).

---

### 4. Memory Browser State Management Pattern

**Requirement**: FR-001, FR-008 (sidebar toggle, persist state across sessions)

**Unknown**: Should memory browser state (open/closed, active filters, scroll position) be managed in React local state, browser localStorage, or persisted server-side in database?

**Questions**:
- Does the operator expect sidebar state to sync across multiple browser tabs, or is per-tab state acceptable?
- Should search query history be persisted for quick re-execution?
- What happens to sidebar state when operator switches threads—reset or preserve?
- Should sidebar state be scoped per-thread or global across all threads?

**Research Needed**:
- Review existing client state patterns in `useChatSession.ts`, `useThreads.ts` for localStorage usage
- Check if any existing UI state persists across tabs (e.g., agent selection, thread list filters)
- Evaluate if sidebar state complexity justifies a state management library (Zustand, Jotai) or plain React Context

**Impact**: Determines UI architecture for MemoryBrowser component and API contract for persisted preferences.

---

### 5. Memory Capacity Warning UX Pattern

**Requirement**: FR-022 (warn at 80% capacity = 800/1000 memories)

**Unknown**: Should capacity warnings be displayed as persistent banner, dismissible toast, sidebar badge, or modal dialog?

**Questions**:
- Can operators dismiss the warning permanently, or should it reappear until capacity drops below 80%?
- Should the warning block memory creation (hard limit) or just advise cleanup (soft limit)?
- Where does capacity enforcement happen—client-side validation, REST API rejection, or database constraint?
- Should the system suggest specific memories to delete based on age, low similarity, or manual review?

**Research Needed**:
- Review existing client notification patterns (check if toast/banner library already installed)
- Determine if memory count is exposed via REST API (`GET /api/memory/stats`) or WebSocket events
- Check if PostgreSQL schema enforces any memory limits per user/thread

**Impact**: Determines notification UI components and capacity tracking API contracts.

---

### 6. Memory Edit Conflict Resolution

**Requirement**: FR-025 (handle multiple browser tabs without conflicts)

**Unknown**: What happens when the same memory is edited simultaneously in two browser tabs? Should the system use optimistic locking, last-write-wins, or explicit conflict resolution?

**Questions**:
- Does `PostgresMemoryStore.put()` currently support optimistic locking (e.g., `WHERE updated_at = expected_timestamp`)?
- Should the UI refresh memory list on every WebSocket event to detect external changes before editing?
- If conflict detected, should the operator see a diff view, or simply a "Memory changed, reload?" message?
- Should memory edits be queued/debounced to reduce conflict probability?

**Research Needed**:
- Review Prisma `memories` table schema for `updated_at` column usage
- Check if `PUT /api/memory/:id` endpoint currently validates timestamps or uses upsert semantics
- Examine how `useThreadConnection.ts` handles concurrent message sending (for similar conflict patterns)

**Impact**: Determines edit endpoint contract (version field, conflict response codes) and UI conflict handling logic.

---

## Research Outcomes

*This section will be populated after each unknown is investigated. Outcomes inform Phase 1 design decisions.*

### Unknown 1: WebSocket Event Broadcasting
**Status**: Not Started  
**Decision**: [TBD after research]  
**Rationale**: [TBD]

### Unknown 2: Semantic Search Pagination
**Status**: Not Started  
**Decision**: [TBD after research]  
**Rationale**: [TBD]

### Unknown 3: Duplicate Detection Strategy
**Status**: Not Started  
**Decision**: [TBD after research]  
**Rationale**: [TBD]

### Unknown 4: Memory Browser State Management
**Status**: Not Started  
**Decision**: [TBD after research]  
**Rationale**: [TBD]

### Unknown 5: Capacity Warning UX
**Status**: Not Started  
**Decision**: [TBD after research]  
**Rationale**: [TBD]

### Unknown 6: Memory Edit Conflicts
**Status**: Not Started  
**Decision**: [TBD after research]  
**Rationale**: [TBD]

---

## Next Steps

1. **Prioritize Unknowns**: Research unknowns in order of blocking impact:
   - Unknown 1 (WebSocket events) blocks all real-time features
   - Unknown 2 (pagination) blocks search UI
   - Unknown 3 (duplicates) blocks quality management
   - Unknowns 4-6 can be researched in parallel

2. **Assign Research Tasks**: Create investigation tickets for each unknown

3. **Update Plan**: After all unknowns resolved, proceed to Phase 1 (Design & Contracts)

4. **Document Decisions**: Record all research outcomes in this file and reference in data-model.md / contracts/

---

**Research Complete When**: All 6 unknowns have "Decision" and "Rationale" filled in, no blocking questions remain.
