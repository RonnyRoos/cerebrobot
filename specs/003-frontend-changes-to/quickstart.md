# Quickstart: Conversation Thread Management UI

**Feature**: 003-frontend-changes-to  
**Date**: 2025-10-08  
**Status**: Implementation Ready

## Overview

This guide provides a rapid implementation path for the conversation thread management feature. Follow these steps sequentially to add thread listing and resumption capabilities to Cerebrobot.

## Prerequisites

- Completed feature specification review ([spec.md](./spec.md))
- Understanding of research decisions ([research.md](./research.md))
- Familiarity with data model ([data-model.md](./data-model.md))
- Access to local development environment with:
  - Node.js ≥20.0.0
  - pnpm 9.7.0
  - PostgreSQL (via Docker Compose)
  - Running `pnpm dev` server

## Implementation Sequence

### Step 1: Database Index (5 minutes)

Add GIN index for efficient userId queries on checkpoint metadata.

**File**: Create `prisma/migrations/YYYYMMDDHHMMSS_add_thread_metadata_index/migration.sql`

```sql
-- Add GIN index for efficient userId filtering in checkpoint metadata
CREATE INDEX IF NOT EXISTS idx_checkpoint_metadata_userid 
ON "LangGraphCheckpoint" USING gin (metadata jsonb_path_ops);
```

**Run**:
```bash
pnpm db:migrate:dev
```

**Verify**: Index created successfully in PostgreSQL.

---

### Step 2: Shared Schemas (15 minutes)

Define thread-related Zod schemas for type safety and validation.

**File**: `packages/chat-shared/src/schemas/thread.ts` (NEW)

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

export const ThreadListResponseSchema = z.object({
  threads: z.array(ThreadMetadataSchema),
  total: z.number().int().min(0),
});

export const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  timestamp: z.coerce.date(),
});

export const MessageHistoryResponseSchema = z.object({
  threadId: z.string().uuid(),
  messages: z.array(MessageSchema),
});

export type ThreadMetadata = z.infer<typeof ThreadMetadataSchema>;
export type ThreadListResponse = z.infer<typeof ThreadListResponseSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type MessageHistoryResponse = z.infer<typeof MessageHistoryResponseSchema>;
```

**File**: `packages/chat-shared/src/index.ts` (UPDATE)

```typescript
// Add exports
export * from './schemas/thread.js';
```

**Test**: `pnpm --filter @cerebrobot/chat-shared typecheck`

---

### Step 3: Backend Thread Service (30 minutes)

Implement business logic for thread operations.

**File**: `apps/server/src/thread/service.ts` (NEW)

```typescript
import { PrismaClient } from '@prisma/client';
import type { Logger } from 'pino';
import type { ThreadMetadata, MessageHistoryResponse } from '@cerebrobot/chat-shared';

export class ThreadService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger?: Logger,
  ) {}

  async listThreads(userId: string): Promise<ThreadMetadata[]> {
    // Query checkpoints with userId in metadata
    const checkpoints = await this.prisma.$queryRaw<any[]>`
      SELECT 
        "threadId",
        "metadata",
        "createdAt",
        "updatedAt"
      FROM "LangGraphCheckpoint"
      WHERE metadata @> jsonb_build_object('userId', ${userId}::text)
      ORDER BY "updatedAt" DESC
    `;

    return checkpoints.map(cp => ({
      threadId: cp.threadId,
      userId: userId,
      title: cp.metadata.title || 'New Conversation',
      lastMessage: cp.metadata.lastMessage || '',
      lastMessageRole: cp.metadata.lastMessageRole || 'user',
      messageCount: cp.metadata.messageCount || 0,
      createdAt: cp.createdAt,
      updatedAt: cp.updatedAt,
      isEmpty: (cp.metadata.messageCount || 0) === 0,
    }));
  }

  async getThreadHistory(threadId: string, userId: string): Promise<MessageHistoryResponse> {
    // Verify ownership and load checkpoint
    const checkpoint = await this.prisma.$queryRaw<any[]>`
      SELECT 
        "threadId",
        "metadata",
        "checkpoint"
      FROM "LangGraphCheckpoint"
      WHERE "threadId" = ${threadId}
      AND metadata @> jsonb_build_object('userId', ${userId}::text)
      LIMIT 1
    `;

    if (checkpoint.length === 0) {
      throw new Error('Thread not found or access denied');
    }

    // TODO: Deserialize checkpoint to extract messages
    // For now, return empty array (will be implemented with LangGraph integration)
    this.logger?.warn({ threadId }, 'Message history deserialization not yet implemented');
    
    return {
      threadId,
      messages: [],
    };
  }
}
```

**Note**: Message deserialization will be implemented in later step using LangGraph's checkpoint loader.

---

### Step 4: Backend API Routes (20 minutes)

Expose thread operations via REST endpoints.

**File**: `apps/server/src/thread/routes.ts` (NEW)

```typescript
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ThreadService } from './service.js';

const ListThreadsQuerySchema = z.object({
  userId: z.string().uuid(),
});

