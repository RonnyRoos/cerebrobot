# Research: Conversation Thread Management UI

**Date**: 2025-10-08  
**Feature**: 003-frontend-changes-to  
**Status**: Phase 0 Complete

## Research Tasks & Findings

### 1. LangGraph Checkpoint Querying by userId

**Task**: Understand how to query LangGraph checkpoints filtered by userId

**Findings**:
- LangGraph checkpoints are stored in `LangGraphCheckpoint` table with `threadId` as primary identifier
- The existing architecture uses `sessionId` (from frontend) as `threadId` in LangGraph
- Current architecture documents show `userId` is passed via `configurable` context to LangGraph
- However, `userId` is **not directly stored** in the checkpoint table schema (see `prisma/schema.prisma`)

**Decision**: 
Use LangGraph's existing checkpoint architecture where `userId` is passed via `config.configurable.userId` (already implemented). Thread discovery uses Prisma direct queries, thread state access uses checkpointer APIs.

**Rationale**: 
- LangGraph already passes userId via `config.configurable` to all nodes and tools (see existing implementation in `apps/server/src/agent/langgraph-agent.ts`)
- Checkpointer automatically manages checkpoint state and metadata via its built-in serialization
- No manual metadata updates needed - LangGraph handles this
- **CRITICAL**: `checkpointer.list()` requires `thread_id` in config (per LangGraph docs) - cannot be used for thread discovery
- Solution: Use Prisma to query distinct thread_ids, then use checkpointer APIs to access state for each thread

**Implementation Pattern**: 
```typescript
// Step 1: Discover threads using Prisma (direct database query)
const threadRecords = await prisma.langGraphCheckpoint.findMany({
  select: { threadId: true, updatedAt: true },
  distinct: ['threadId'],
  orderBy: { updatedAt: 'desc' }
});

// Step 2: For each thread, use checkpointer APIs to get state
for (const {threadId} of threadRecords) {
  const config = { configurable: { thread_id: threadId, checkpoint_ns: '' } };
  const tuple = await checkpointer.getTuple(config);
  
  // Step 3: Filter by userId from configurable context
  if (tuple?.config?.configurable?.userId === userId) {
    const state = checkpointer.serde.loadsTyped(tuple.checkpoint);
    threads.push(deriveThreadMetadata(state, tuple));
  }
}
```

**Performance**: Acceptable for <1000 checkpoints; optimize later if needed

### 2. Extracting Thread Metadata from Checkpoint Data

**Task**: Determine how to extract last message, message count, and timestamp from checkpoint Bytes

**Findings**:
- Checkpoint `checkpointData` field is `Bytes` type (serialized graph state)
- LangGraph serializes state using MessagePack or similar binary format
- Deserialization requires LangGraph's internal deserializer
- Performance concern: deserializing every checkpoint to extract metadata is expensive

**Decision**: 
- **Primary strategy**: Derive thread metadata from checkpoint state at query time using checkpointer's serde
- **Data sources**:
  - Messages: Deserialize checkpoint state to access messages array
  - Timestamps: Use checkpoint table's `createdAt`/`updatedAt` columns
  - Title/preview: Extract from messages during list operation
- **Performance**: Cache derived metadata in memory for duration of request

**Rationale**: 
- Checkpointer's serde (`checkpointer.serde.loadsTyped()`) handles deserialization correctly
- Avoids manual metadata storage which duplicates LangGraph's state management
- Single source of truth: checkpoint state
- Efficient for typical use case (<100 threads)

**Implementation Pattern**:
```typescript
// In ThreadService.listThreads(userId)
// Step 1: Get distinct thread IDs from database
const threadRecords = await prisma.langGraphCheckpoint.findMany({
  select: { threadId: true, updatedAt: true },
  distinct: ['threadId'],
  orderBy: { updatedAt: 'desc' }
});

// Step 2: Access state for each thread via checkpointer
const threads = [];
for (const {threadId} of threadRecords) {
  const config = { configurable: { thread_id: threadId, checkpoint_ns: '' } };
  const tuple = await checkpointer.getTuple(config);
  
  if (tuple?.config?.configurable?.userId === userId) {
    const state = checkpointer.serde.loadsTyped(tuple.checkpoint);
    threads.push(deriveThreadMetadata(state, tuple));
  }
}
```

