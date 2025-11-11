# Feature Specification: Agent Brain Activity Transparency

**Feature Branch**: `017-agent-brain`  
**Created**: 2025-01-12  
**Status**: Draft  
**Input**: User description: "Agent Brain Activity Transparency - Surface agent decision-making process (tool calls, memory operations, autonomy decisions) in real-time via Events & Effects architecture"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Observe Agent Tool Calls (Priority: P1)

As an operator, I want to see when the agent uses tools registered in the LangGraph implementation in real-time so I can understand what memory operations the agent is performing during conversation.

**Why this priority**: Tool calls represent the agent's most visible decision-making process and provide immediate transparency into memory operations. This is the foundation for brain activity visibility.

**Independent Test**: Can be fully tested by sending a message that triggers the `upsertMemory` tool (e.g., "Remember that I prefer dark mode"), observing the Activity tab show the tool invocation with timestamp, tool name, and arguments, and delivers immediate value by revealing the agent's memory-writing behavior.

**Currently Registered Tools** (as of this spec):
- `upsertMemory` - Store or update memories about the user (only LangChain tool currently bound to the model)

**Future Tools** (not yet implemented):
- Additional tools will be tracked automatically when added to `memoryTools` array and bound via `chatModel.bindTools()`

**Acceptance Scenarios**:

1. **Given** an active thread with an agent, **When** I send a message that triggers `upsertMemory`, **Then** the Activity tab shows the tool_call event with timestamp, tool name='upsertMemory', arguments (content, metadata, key), and result
2. **Given** the Activity tab is open, **When** the agent makes multiple tool calls in sequence, **Then** I see each tool call appear in chronological order with distinguishable visual indicators
3. **Given** a tool call completes, **When** I hover over the event, **Then** I see full details including execution duration and return value

---

### User Story 2 - Monitor Memory Operations (Priority: P2)

As an operator, I want to see when the agent searches its memory and what it retrieves so I can verify the agent is using relevant context from past conversations.

**Why this priority**: Memory searches reveal how the agent leverages historical context for decision-making. This is critical for debugging hallucinations and understanding context usage, but slightly less urgent than tool visibility since memory operations are internal rather than external.

**Independent Test**: Can be tested by referencing information from a previous conversation (e.g., "What did I tell you yesterday about my project?"), verifying the Activity tab shows the memory_search event with query terms and retrieved memory IDs, delivering value by exposing the agent's context retrieval strategy.

**Acceptance Scenarios**:

1. **Given** an ongoing conversation, **When** the agent performs a memory search, **Then** the Activity tab displays the search query, timestamp, and count of memories retrieved
2. **Given** a memory_search event is displayed, **When** I click "View Retrieved Memories", **Then** the Memories tab filters to show only the specific memories that were loaded into context
3. **Given** multiple memory searches occur in one turn, **When** viewing the Activity tab, **Then** I can distinguish between initial search, expansion searches, and follow-up searches

---

### User Story 3 - Track Autonomy Decisions (Priority: P3)

As an operator, I want to see when the agent decides to schedule follow-up messages autonomously so I can understand and control the agent's proactive behavior.

**Why this priority**: Autonomy decisions (from Spec 009) represent higher-level strategic thinking, but are less frequent than tool/memory operations. This priority allows implementation of core brain activity first while autonomy features are refined.

**Independent Test**: Can be tested by having a conversation where the agent decides to follow up (e.g., "I'll check back tomorrow"), verifying the Activity tab shows the schedule_timer effect with timestamp and follow-up time, delivering value by exposing autonomous scheduling behavior.

**Acceptance Scenarios**:

1. **Given** a conversation where the agent evaluates autonomy, **When** the agent decides to schedule a follow-up, **Then** the Activity tab shows the schedule_timer effect with the planned execution time
2. **Given** a scheduled follow-up is displayed, **When** I click on the event, **Then** I see the LLM's reasoning for why the follow-up was scheduled
3. **Given** the agent decides NOT to follow up, **When** viewing the Activity tab, **Then** I see a "no_followup_needed" event explaining why autonomy was not triggered

---