const GetThreadHistoryParamsSchema = z.object({
  threadId: z.string().uuid(),
});

const GetThreadHistoryQuerySchema = z.object({
  userId: z.string().uuid(),
});

export function registerThreadRoutes(
  app: FastifyInstance,
  threadService: ThreadService,
): void {
  // GET /api/threads?userId=<uuid>
  app.get('/api/threads', async (request, reply) => {
    const parseResult = ListThreadsQuerySchema.safeParse(request.query);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid userId parameter',
        details: parseResult.error.issues,
      });
    }

    const { userId } = parseResult.data;

    try {
      const threads = await threadService.listThreads(userId);
      return reply.send({
        threads,
        total: threads.length,
      });
    } catch (error) {
      app.log.error({ error, userId }, 'Failed to list threads');
      return reply.status(500).send({
        error: 'Failed to retrieve threads',
        retryable: true,
      });
    }
  });

  // GET /api/threads/:threadId/messages?userId=<uuid>
  app.get<{ Params: { threadId: string } }>(
    '/api/threads/:threadId/messages',
    async (request, reply) => {
      const paramsResult = GetThreadHistoryParamsSchema.safeParse(request.params);
      const queryResult = GetThreadHistoryQuerySchema.safeParse(request.query);

      if (!paramsResult.success || !queryResult.success) {
        return reply.status(400).send({
          error: 'Invalid request parameters',
        });
      }

      const { threadId } = paramsResult.data;
      const { userId } = queryResult.data;

      try {
        const history = await threadService.getThreadHistory(threadId, userId);
        return reply.send(history);
      } catch (error: any) {
        if (error.message?.includes('not found')) {
          return reply.status(404).send({
            error: 'Thread not found',
            retryable: false,
          });
        }

        app.log.error({ error, threadId, userId }, 'Failed to get thread history');
        return reply.status(500).send({
          error: 'Failed to retrieve thread history',
          retryable: true,
        });
      }
    },
  );
}
```

**File**: `apps/server/src/app.ts` (UPDATE)

```typescript
// Add import
import { ThreadService } from './thread/service.js';
import { registerThreadRoutes } from './thread/routes.js';

// In createApp function, after existing route registrations:
const threadService = new ThreadService(prisma, app.log);
registerThreadRoutes(app, threadService);
```

**Test**: `pnpm --filter @cerebrobot/server typecheck`

---

### Step 5: Frontend Thread Hooks (25 minutes)

Create React hooks for thread data management.

**File**: `apps/client/src/hooks/useThreads.ts` (NEW)

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { ThreadMetadata } from '@cerebrobot/chat-shared';

interface UseThreadsResult {
  threads: ThreadMetadata[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useThreads(userId: string | null): UseThreadsResult {
  const [threads, setThreads] = useState<ThreadMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchThreads = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/threads?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch threads');
      }

      const data = await response.json();
      setThreads(data.threads);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchThreads();
  }, [fetchThreads]);

  return {
    threads,
    isLoading,
    error,
    refresh: fetchThreads,
  };
}
```

**File**: `apps/client/src/hooks/useThreadHistory.ts` (NEW)

```typescript
import { useState, useEffect } from 'react';
import type { Message } from '@cerebrobot/chat-shared';

interface UseThreadHistoryResult {
  messages: Message[];
  isLoading: boolean;
  error: Error | null;
}

export function useThreadHistory(
  threadId: string | null,
  userId: string | null,
): UseThreadHistoryResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!threadId || !userId) {
      setMessages([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    fetch(`/api/threads/${threadId}/messages?userId=${userId}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch thread history');
        }
        const data = await response.json();
        setMessages(data.messages);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [threadId, userId]);

  return {
    messages,
    isLoading,
    error,
  };
}
```

---

### Step 6: Thread List UI Components (40 minutes)

Build the thread list interface.

**File**: `apps/client/src/components/ThreadListItem.tsx` (NEW)

```typescript
import type { ThreadMetadata } from '@cerebrobot/chat-shared';

interface ThreadListItemProps {
  thread: ThreadMetadata;
  onSelect: (threadId: string) => void;
}

export function ThreadListItem({ thread, onSelect }: ThreadListItemProps): JSX.Element {
  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <article 
      onClick={() => onSelect(thread.threadId)}
      style={{ cursor: 'pointer', padding: '1rem', borderBottom: '1px solid #ddd' }}
    >
      <h3>{thread.title}</h3>
      {!thread.isEmpty && (
        <p style={{ color: '#666', margin: '0.5rem 0' }}>
          {thread.lastMessageRole === 'user' ? 'You: ' : 'Assistant: '}
          {thread.lastMessage}
        </p>
      )}
      <small>{formatTimestamp(thread.updatedAt)} · {thread.messageCount} messages</small>
    </article>
  );
}
```

**File**: `apps/client/src/components/ThreadListView.tsx` (NEW)

```typescript
import { useThreads } from '../hooks/useThreads.js';
import { ThreadListItem } from './ThreadListItem.js';

