# Quickstart: Agent Brain Activity Transparency

**Feature**: 017-agent-brain  
**Purpose**: Onboard developers to implement and test brain activity transparency  
**Prerequisites**: Node.js ≥20, pnpm, Docker (PostgreSQL via `docker-compose.yml`)

## Overview

This feature adds transparency into agent decision-making by surfacing:
- **Tool calls** (e.g., `upsertMemory` invocations)
- **Memory searches** (vector store queries during conversation)
- **Context pruning** (summarization of long conversations)
- **Autonomy decisions** (scheduled follow-ups via timers)

All events appear in a new "Activity" tab in the frontend, updated in real-time via WebSocket.

---

## Local Setup (5 minutes)

### 1. Install Dependencies

```bash
# From monorepo root
pnpm install
```

### 2. Start Development Database

```bash
# Start PostgreSQL via Docker Compose
docker-compose up -d postgres

# Wait for DB to be ready
sleep 5

# Run Prisma migration (adds EventSource enum and source column)
pnpm prisma migrate dev --name add_event_source

# Verify migration applied
pnpm prisma db pull  # Should show Event.source column in schema
```

**Expected Output**:
```
✔ Generated Prisma Client (5.0.0) to ./node_modules/@prisma/client in 150ms
✔ Database synchronized with Prisma schema.
```

### 3. Start Development Servers

```bash
# Terminal 1: Start Fastify backend (port 3000)
pnpm --filter @workspace/server dev

# Terminal 2: Start Vite frontend (port 5173)
pnpm --filter @workspace/client dev

# Terminal 3: Start Storybook (port 6006, for UI component development)
pnpm --filter @workspace/ui storybook
```

**Verify Startup**:
- Backend: `http://localhost:3000/health` → 200 OK
- Frontend: `http://localhost:5173` → Cerebrobot UI loads
- Storybook: `http://localhost:6006` → UI component library

---

## Design Library Setup (REQUIRED before implementing UI)

**Principle IX (Design Library First)**: All UI components MUST use `@workspace/ui`. Missing components MUST be added to the design library before use.

### 4. Create Missing Design Library Components

**Components Needed** (from research.md):
1. `ActivityEventCard` - Display brain activity event
2. `ConnectionStatusBadge` - WebSocket connection indicator

**Workflow**:

```bash
# Navigate to design library package
cd packages/ui

# Create component files
touch src/components/activity-event-card.tsx
touch src/components/connection-status-badge.tsx

# Create Storybook stories (documentation)
touch src/components/activity-event-card.stories.tsx
touch src/components/connection-status-badge.stories.tsx

# Create tests
touch __tests__/activity-event-card.test.tsx
touch __tests__/connection-status-badge.test.tsx
```

**Implementation Template** (ActivityEventCard):

```typescript
// packages/ui/src/components/activity-event-card.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { Box } from './box';
import { Text } from './text';

const activityEventCardVariants = cva(
  'rounded-lg border p-4 space-y-2',
  {
    variants: {
      eventType: {
        tool_call: 'border-neon-cyan bg-neon-cyan/5',
        memory_search: 'border-neon-purple bg-neon-purple/5',
        context_pruned: 'border-neon-orange bg-neon-orange/5',
        schedule_timer: 'border-neon-pink bg-neon-pink/5',
      },
    },
    defaultVariants: {
      eventType: 'tool_call',
    },
  }
);

export interface ActivityEventCardProps extends VariantProps<typeof activityEventCardVariants> {
  timestamp: string;
  title: string;
  details: React.ReactNode;
}

export function ActivityEventCard({ eventType, timestamp, title, details }: ActivityEventCardProps) {
  return (
    <Box className={activityEventCardVariants({ eventType })}>
      <Text variant="caption" className="text-gray-500">
        {new Date(timestamp).toLocaleString()}
      </Text>
      <Text variant="body1" className="font-medium">
        {title}
      </Text>
      {details}
    </Box>
  );
}
```

**Storybook Documentation** (ActivityEventCard.stories.tsx):

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { ActivityEventCard } from './activity-event-card';
import { Text } from './text';