### User Story 4 - Observe Context Pruning (Priority: P4)

As an operator, I want to see when the agent prunes conversation context and what was removed so I can understand memory management decisions and potential information loss.

**Why this priority**: Context pruning is an internal optimization that affects conversation quality but is less frequent and less critical for basic transparency than tool/memory operations. Useful for advanced debugging but not essential for MVP.

**Independent Test**: Can be tested by having a very long conversation (>20 messages), triggering summarization, and verifying the Activity tab shows the context_pruned event with message count and pruning strategy, delivering value by exposing memory management behavior.

**Acceptance Scenarios**:

1. **Given** a conversation exceeding context limits, **When** the agent summarizes and prunes history, **Then** the Activity tab shows the context_pruned event with timestamp, number of messages removed, and summary generated
2. **Given** a pruning event is displayed, **When** I expand the details, **Then** I see the message IDs that were removed and the compression ratio achieved
3. **Given** multiple pruning events occur, **When** viewing the Activity timeline, **Then** I can track the evolution of context management throughout the conversation

---

### Edge Cases

- What happens when a tool call fails or times out? → Activity tab should show the error state with failure reason
- How does the system handle rapid-fire brain events (e.g., 10 tool calls in 2 seconds)? → Events are batched and displayed with microsecond precision timestamps; UI implements virtual scrolling
- What if the Activity tab is not open when events occur? → Events are persisted in the database and loaded when the tab is opened; no data loss
- How are brain events displayed for threads with multiple agents? → Events include agentId; UI filters by selected agent automatically
- What happens if the database query for brain activity fails? → UI shows error state with retry button; does not block conversation flow
- How do we handle very large payloads (e.g., tool call with 100KB response)? → Payloads are truncated in list view; full data available on click/expand

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST capture tool_call events ONLY for tools registered via `chatModel.bindTools()` in conversation-graph.ts (currently: `upsertMemory`)
- **FR-002**: System MUST capture memory_search events when the agent calls the retrieveMemories node
- **FR-003**: System MUST capture schedule_timer effects when the agent's evaluateAutonomy node creates autonomy follow-ups
- **FR-004**: System MUST capture context_pruned events when the agent's summarize node compresses conversation history
- **FR-005**: Brain activity events MUST include timestamp, event type, agentId, threadId, and type-specific payload (tool name/args, memory query/results, timer delay, pruning stats)
- **FR-006**: System MUST store brain activity via the Effects pattern (nodes return effects, SessionProcessor persists to OutboxStore)
- **FR-007**: System MUST distinguish event source (user|agent|system) via a 'source' column on the Event table
- **FR-008**: API MUST provide a GET endpoint (e.g., `/api/agents/:agentId/threads/:threadId/activity`) to retrieve brain activity
- **FR-009**: API MUST support pagination and filtering for brain activity (by event type, date range)
- **FR-010**: API MUST perform parallel queries (events table + effects table) and merge results in-memory using a decorator pattern
- **FR-011**: UI MUST rename MemoryBrowser component to AgentBrain and add an "Activity" tab alongside "Memories"
- **FR-012**: Activity tab MUST display brain events in reverse chronological order with visual distinction by event type
- **FR-013**: Activity tab MUST stream new events in real-time via WebSocket (similar to memory.created pattern)
- **FR-014**: Users MUST be able to expand/collapse event details (full payloads, execution timing) in the Activity tab
- **FR-015**: System MUST apply the same agent-scoped access control to brain activity as to memories (agents can only view their own activity)
- **FR-016**: Database schema MUST add a 'source' column (ENUM: 'user', 'agent', 'system') to the Event table via Prisma migration
- **FR-017**: Tool call tracking MUST NOT include hypothetical or unregistered tools; ONLY tools from the `memoryTools` array bound to the model

### Key Entities

- **BrainActivityEvent**: Represents a discrete decision or action taken by the agent
  - Attributes: id, threadId, agentId, timestamp, eventType (tool_call | memory_search | context_pruned | schedule_timer), source (user|agent|system), payload (JSON)
  - Sourced from: Event table (for agent-generated events like memory_search, context_pruned) OR Effect table (for tool_call, schedule_timer effects)
  - Relationships: Belongs to Thread, belongs to Agent
  
