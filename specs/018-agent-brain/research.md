# Research: Agent Brain Activity Transparency

**Phase**: 0 (Outline & Research)  
**Date**: 2025-11-11  
**Purpose**: Resolve unknowns from Technical Context and establish implementation patterns

## Research Tasks Completed

### 1. LangGraph ToolNode Instrumentation Pattern

**Question**: How to wrap LangGraph's ToolNode to emit custom effects without breaking tool execution?

**Decision**: Extend ToolNode class and override `invoke` method

**Rationale**:
- LangGraph's ToolNode is designed to be extended (public class, standard invoke signature)
- Overriding `invoke` allows inspection of tool calls from state.messages after super.invoke()
- Effects can be appended to existing effects array in return value
- No modification of tool execution logic required

**Pattern**:
```typescript
class InstrumentedToolNode extends ToolNode {
  async invoke(state: ConversationState) {
    const result = await super.invoke(state);
    const toolCalls = state.messages.filter(m => m.tool_calls);
    
    const brainEffects = toolCalls.map(call => ({
      type: 'brain_activity',
      payload: {
        eventType: 'tool_call',
        toolName: call.name,
        arguments: call.args,
        result: call.result,
        timestamp: new Date().toISOString()
      }
    }));
    
    return { ...result, effects: [...(result.effects || []), ...brainEffects] };
  }
}
```

