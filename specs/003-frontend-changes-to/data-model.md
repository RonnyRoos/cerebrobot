# Data Model: Conversation Thread Management

**Date**: 2025-10-08  
**Feature**: 003-frontend-changes-to  
**Status**: Phase 1

## Overview

This document defines the data structures for conversation thread management, including thread metadata, thread list responses, and message history. The data model leverages existing LangGraph checkpoint infrastructure with metadata enhancements.

## Core Entities

### ThreadMetadata

Represents summary information about a single conversation thread.

**Source**: Derived from `LangGraphCheckpoint` table at query time via checkpointer APIs

**Fields**:

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `threadId` | string | Yes | Unique thread identifier (same as sessionId) | UUID v4 |
| `userId` | string | Yes | Owner of the thread (from checkpoint configurable) | UUID v4 |
| `title` | string | Yes | Thread title (first 50 chars of first user message) | Min 1 char, max 50 chars |
| `lastMessage` | string | Yes | Preview of last message | Max 100 chars |
| `lastMessageRole` | 'user' \| 'assistant' | Yes | Who sent the last message | Enum |
| `messageCount` | number | Yes | Total messages in thread | Integer ≥ 0 |
| `createdAt` | Date | Yes | Thread creation timestamp | ISO 8601 |
| `updatedAt` | Date | Yes | Last activity timestamp | ISO 8601 |
| `isEmpty` | boolean | Yes | True if no messages yet | Derived: messageCount === 0 |

**Derivation Logic** (executed in ThreadService.listThreads()):
- `threadId`: From checkpoint's `thread_id` 
- `userId`: From `checkpoint.config.configurable.userId`
- `title`: Extract from first user message; default "New Conversation" if empty
- `lastMessage`: Last message content truncated to 100 chars
- `lastMessageRole`: Role of last message in checkpoint state
- `messageCount`: Count of messages in deserialized checkpoint state
- `isEmpty`: Computed from messageCount
- `createdAt`/`updatedAt`: From checkpoint table columns

**Data Flow**:
1. ThreadService calls `checkpointer.list(config)` to get checkpoints
2. For each checkpoint: `checkpointer.serde.loadsTyped(checkpoint.checkpoint)` to deserialize state
3. Extract messages array from state
4. Derive metadata fields from messages + checkpoint metadata
5. Return ThreadMetadata array

**Storage Location**: 
- **NOT stored separately** - derived on-demand from checkpoint state
- Source: `LangGraphCheckpoint` table via checkpointer APIs
- userId from: `checkpoint.config.configurable.userId`
- Messages from: Deserialized checkpoint state
- Timestamps from: Checkpoint table columns (`createdAt`, `updatedAt`)

### ThreadListResponse

API response containing list of threads for a user.

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `threads` | ThreadMetadata[] | Yes | Array of thread metadata |
| `total` | number | Yes | Total count (same as threads.length initially) |

**Sorting**: Threads sorted by `updatedAt` DESC (most recent first)

**Filtering**: By `userId` (enforced at API level)

**Future Enhancement**: Pagination fields (`offset`, `limit`, `hasMore`) deferred per spec assumptions

### MessageHistory

Represents the complete conversation history for a thread.

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `threadId` | string | Yes | Thread identifier | 
| `messages` | Message[] | Yes | Ordered array of messages |

**Message Structure** (reuses existing chat message schema):

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Message identifier |
| `role` | 'user' \| 'assistant' | Message sender |
| `content` | string | Message text |
| `timestamp` | Date | When message was sent |

**Ordering**: Messages sorted chronologically (oldest first)

**Completeness**: Always returns complete history (no pagination per clarifications)

## Database Schema Changes

### LangGraphCheckpoint Table (Existing - No Changes Required)

**No schema changes needed** - using existing structure with checkpointer APIs:

```prisma
model LangGraphCheckpoint {
  id                 String   @id
  threadId           String   @map("thread_id")
  checkpointNamespace String  @map("checkpoint_ns")
  checkpointId       String   @map("checkpoint_id")
  parentCheckpointId String?  @map("parent_checkpoint_id")
  checkpointData     Bytes    @map("checkpoint")
  metadata           Bytes    @map("metadata")  // Managed by LangGraph
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")
  // ... existing relations
}
```

**Data Access Pattern**:
- Use checkpointer APIs: `checkpointer.list()`, `checkpointer.getTuple()`
- Deserialize state: `checkpointer.serde.loadsTyped(checkpoint.checkpoint)`
- Extract userId: `checkpoint.config.configurable.userId`
- Derive metadata: From deserialized state at query time

**Query Pattern** (in ThreadService):
```typescript
// List threads for a user
// Step 1: Discover thread IDs via Prisma
const threadRecords = await prisma.langGraphCheckpoint.findMany({
  select: { threadId: true, updatedAt: true },
  distinct: ['threadId'],
  orderBy: { updatedAt: 'desc' }
});

// Step 2: Access checkpoint state via checkpointer APIs
const userThreads = [];
for (const {threadId} of threadRecords) {
  const config = { configurable: { thread_id: threadId, checkpoint_ns: '' } };
  const tuple = await checkpointer.getTuple(config);
  
  // Step 3: Filter by userId from configurable context
  if (tuple?.config?.configurable?.userId === userId) {
    const state = checkpointer.serde.loadsTyped(tuple.checkpoint);
    const metadata = deriveThreadMetadata(state, tuple);
    userThreads.push(metadata);
  }
}
```