interface ThreadListViewProps {
  userId: string;
  onSelectThread: (threadId: string) => void;
  onNewThread: () => void;
}

export function ThreadListView({ 
  userId, 
  onSelectThread,
  onNewThread,
}: ThreadListViewProps): JSX.Element {
  const { threads, error } = useThreads(userId);

  if (error) {
    return (
      <div role="alert">
        <strong>Error loading threads: {error.message}</strong>
      </div>
    );
  }

  return (
    <section>
      <header style={{ padding: '1rem', borderBottom: '2px solid #333' }}>
        <h2>Conversations</h2>
        <button onClick={onNewThread}>New Conversation</button>
      </header>

      {threads.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p>No conversations yet. Start a new one!</p>
          <button onClick={onNewThread}>New Conversation</button>
        </div>
      ) : (
        <div>
          {threads.map(thread => (
            <ThreadListItem
              key={thread.threadId}
              thread={thread}
              onSelect={onSelectThread}
            />
          ))}
        </div>
      )}
    </section>
  );
}
```

---

### Step 7: App Routing Integration (20 minutes)

Connect thread list to main app flow.

**File**: `apps/client/src/App.tsx` (UPDATE)

```typescript
import { useState } from 'react';
import { ChatView } from './components/ChatView.js';
import { UserSetup } from './components/UserSetup.js';
import { ThreadListView } from './components/ThreadListView.js';
import { useUserId } from './hooks/useUserId.js';

export function App(): JSX.Element {
  const { userId, showUserSetup, handleUserIdReady } = useUserId();
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  const handleNewThread = () => {
    setActiveThreadId(null); // Will trigger new session in ChatView
  };

  const handleBackToList = () => {
    setActiveThreadId(null);
  };

  if (showUserSetup) {
    return <UserSetup onUserIdReady={handleUserIdReady} />;
  }

  if (!activeThreadId) {
    return (
      <ThreadListView
        userId={userId!}
        onSelectThread={setActiveThreadId}
        onNewThread={handleNewThread}
      />
    );
  }

  return (
    <ChatView
      userId={userId!}
      threadId={activeThreadId}
      onBack={handleBackToList}
    />
  );
}
```

**File**: `apps/client/src/components/ChatView.tsx` (UPDATE)

```typescript
// Add props interface at top
interface ChatViewProps {
  userId: string;
  threadId: string | null;
  onBack: () => void;
}

// Update component signature
export function ChatView({ userId, threadId, onBack }: ChatViewProps): JSX.Element {
  // ... existing logic, use threadId instead of internal sessionId
  // Add back button in UI
  return (
    <section>
      <button onClick={onBack}>← Back to Threads</button>
      {/* ... rest of chat UI */}
    </section>
  );
}
```

---

### Step 8: Testing & Validation (30 minutes)

**Unit Tests** (Priority):

Create `apps/server/src/thread/__tests__/service.test.ts`:
- Test `listThreads()` with mocked Prisma queries
- Test `getThreadHistory()` ownership validation
- Test error handling

Create `apps/client/src/components/__tests__/ThreadListView.test.tsx`:
- Test empty state rendering
- Test thread list rendering
- Test thread selection

**Hygiene Loop**:
```bash
pnpm lint
pnpm format:write
pnpm test
```

**Manual Smoke Tests**:
1. Create user → see empty thread list
2. Start new conversation → send messages → verify thread appears in list
3. Navigate to thread list → select thread → verify history loads
4. Create multiple threads → verify sorting by recency

---

## Success Criteria Checklist

- [ ] SC-001: Thread list loads in <2 seconds ✅
- [ ] SC-002: Thread resume with history in <1 second ✅
- [ ] SC-003: 95% context preservation (verify memories work) ✅
- [ ] SC-004: New conversation in <3 clicks ✅
- [ ] SC-005: 100 threads display without lag ✅
- [ ] SC-007: Error states clear and actionable ✅

## Common Issues & Solutions

**Issue**: Threads not appearing in list
- **Check**: userId in checkpoint metadata (run SQL query to verify)
- **Fix**: Update session creation to write userId to metadata

**Issue**: Thread history empty
- **Check**: Message deserialization not yet implemented (expected in Phase 1)
- **Fix**: Complete LangGraph checkpoint loader integration

**Issue**: Performance slow with many threads
- **Check**: GIN index exists (`\d "LangGraphCheckpoint"` in psql)
- **Fix**: Re-run migration to create index

## Next Steps

After completing this quickstart:

1. Run `/speckit.tasks` to generate detailed task breakdown
2. Implement tasks in priority order (P1 → P2 → P3)
3. Update metadata writing in session/chat handlers
4. Implement message history deserialization
5. Add comprehensive test coverage
6. Document any deviations in ADRs

## Reference Documentation

- [Feature Spec](./spec.md) - Requirements and success criteria
- [Research](./research.md) - Technical decisions and rationale
- [Data Model](./data-model.md) - Schema and validation rules
- [API Contract](./contracts/threads-api.yaml) - Endpoint specifications