const meta: Meta<typeof ActivityEventCard> = {
  title: 'Components/ActivityEventCard',
  component: ActivityEventCard,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const ToolCall: Story = {
  args: {
    eventType: 'tool_call',
    timestamp: '2025-11-11T14:32:15.123Z',
    title: 'Tool Call: upsertMemory',
    details: <Text variant="caption">Stored user preference for dark mode</Text>,
  },
};

export const MemorySearch: Story = {
  args: {
    eventType: 'memory_search',
    timestamp: '2025-11-11T14:31:42.789Z',
    title: 'Memory Search',
    details: <Text variant="caption">Retrieved 2 memories about user preferences</Text>,
  },
};

// ... (add ContextPruned, ScheduleTimer stories)
```

**Export from Package** (packages/ui/src/index.ts):

```typescript
// Add to existing exports
export { ActivityEventCard, type ActivityEventCardProps } from './components/activity-event-card';
export { ConnectionStatusBadge, type ConnectionStatusBadgeProps } from './components/connection-status-badge';
```

**Verify in Storybook**:
1. Open `http://localhost:6006`
2. Navigate to `Components > ActivityEventCard`
3. Verify all 4 event type variants render correctly
4. Check accessibility (A11y addon should show 0 violations)

---

## Testing Brain Activity (10 minutes)

### 5. Trigger Brain Activity Events

**Test 1: Memory Search**

1. Open `http://localhost:5173`
2. Create new thread (click "New Thread" button)
3. Send message: `"What do you know about me?"`
4. **Expected**:
   - Message appears in chat
   - Agent searches memory (even if no memories exist)
   - Activity tab shows `memory_search` event
   - WebSocket emits `brain_activity.created` message

**Test 2: Tool Call (upsertMemory)**

1. Send message: `"Remember that I prefer dark mode"`
2. **Expected**:
   - Agent invokes `upsertMemory` tool
   - Memory stored in database
   - Activity tab shows `tool_call` event with:
     - Tool name: `upsertMemory`
     - Arguments: `{ content: "User prefers dark mode", ... }`
     - Result: `{ success: true, memoryId: "..." }`
     - Duration: ~50ms

**Test 3: Empty State**

1. Open Activity tab BEFORE sending any messages
2. **Expected**:
   - Informative message: "No brain activity yet. Agent decisions will appear here as the conversation progresses."
   - No error states, no loading spinners

**Test 4: WebSocket Reconnection**

1. Stop Fastify server: `Ctrl+C` in backend terminal
2. Observe Activity tab
3. **Expected**:
   - ConnectionStatusBadge shows "Disconnected" after 3 retry attempts
   - Manual reconnect button appears
4. Restart server: `pnpm --filter @workspace/server dev`
5. Click reconnect button
6. **Expected**:
   - Badge shows "Connected"
   - New events stream correctly

---

## Development Workflow

### 6. Implement Backend (ToolNode Instrumentation)

**Task**: Extend ToolNode to append brain_activity effects

**Files to Modify**:
- `apps/server/src/agent/conversation-graph.ts`

**Pattern** (from research.md):

```typescript
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { RunnableConfig } from '@langchain/core/runnables';

class InstrumentedToolNode extends ToolNode {
  async invoke(state: typeof MessagesAnnotation.State, config?: RunnableConfig) {
    const startTime = Date.now();
    
    // Execute tool via parent class
    const result = await super.invoke(state, config);
    
    // Extract tool call from last AIMessage
    const lastMessage = state.messages[state.messages.length - 1];
    if (lastMessage._getType() === 'ai' && lastMessage.tool_calls?.length) {
      const toolCall = lastMessage.tool_calls[0];
      
      // Append brain_activity effect to result
      result.effects = [
        ...(result.effects || []),
        {
          type: 'brain_activity',
          payload: {
            eventType: 'tool_call',
            toolName: toolCall.name,
            arguments: toolCall.args,
            result: result.toolMessage?.content,  // Tool return value
            duration: Date.now() - startTime,
          },
        },
      ];
    }
    
    return result;
  }
}

// Use instrumented version in graph
.addNode('agent_tools', new InstrumentedToolNode(memoryTools))
```

### 7. Implement Backend (API Endpoint)

**Task**: Add brain activity query endpoint

**File**: `apps/server/src/routes/brain-activity.ts`

**Implementation**:

```typescript
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const getBrainActivitySchema = z.object({
  agentId: z.string().uuid(),
  threadId: z.string().uuid(),
  type: z.enum(['tool_call', 'memory_search', 'context_pruned', 'schedule_timer']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().min(1).max(200).default(50),
  offset: z.number().min(0).default(0),
});

const brainActivityRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/agents/:agentId/threads/:threadId/activity', async (request, reply) => {
    const { agentId, threadId } = request.params as { agentId: string; threadId: string };
    const query = getBrainActivitySchema.parse(request.query);
    
    // Parallel query pattern (from research.md)
    const [agentEvents, brainEffects] = await Promise.all([
      fastify.prisma.event.findMany({
        where: {
          sessionKey: { startsWith: `thread-${threadId}-` },
          source: 'AGENT',
          type: { in: ['memory_search', 'context_pruned'] },
          createdAt: {
            gte: query.startDate ? new Date(query.startDate) : undefined,
            lte: query.endDate ? new Date(query.endDate) : undefined,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
      fastify.prisma.effect.findMany({
        where: {
          sessionKey: { startsWith: `thread-${threadId}-` },
          type: { in: ['brain_activity', 'schedule_timer'] },
          createdAt: {
            gte: query.startDate ? new Date(query.startDate) : undefined,
            lte: query.endDate ? new Date(query.endDate) : undefined,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
    ]);
    
    // Transform via BrainActivityDecorator
    const activity = [...agentEvents, ...brainEffects]
      .map(BrainActivityDecorator.transform)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, query.limit);
    
    return { activity, total: activity.length, limit: query.limit, offset: query.offset };
  });
};
```

### 8. Implement Frontend (Activity Tab)

**File**: `apps/client/src/components/ActivityList.tsx`

**Implementation**:

```typescript
import { useState, useEffect } from 'react';
import { ActivityEventCard } from '@workspace/ui';
import { useWebSocket } from '../hooks/useWebSocket';

export function ActivityList({ agentId, threadId }: { agentId: string; threadId: string }) {
  const [activity, setActivity] = useState<BrainActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { lastMessage } = useWebSocket();
  
  // Initial load
  useEffect(() => {
    fetch(`/api/agents/${agentId}/threads/${threadId}/activity`)
      .then(res => res.json())
      .then(data => {
        setActivity(data.activity);
        setLoading(false);
      });
  }, [agentId, threadId]);
  
  // Real-time updates
  useEffect(() => {
    if (lastMessage?.type === 'brain_activity.created') {
      setActivity(prev => [lastMessage.data, ...prev]);
    }
  }, [lastMessage]);
  
  if (loading) return <div>Loading...</div>;
  
  if (activity.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        No brain activity yet. Agent decisions will appear here as the conversation progresses.
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {activity.map(event => (
        <ActivityEventCard
          key={event.id}
          eventType={event.eventType}
          timestamp={event.timestamp}
          title={formatTitle(event)}
          details={formatDetails(event)}
        />
      ))}
    </div>
  );
}
```

---

## Debugging Tips

### Common Issues

**Issue**: Activity tab shows "No brain activity yet" despite sending messages  
**Fix**:
1. Check WebSocket connection (ConnectionStatusBadge should show "Connected")
2. Inspect browser DevTools Network tab → WS messages → Verify `brain_activity.created` events
3. Check backend logs for SessionProcessor errors
4. Query database directly: `SELECT * FROM "Effect" WHERE type='brain_activity' ORDER BY "createdAt" DESC LIMIT 5;`

**Issue**: Tool calls not appearing in Activity tab  
**Fix**:
1. Verify `upsertMemory` triggered: Send message like "Remember X"
2. Check LangGraph logs: Tool invocation should appear in console
3. Verify InstrumentedToolNode extends ToolNode correctly
4. Query Effects table: `SELECT * FROM "Effect" WHERE type='brain_activity' AND payload->>'eventType'='tool_call';`

**Issue**: WebSocket reconnection fails after 3 retries  
**Fix**:
1. Verify backend running on port 3000
2. Check firewall/proxy settings
3. Inspect browser console for WebSocket errors
4. Manually reconnect via button in UI

**Issue**: Missing design library component error  
**Fix**:
1. Verify component exported from `packages/ui/src/index.ts`
2. Run `pnpm build` in `packages/ui` to regenerate dist
3. Check Storybook at `http://localhost:6006` → Component should appear
4. Verify import in client app: `import { ActivityEventCard } from '@workspace/ui';`

---

## Quality Gates (Run Before Committing)

```bash
# From monorepo root

# 1. Lint (no errors allowed)
pnpm lint

# 2. Format (auto-fix)
pnpm format:write

# 3. Type check
pnpm --filter @workspace/server typecheck
pnpm --filter @workspace/client typecheck

# 4. Unit tests
pnpm test

# 5. Postgres validation test (requires running DB)
pnpm --filter @workspace/server test -- brain-activity

# 6. Manual smoke test (see Testing Brain Activity section)
```

**Success Criteria**:
- ✅ All lint checks pass (ESLint, Prettier)
- ✅ TypeScript compiles without errors
- ✅ Unit tests pass (ActivityEventCard, ConnectionStatusBadge, BrainActivityDecorator)
- ✅ Postgres validation test passes (EventSource enum, parallel queries)
- ✅ Manual smoke test passes (memory search, tool call, empty state, reconnection)

---

## Next Steps

After completing quickstart:

1. **Read Planning Docs**:
   - `specs/017-agent-brain/plan.md` (implementation strategy)
   - `specs/017-agent-brain/data-model.md` (entity relationships)
   - `specs/017-agent-brain/contracts/brain-activity-api.yaml` (API contract)

2. **Review Research Decisions**:
   - `specs/017-agent-brain/research.md` (resolved unknowns)

3. **Implement Week-by-Week Tasks**:
   - Run `/speckit.tasks` command to generate `tasks.md`
   - Follow tasks sequentially (Week 1: Backend foundation, Week 2: Frontend, Week 3: Polish)

4. **Update Documentation**:
   - Add to `.specify/memory/active-technologies.md` (BrainActivityDecorator, ActivityEventCard)
   - Update `docs/architecture/database.md` (EventSource enum migration)
   - Document WebSocket event format in `docs/api/websocket.md`

---

## Resources

- **LangGraph ToolNode**: [docs/llm-docs-frameworks/langgraph-full.txt](../../docs/llm-docs-frameworks/langgraph-full.txt)
- **Events & Effects**: [docs/architecture/events-and-effects.md](../../docs/architecture/events-and-effects.md)
- **WebSocket Protocol**: [docs/api/websocket.md](../../docs/api/websocket.md)
- **Design Library**: [packages/ui/README.md](../../packages/ui/README.md)
- **Prisma Migrations**: [prisma/migrations/](../../prisma/migrations/)
- **Constitution**: [.specify/memory/constitution.md](../../.specify/memory/constitution.md)