**Why This Pattern**:
- `checkpointer.list()` requires `thread_id` in config (per LangGraph docs) - cannot be used for thread discovery
- Prisma query provides thread discovery (what threads exist)
- Checkpointer APIs provide state access (thread content)
- Single source of truth: checkpoint state
- Acceptable for <1000 checkpoints; optimize later if needed

## State Transitions

### Thread Lifecycle

```
[No Thread] 
    ↓ (User clicks "New Conversation")
[Empty Thread Created]
    - threadId: generated UUID
    - title: "New Conversation"
    - messageCount: 0
    - isEmpty: true
    ↓ (User sends first message)
[Active Thread]
    - title: First 50 chars of user message
    - messageCount: 1+
    - isEmpty: false
    ↓ (More messages exchanged)
[Active Thread]
    - lastMessage updated
    - messageCount incremented
    - updatedAt refreshed
    ↓ (User stops interacting)
[Inactive Thread]
    - Remains in list (no automatic cleanup)
    - Can be resumed anytime
```

**State Properties**:
- **Empty Thread**: `messageCount === 0`, `title === "New Conversation"`
- **Active Thread**: `messageCount > 0`, `title` derived from first user message
- **No "Deleted" state**: Deletion deferred to future phase

### Metadata Update Triggers

**When to update checkpoint metadata**:

1. **Thread Creation** (`POST /api/session`):
   - Write initial metadata: `{ userId, title: "New Conversation", messageCount: 0, lastMessage: "", lastMessageRole: "user" }`

2. **Message Sent** (after LLM response):
   - Update `lastMessage` (truncate to 100 chars)
   - Update `lastMessageRole` 
   - Increment `messageCount`
   - Update `title` if first user message
   - `updatedAt` auto-updated by Prisma

3. **Thread Resumed** (read-only):
   - No metadata changes
   - Load existing metadata for display

## Validation Rules

### ThreadMetadata Validation (Zod Schema)

```typescript
import { z } from 'zod';

export const ThreadMetadataSchema = z.object({
  threadId: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1).max(50),
  lastMessage: z.string().max(100),
  lastMessageRole: z.enum(['user', 'assistant']),
  messageCount: z.number().int().min(0),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  isEmpty: z.boolean(),
});

export type ThreadMetadata = z.infer<typeof ThreadMetadataSchema>;
```

### ThreadListResponse Validation

```typescript
export const ThreadListResponseSchema = z.object({
  threads: z.array(ThreadMetadataSchema),
  total: z.number().int().min(0),
});

export type ThreadListResponse = z.infer<typeof ThreadListResponseSchema>;
```

### Message History Validation

```typescript
export const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  timestamp: z.coerce.date(),
});

export const MessageHistorySchema = z.object({
  threadId: z.string().uuid(),
  messages: z.array(MessageSchema),
});

export type Message = z.infer<typeof MessageSchema>;
export type MessageHistory = z.infer<typeof MessageHistorySchema>;
```

## Relationships

### User ↔ Thread (1:N)

- One user can have multiple threads
- Each thread belongs to exactly one user
- Enforced via `userId` in metadata
- No foreign key constraint (userId stored in metadata, not separate column)

### Thread ↔ Messages (1:N)

- One thread contains multiple messages
- Messages stored in checkpoint state (not separate table)
- Access via checkpoint deserialization
- Ordering preserved in checkpoint data

### Thread ↔ Checkpoint (1:1)

- Each thread has one current checkpoint
- Checkpoint history maintained by LangGraph
- Latest checkpoint contains current thread state
- Thread metadata updated on each checkpoint write

## Performance Considerations

### Query Optimization

1. **Thread List Query** (most frequent):
   - Uses GIN index on metadata for userId filtering
   - Returns only metadata (no checkpoint deserialization)
   - Target: <500ms for 100 threads

2. **Thread History Query** (less frequent):
   - Requires checkpoint deserialization
   - LangGraph handles deserialization internally
   - Target: <1000ms for complete history

### Caching Strategy (Future)

- Thread list cache: 30-second TTL per user
- Invalidate on message send
- Not implemented in Phase 1 (KISS principle)

### Scalability Notes

- Current design supports 100-1000 threads per user efficiently
- 10,000+ threads may require pagination (deferred)
- Message history grows linearly with conversation length (no limit in Phase 1)

## Migration Path

### Phase 1 (Current)

1. Add GIN index to existing checkpoint table
2. Start writing metadata on new thread creation
3. Backfill metadata for existing threads (optional, via migration script)

### Phase 2 (Future - Out of Scope)

- Add thread deletion (soft delete via metadata flag)
- Add thread archival/starring
- Implement pagination for large thread lists
- Add thread search/filtering

## Summary

The data model leverages existing LangGraph checkpoint infrastructure with metadata enhancements:

- **ThreadMetadata**: Stored in checkpoint metadata JSONB field
- **No schema changes**: Uses existing checkpoint table structure
- **Efficient queries**: GIN index enables fast userId filtering
- **Complete history**: Messages remain in checkpoint state
- **Simple lifecycle**: Empty → Active → Inactive (no deletion)

**Key Design Decisions**:
1. Metadata-first approach avoids expensive checkpoint deserialization for list views
2. Title derivation from first user message (50 chars max)
3. Empty threads displayed (not hidden or auto-deleted)
4. Complete history always loaded (no message pagination)
5. Manual refresh only (no real-time sync)

**Next**: API contract definition (contracts/threads-api.yaml)