- **BrainActivityPayload**: Type-specific data for each event type
  - ToolCallPayload: { toolName: 'upsertMemory' (only registered tool currently), arguments: Record<string, any>, result?: any, duration?: number }
  - MemorySearchPayload: { query: string, retrievedCount: number, memoryIds: string[] }
  - ContextPrunedPayload: { messagesRemoved: number, summaryGenerated: string, compressionRatio: number }
  - ScheduleTimerPayload: { followUpTime: string, reasoning: string, autonomyDecision: boolean }

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Operators can observe agent tool calls in real-time with <500ms latency from invocation to UI display
- **SC-002**: Activity tab successfully displays brain events for threads with up to 1000 events without performance degradation (virtual scrolling)
- **SC-003**: 90% of brain activity queries return within 200ms for typical thread histories (50-100 events)
- **SC-004**: Zero data loss for brain events during normal operation (events are persisted before being emitted via WebSocket)
- **SC-005**: UI clearly distinguishes between the 4 event types (tool_call, memory_search, context_pruned, schedule_timer) with visual indicators
- **SC-006**: Operators can successfully filter and search brain activity by event type and date range
- **SC-007**: Database migration to add 'source' column completes without downtime for existing deployments

---

## Architecture & Implementation Strategy *(supplemental)*

### Architectural Decisions

1. **Hybrid Events + Effects Approach**: Store brain activity in BOTH events and effects tables
   - Rationale: Events table captures agent-generated observations (memory_search, context_pruned); Effects table captures commands (tool_call, schedule_timer)
   - Trade-off: Accepted dual-table storage to avoid semantic mismatch and maintain architectural consistency with Events & Effects pattern
   
2. **Parallel Queries + In-Memory Merge**: Query both tables separately, merge results client-side
   - Rationale: Simpler than UNION queries (which require matching column schemas), better performance isolation
   - Implementation: BrainActivityDecorator transforms raw Event/Effect rows into unified BrainActivityEvent type
   