**Why Not `checkpointer.list()`**: LangGraph's `list()` method requires `thread_id` in config - it lists checkpoints WITHIN a known thread, not for thread discovery.

**Alternatives Considered**: 
- Store metadata separately: Violates single source of truth, sync issues
- Use checkpoint metadata field: LangGraph manages this internally, not for application data

### 3. Thread Title Derivation Strategy

**Task**: Implement "first user message (first 50 chars)" as thread title

**Findings**:
- Messages are stored in checkpoint state (graph state contains `messages` array)
- First user message may not exist yet (empty threads)
- Need to handle both initial title derivation and updates

**Decision**:
- **On thread creation**: Title = "New Conversation" (empty thread)
- **On first user message**: Extract first 50 chars, update metadata
- **Storage**: Store in checkpoint metadata as `{ title: string }`
- **Empty thread label**: Display "New Conversation" in UI for threads with no title

**Implementation Pattern**:
```typescript
function deriveThreadTitle(messages: Message[]): string {
  const firstUserMessage = messages.find(m => m.role === 'user');
  if (!firstUserMessage) return 'New Conversation';
  return firstUserMessage.content.substring(0, 50).trim() + 
    (firstUserMessage.content.length > 50 ? '...' : '');
}
```

### 4. React Component Architecture

**Task**: Design component structure for thread list UI

**Findings**:
- Existing app uses functional components with hooks
- Current routing: App.tsx → UserSetup (if no user) → ChatView
- Need to insert ThreadListView between UserSetup and ChatView

**Decision**: Component hierarchy
```
App.tsx (routing logic)
├── UserSetup.tsx (if no userId)
└── ThreadListView.tsx (if userId, no active thread)
    ├── ThreadListItem.tsx (per thread)
    └── EmptyState.tsx (if no threads)
└── ChatView.tsx (if userId + active threadId)
```

**State Management Strategy**:
- `useThreads()` hook: Fetch and manage thread list
- `useThreadHistory()` hook: Load history when resuming
- Lift threadId selection to App.tsx for routing
- Pass selected threadId to ChatView

**Rationale**: 
- Minimal changes to existing components
- Clear separation of concerns
- Hooks encapsulate data fetching logic

### 5. Performance Optimization Patterns

**Task**: Handle 100+ threads efficiently (SC-005 requirement)

**Findings**:
- Target: <2 seconds to load thread list
- PostgreSQL can handle hundreds of rows efficiently
- Rendering 100+ DOM elements requires optimization

**Decision**: 
- **Backend**: Index on metadata field for userId queries
  ```sql
  CREATE INDEX idx_checkpoint_metadata_userid 
  ON "LangGraphCheckpoint" USING gin (metadata jsonb_path_ops);
  ```
- **Backend**: Pagination ready but not required initially (future enhancement)
- **Frontend**: Virtual scrolling **NOT** implemented initially (KISS principle)
- **Frontend**: Render all threads initially; add virtualization only if performance issue detected

**Performance Budget**:
- Query time: <500ms for 100 threads
- Rendering time: <1000ms for initial paint
- Total: <2000ms (meets SC-001)

**Alternatives Considered**:
- Virtual scrolling (react-window): Deferred - premature optimization
- Infinite scroll: Explicitly deferred per spec assumptions

### 6. Fastify Route Patterns

**Task**: Best practices for thread API endpoints

**Findings**:
- Existing pattern: Route files in feature folders (e.g., `session/routes.ts`)
- Zod validation via `safeParse` before processing
- Structured error responses with details