**Alternatives Considered**:
- **Monkey-patching ToolNode.invoke**: Rejected (fragile, breaks on LangGraph updates)
- **Separate observer node after ToolNode**: Rejected (adds graph complexity, duplicates state traversal)
- **Middleware pattern**: Rejected (LangGraph doesn't support middleware for individual nodes)

**References**:
- LangGraph Documentation: StateGraph, ToolNode patterns
- Existing code: `apps/server/src/agent/graph/conversation-graph.ts` (L265: existing ToolNode usage)

---

### 2. Parallel Query Performance for Events + Effects

**Question**: What's the optimal strategy for querying two tables (Event, Effect) and merging results without database UNION complexity?

**Decision**: Parallel Promise.all queries with in-memory sort/merge via BrainActivityDecorator

**Rationale**:
- PostgreSQL query planner handles parallel execution efficiently for independent queries
- In-memory merge is O(n log n) for sorting, acceptable for thread-scoped data (hundreds of events)
- Avoids schema alignment issues (Event and Effect tables have different columns)
- Enables separate indexes (Event.source, Effect.type) optimized for each query
- Simpler error handling (one query failure doesn't block the other)

**Pattern**:
```typescript
async function getBrainActivity(threadId: string, agentId: string, filters: BrainActivityFilters) {
  // Parallel queries
  const [agentEvents, brainEffects] = await Promise.all([
    eventStore.findByThread(threadId, { source: 'agent', type: ['memory_search', 'context_pruned'] }),
    outboxStore.findByThread(threadId, { type: ['tool_call', 'schedule_timer'] })
  ]);
  
  // Transform to unified type
  const decorator = new BrainActivityDecorator();
  const events = agentEvents.map(e => decorator.fromEvent(e));
  const effects = brainEffects.map(e => decorator.fromEffect(e));
  
  // Merge and sort
  const all = [...events, ...effects].sort((a, b) => 
    b.timestamp.getTime() - a.timestamp.getTime()
  );
  
  // Apply filters and pagination
  return applyFilters(all, filters);
}
```

**Performance Considerations**:
- Database indexes: `Event(threadId, source, createdAt)`, `Effect(threadId, type, createdAt)`
- Pagination applied after merge (fetch only relevant page from each table using limit/offset)
- Virtual scrolling in UI handles large result sets (1000+ events)

**Alternatives Considered**:
- **UNION query**: Rejected (requires matching column schemas, complex NULL handling, harder to index)
- **Sequential queries**: Rejected (2x latency, no parallelism benefit)
- **Materialized view**: Rejected (adds complexity, overkill for read-light use case)

**References**:
- Existing code: `apps/server/src/events/events/EventStore.ts`, `apps/server/src/events/effects/OutboxStore.ts`
- PostgreSQL documentation: Parallel query execution

---

### 3. WebSocket Reconnection Strategy

**Question**: How to implement 3-retry auto-reconnect with 5s delay using existing WebSocket infrastructure?

**Decision**: Reuse existing WebSocket connection management from MemoryBrowser/chat components

**Rationale**:
- Cerebrobot already has WebSocket reconnection logic for chat messages
- Consistent UX across features (same connection status indicator, same reconnect behavior)
- Avoids duplicating connection state management
- WebSocket connection is shared across multiple subscriptions (chat + brain_activity.created)

**Pattern** (client-side):
```typescript
// Reuse existing WebSocket hook
const { connected, reconnect } = useWebSocket();
const { brainActivity, isLoading } = useBrainActivity(threadId, agentId);

// Subscribe to brain_activity.created events
useEffect(() => {
  if (!connected) return;
  
  const handler = (event: BrainActivityCreatedEvent) => {
    // Update local state
  };
  
  ws.on('brain_activity.created', handler);
  return () => ws.off('brain_activity.created', handler);
}, [connected]);

// UI displays connection status
{!connected && <ConnectionStatusBadge status="disconnected" onReconnect={reconnect} />}
```

**Configuration** (existing WebSocket manager):
- Max retries: 3
- Retry delay: 5s (exponential backoff: 5s, 10s, 15s)
- Manual reconnect button after exhausting retries

**Alternatives Considered**:
- **Separate WebSocket for brain activity**: Rejected (doubles connection overhead, split brain architecture)
- **Polling fallback**: Rejected (user explicitly chose no polling, FR-020)
- **Infinite retry**: Rejected (exhausts server resources during outages)

**References**:
- Existing code: `apps/client/src/hooks/useWebSocket.ts` (if exists), chat WebSocket implementation
- Spec clarification: Session 2025-11-11 (Q4: 3 retries, 5s delay, manual reconnect)

---

### 4. Design Library Component Gaps

**Question**: Which UI components exist in @workspace/ui and which need to be created for Activity tab?

**Decision**: Create 2 new components in @workspace/ui before implementing Activity tab

**Existing Components (confirmed via Storybook)**:
- ✅ Box, Stack, Text, Button (primitives)
- ✅ Tabs (from existing MemoryBrowser, will be reused in AgentBrain)
- ✅ LoadingSpinner, ErrorMessage (existing error states)

**Components to Create**:
1. **ActivityEventCard** - Display individual brain event with:
   - Event type icon (color-coded: tool=blue, memory=green, context=orange, timer=purple)
   - Timestamp (relative: "2 minutes ago")
   - Event summary (tool name, memory query, etc.)
   - Expandable details (full payload JSON)
   - CVA variants: `variant` (tool|memory|context|timer), `expanded` (boolean)

2. **ConnectionStatusBadge** - Show WebSocket connection state:
   - Status indicator (connected=green dot, disconnected=red dot, reconnecting=yellow pulse)
   - Reconnect button (only shown when disconnected)
   - CVA variants: `status` (connected|disconnected|reconnecting)

**Contribution Workflow**:
1. Implement components in `/packages/ui/src/components/`
2. Add unit tests in `/packages/ui/__tests__/components/`
3. Create Storybook stories in `/packages/ui/src/stories/`
4. Export from `/packages/ui/src/index.ts`
5. Validate with axe-core accessibility tests
6. Use in ActivityList component

**Design Tokens to Use**:
- Colors: `--color-accent-primary` (blue), `--color-success` (green), `--color-warning` (orange), `--color-secondary` (purple)
- Spacing: `--space-2`, `--space-4`, `--space-6`
- Border radius: `--radius-md`
- Glassmorphism: `--glass-surface`, `--glass-border`

**Alternatives Considered**:
- **Ad-hoc components in apps/client**: Rejected (violates Principle IX: Design Library First)
- **External library (e.g., Recharts for timeline)**: Rejected (YAGNI, simple list view sufficient for MVP)

**References**:
- Constitution Principle IX: Design Library First
- Storybook: http://localhost:6006
- Existing code: `/packages/ui/src/components/`, `/apps/client/src/components/MemoryBrowser/`

---

### 5. Prisma Migration Strategy for Event.source Column

**Question**: How to add EventSource enum and source column without breaking existing Event inserts?

**Decision**: Use Prisma migration with DEFAULT value and backward-compatible enum

**Migration Steps**:
1. Create EventSource enum: `USER | AGENT | SYSTEM`
2. Add `source EventSource @default(USER)` column to Event model
3. Add index: `@@index([source])` for filtering queries
4. Generate migration: `pnpm prisma migrate dev --name add_event_source`
5. Update EventStore.create() calls to explicitly set `source: 'agent'` for brain activity

**Schema Change**:
```prisma
enum EventSource {
  USER
  AGENT
  SYSTEM
}

model Event {
  id         String      @id @default(uuid())
  sessionKey String
  seq        Int
  type       String
  source     EventSource @default(USER)  // NEW
  payload    Json
  createdAt  DateTime    @default(now())

  @@unique([sessionKey, seq])
  @@index([sessionKey])
  @@index([createdAt])
  @@index([source])  // NEW
}
```

**Backward Compatibility**:
- Existing code creates Events without `source` → defaults to USER (correct for user_message events)
- New brain activity code explicitly sets `source: 'agent'`
- No data migration needed (existing rows default to USER)

**Rollback Plan**:
- If migration fails: `pnpm prisma migrate resolve --rolled-back YYYYMMDDHHMMSS_add_event_source`
- Remove source column from code
- Revert to previous schema

**Alternatives Considered**:
- **Add source as nullable column**: Rejected (NULL semantics unclear, requires application-level defaults)
- **Separate BrainActivityEvent table**: Rejected (violates hybrid Events+Effects architecture decision)
- **Store source in payload JSON**: Rejected (can't index JSON fields efficiently, harder to query)

**References**:
- Prisma documentation: Migrations, enums, default values
- Existing code: `prisma/schema.prisma`, `apps/server/src/events/events/EventStore.ts`

---

## Summary of Resolved Unknowns

| Unknown from Technical Context | Resolution | Source |
|--------------------------------|------------|--------|
| ToolNode instrumentation pattern | Extend ToolNode class, override invoke | LangGraph docs + existing code |
| Parallel query performance | Promise.all + in-memory sort (O(n log n)) | PostgreSQL best practices |
| WebSocket reconnection strategy | Reuse existing connection manager | Existing chat WebSocket code |
| Design library component gaps | Create ActivityEventCard + ConnectionStatusBadge | Storybook inventory |
| Prisma migration strategy | Add enum + column with DEFAULT value | Prisma migration docs |

All NEEDS CLARIFICATION items from Technical Context are now resolved. Proceeding to Phase 1 (Design & Contracts).