3. **Effects Pattern for Emission**: Graph nodes return brain_activity effects, SessionProcessor persists
   - Rationale: Maintains Event Sourcing principles (nodes don't access EventStore directly), reuses existing orchestration
   - Implementation: conversation-graph.ts nodes return `{ type: 'brain_activity', payload: {...} }` in effects array
   
4. **Reuse Memory Infrastructure**: Brain activity API mirrors memory routes, WebSocket pattern, pagination
   - Rationale: Proven patterns reduce implementation complexity, consistent operator experience
   - Implementation: `/api/agents/:agentId/threads/:threadId/activity` follows same structure as `/api/agents/:agentId/memories`

5. **Tool Tracking Scope**: ONLY track tools registered via `chatModel.bindTools(memoryTools)` in conversation-graph.ts
   - Rationale: Prevents "random shit" showing up in Activity tab; ensures all tracked tools are real, registered, and executable
   - Current registered tools: `upsertMemory` (from apps/server/src/agent/memory/tools.ts)
   - Future tools: Will be automatically tracked when added to `memoryTools` array
   - Implementation: ToolNode wrapper extracts tool calls from LangGraph's message history (only contains calls to registered tools)

### Database Changes

**Migration**: Add 'source' column to Event table

```prisma
model Event {
  id         String   @id @default(uuid())
  sessionKey String
  seq        Int
  type       String   // Existing: 'user_message', 'timer'
  source     EventSource @default(USER) // NEW
  payload    Json
  createdAt  DateTime @default(now())

  @@unique([sessionKey, seq])
  @@index([sessionKey])
  @@index([createdAt])
  @@index([source]) // NEW
}

enum EventSource {
  USER
  AGENT
  SYSTEM
}
```

**Why**: Distinguishes user-initiated events (user_message) from agent-generated observations (memory_search, context_pruned). Required for accurate brain activity filtering.

### API Endpoints

**New Route**: `GET /api/agents/:agentId/threads/:threadId/activity`

**Query Parameters**:
- `type?: 'tool_call' | 'memory_search' | 'context_pruned' | 'schedule_timer'` - Filter by event type
- `startDate?: ISO8601` - Filter events after this timestamp
- `endDate?: ISO8601` - Filter events before this timestamp
- `limit?: number` - Pagination (default 50, max 200)
- `offset?: number` - Pagination offset

**Response**:
```typescript
{
  activity: BrainActivityEvent[];
  total: number;
  limit: number;
  offset: number;
}
```

**Implementation**:
1. Parallel queries: `EventStore.findByThread(threadId, { source: 'agent' })` + `OutboxStore.findByThread(threadId, { type: ['tool_call', 'schedule_timer'] })`
2. Merge arrays in-memory, sort by timestamp
3. Apply filters (type, date range)
4. Paginate
5. Transform via BrainActivityDecorator

**WebSocket Events**:
- `brain_activity.created` - Emitted when new brain event is persisted
- Payload: `{ threadId, agentId, event: BrainActivityEvent }`
- Follows same pattern as `memory.created` event

### UI Changes

**Component Rename**: `MemoryBrowser` → `AgentBrain`

**New Structure**:
```tsx
<AgentBrain agentId={agentId} threadId={threadId}>
  <Tabs>
    <Tab label="Memories">
      <MemoryList /> {/* Existing component */}
    </Tab>
    <Tab label="Activity">
      <ActivityList /> {/* New component */}
    </Tab>
  </Tabs>
</AgentBrain>
```

**ActivityList Component**:
- Displays BrainActivityEvent[] in reverse chronological order
- Visual indicators: Color-coded icons for each event type (tool=blue, memory=green, context=orange, timer=purple)
- Expandable rows: Click to show full payload JSON
- Real-time updates: WebSocket listener for `brain_activity.created`
- Virtual scrolling: Handle 1000+ events without DOM bloat
- Filter controls: Dropdown for event type, date range picker

**Reuse Patterns**:
- Pagination logic from MemoryList
- WebSocket subscription from MemoryList
- Loading states, error handling from MemoryList
- Tab navigation from existing UI patterns

### Graph Node Changes

**ToolNode Decorator** (new):
```typescript
// Wrap LangGraph's ToolNode to emit brain_activity effects
// IMPORTANT: Only tracks tools registered via chatModel.bindTools(memoryTools)
class InstrumentedToolNode extends ToolNode {
  async invoke(state: ConversationState) {
    const result = await super.invoke(state);
    const toolCalls = state.messages.filter(m => m.tool_calls);
    
    // Only emit events for registered tools (currently: upsertMemory)
    // Do NOT emit for hypothetical or unregistered tools
    const effects = toolCalls.map(call => ({
      type: 'brain_activity',
      payload: {
        eventType: 'tool_call',
        toolName: call.name, // e.g., 'upsertMemory'
        arguments: call.args,
        result: call.result,
        timestamp: new Date().toISOString()
      }
    }));
    
    return { ...result, effects: [...result.effects || [], ...effects] };
  }
}
```

**retrieveMemories Node** (modify):
```typescript
// Add brain_activity effect when searching memory
async retrieveMemories(state: ConversationState) {
  const query = extractQuery(state.messages);
  const memories = await memoryStore.search(query);
  
  return {
    memories,
    effects: [{
      type: 'brain_activity',
      payload: {
        eventType: 'memory_search',
        query,
        retrievedCount: memories.length,
        memoryIds: memories.map(m => m.id),
        timestamp: new Date().toISOString()
      }
    }]
  };
}
```

**summarize Node** (modify):
```typescript
// Add brain_activity effect when pruning context
async summarize(state: ConversationState) {
  const { summary, prunedMessages } = await summarizeHistory(state.messages);
  
  return {
    summary,
    effects: [{
      type: 'brain_activity',
      payload: {
        eventType: 'context_pruned',
        messagesRemoved: prunedMessages.length,
        summaryGenerated: summary,
        compressionRatio: calculateRatio(prunedMessages, summary),
        timestamp: new Date().toISOString()
      }
    }]
  };
}
```

**evaluateAutonomy Node** (already emits schedule_timer effects, no change needed)

### Implementation Timeline

**Week 1: Database & Backend**
- Day 1-2: Prisma migration for 'source' column, update Event model
- Day 3-4: Implement BrainActivityDecorator, parallel query logic
- Day 5: Create `/api/agents/:agentId/threads/:threadId/activity` endpoint
- Day 6-7: Add brain_activity effects to graph nodes (tool, memory, summarize)

**Week 2: Frontend & Integration**
- Day 1-2: Rename MemoryBrowser → AgentBrain, add Activity tab scaffolding
- Day 3-4: Implement ActivityList component with virtual scrolling
- Day 5: WebSocket integration for real-time brain_activity.created events
- Day 6: Filter controls, date range picker, event type dropdown
- Day 7: Integration testing, performance validation, documentation

### Testing Strategy

**Unit Tests**:
- BrainActivityDecorator transforms Event/Effect rows correctly
- Parallel query logic merges and sorts properly
- Graph nodes emit correct brain_activity effects
- ActivityList renders different event types with proper icons

**Integration Tests**:
- End-to-end: Send message → tool call → verify brain_activity.created WebSocket event → verify Activity tab displays event
- Database migration: Verify 'source' column added without data loss
- API pagination: Verify limit/offset work correctly for large activity histories
- WebSocket reconnection: Verify Activity tab recovers from connection loss

**Performance Tests**:
- Load 1000 brain events, verify <200ms query time
- Render 1000 events in ActivityList, verify smooth scrolling
- Parallel queries under load: Verify no N+1 issues

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Dual-table queries slow for large threads | High | Implement database indexes on threadId, createdAt; use pagination aggressively |
| Graph nodes performance degraded by effect emission | Medium | Effects are lightweight (JSON serialization only); no external I/O in nodes |
| UI bloat from large brain event payloads | Medium | Truncate payloads in list view, full data on expand; virtual scrolling |
| Migration breaks existing Event inserts | High | Default 'source' to USER; update existing code to explicitly set source='agent' |
| WebSocket events dropped under load | Medium | Persist events before emitting; UI can poll as fallback |

### Out of Scope (Deferred)

- Agent "liveliness" controls (temperature, creativity, autonomy thresholds) → Separate spec
- Historical analytics on brain activity (e.g., "most used tools over time") → Future enhancement
- Export brain activity to CSV/JSON → Future enhancement
- Brain activity visualization (graphs, timelines) → Future enhancement
- Cross-thread brain activity comparison → Future enhancement

---

## Open Questions

1. **Event Retention**: How long should brain_activity events be retained? Should they follow the same retention policy as conversation messages?
   - **Proposed Answer**: Match conversation retention (currently unlimited); add configurable pruning in future spec
   
2. **Payload Size Limits**: Should we enforce max payload size for brain_activity events to prevent database bloat?
   - **Proposed Answer**: Implement soft limit (warn at 10KB, truncate at 50KB) with full payload stored in separate blob storage if needed
   
3. **Real-time vs Polling**: Should Activity tab poll for new events as fallback when WebSocket fails, or rely solely on WebSocket with manual refresh?
   - **Proposed Answer**: Implement WebSocket-first with automatic fallback to polling (30s interval) on connection failure
   
4. **Event Deletion**: Should operators be able to delete individual brain events, or are they immutable audit logs?
   - **Proposed Answer**: Immutable for audit integrity; deletion requires deleting entire thread

---

## References

- **Spec 008**: [Events & Effects Architecture](../008-migrate-to-events-effects/)
- **Spec 009**: [Server-Side Autonomy](../009-server-side-autonomy/)
- LangGraph Documentation: StateGraph, MessagesAnnotation, ToolNode
- Existing Memory System: `apps/server/src/agent/memory/store.ts`, `apps/client/src/components/MemoryBrowser/`
- Conversation Graph: `apps/server/src/agent/graph/conversation-graph.ts`
- Memory Tools (registered tools): `apps/server/src/agent/memory/tools.ts` (currently: `upsertMemory`)