**Decision**: Follow existing patterns
```typescript
// GET /api/threads?userId={uuid}
export function registerThreadRoutes(app: FastifyInstance, threadService: ThreadService) {
  app.get('/api/threads', async (request, reply) => {
    const schema = z.object({ userId: z.string().uuid() });
    const result = schema.safeParse(request.query);
    // ... standard error handling pattern
  });
}
```

**Rationale**: Consistency with existing codebase

### 7. Prisma Query Optimization

**Task**: Efficient checkpoint queries for thread metadata

**Findings**:
- Prisma supports `@db.JsonB` for JSONB fields
- Can use `path` queries for nested JSON: `metadata.path(['userId'])`
- Need raw SQL for GIN index queries for best performance

**Decision**: Hybrid approach
- Use Prisma for type safety when possible
- Use `$queryRaw` for complex JSONB queries requiring GIN index
- Example:
  ```typescript
  const threads = await prisma.$queryRaw`
    SELECT "threadId", "metadata", "updatedAt"
    FROM "LangGraphCheckpoint"
    WHERE metadata @> jsonb_build_object('userId', ${userId})
    ORDER BY "updatedAt" DESC
  `;
  ```

**Rationale**: Balance type safety with performance

### 8. Thread State Management Hooks

**Task**: Design hooks for thread and history management

**Findings**:
- Existing `useChatSession` manages single session
- Need similar pattern for thread list

**Decision**: Two new hooks

**`useThreads(userId: string)`**:
```typescript
interface UseThreadsResult {
  threads: ThreadMetadata[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}
```

**`useThreadHistory(threadId: string | null)`**:
```typescript
interface UseThreadHistoryResult {
  messages: Message[];
  isLoading: boolean;
  error: Error | null;
}
```

**Integration**: App.tsx manages active threadId state

**Rationale**: Separation of concerns, reusable hooks

### 9. Routing Integration Strategy

**Task**: Integrate thread list into existing App.tsx flow

**Findings**:
- Current flow: userId check → ChatView
- Need: userId check → ThreadList → ChatView (with threadId)

**Decision**: State-based routing in App.tsx
```typescript
const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

if (!userId) return <UserSetup />;
if (!activeThreadId) return <ThreadListView onSelectThread={setActiveThreadId} />;
return <ChatView threadId={activeThreadId} onBack={() => setActiveThreadId(null)} />;
```

**Rationale**: 
- No routing library needed (KISS)
- Simple state management
- Easy to test

### 10. sessionId/threadId Mapping

**Task**: Ensure consistent mapping between sessionId (frontend) and threadId (LangGraph)

**Findings**:
- Current architecture: `sessionId` from `/api/session` becomes `threadId` in LangGraph
- No explicit mapping table exists
- Direct 1:1 relationship

**Decision**: Continue 1:1 mapping
- `sessionId` (frontend term) === `threadId` (LangGraph/backend term)
- ThreadListView uses `threadId` for clarity
- ChatView receives `threadId`, internally may call it `sessionId` for backward compatibility
- Document this equivalence clearly in code comments

**Rationale**: 
- Simplest approach
- No breaking changes to existing flow
- Clear documentation prevents confusion

## Summary

All research tasks completed. Key decisions:

1. **userId in metadata**: Store userId in checkpoint metadata field for efficient querying
2. **Metadata-first approach**: Store thread metadata (title, lastMessage, count) in metadata to avoid checkpoint deserialization
3. **Thread title**: "First 50 chars of first user message" with "New Conversation" for empty threads
4. **Component structure**: ThreadListView → ThreadListItem pattern with hooks for data fetching
5. **Performance**: GIN index on metadata, defer virtual scrolling until proven necessary
6. **API patterns**: Follow existing Fastify/Zod patterns
7. **State management**: App.tsx manages activeThreadId, hooks manage data fetching
8. **sessionId=threadId**: Continue 1:1 mapping, document equivalence

**Next Phase**: Phase 1 - Design (data-model.md, contracts, quickstart.md)
