# Memory System Quickstart

This guide helps you understand, configure, and test Cerebrobot's long-term memory layer.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Architecture Overview](#architecture-overview)
- [Configuration](#configuration)
- [Basic Usage](#basic-usage)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before working with the memory system, ensure you have:

- **Node.js ≥20** installed
- **PostgreSQL** with **pgvector** extension enabled
- **DeepInfra API key** (or compatible OpenAI-style embedding endpoint)
- Dependencies installed: `pnpm install`
- Database migrated: `pnpm prisma migrate dev`

## Architecture Overview

The memory system adds **long-term memory** to Cerebrobot's conversational AI using **LangGraph Store** abstraction backed by PostgreSQL + pgvector.

### Key Components

1. **Memory Store** (`apps/server/src/agent/memory/store.ts`)
   - Implements `BaseStore` interface from LangGraph
   - Handles CRUD operations on memories
   - Generates embeddings via DeepInfra
   - Executes semantic search using pgvector

2. **Graph Integration** (`apps/server/src/agent/langgraph-agent.ts`)
   - **`retrieveMemories`** node: Pre-LLM, fetches relevant memories based on user input
   - **`storeMemory`** node: Post-LLM, saves memories via `upsertMemory` tool calls

3. **Database Schema** (`prisma/schema.prisma`)
   - `Memory` table with pgvector embeddings
   - Composite unique index on `(namespace, key)`
   - IVFFlat index on embeddings for fast cosine similarity search

### Data Flow

```
User Input
    ↓
retrieveMemories (semantic search, threshold: 0.7)
    ↓
LLM (context: messages + retrieved memories)
    ↓
storeMemory (if upsertMemory tool called)
    ↓
Response + Updated Memory
```

---

## Configuration

### Environment Variables

Create/update `.env` in `apps/server/`:

```bash
# Memory Feature Toggle (default: true)
MEMORY_ENABLED=true

# Embedding Configuration
MEMORY_EMBEDDING_ENDPOINT=https://api.deepinfra.com/v1/openai
MEMORY_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
DEEPINFRA_API_KEY=your_deepinfra_api_key_here

# Search Configuration
MEMORY_SIMILARITY_THRESHOLD=0.7          # 0-1, higher = stricter matches
MEMORY_MAX_RETRIEVED=20                  # Safety limit on results

# Content Limits
MEMORY_CONTENT_MAX_TOKENS=2048          # ~8KB max content size
```

### Validation

Verify configuration on startup:

```bash
cd apps/server
pnpm start
```

Look for log messages:

```
[INFO] Memory system: ENABLED
[INFO] Embedding model: sentence-transformers/all-MiniLM-L6-v2
[INFO] Similarity threshold: 0.7
```

---

## Basic Usage

### 1. Create a User (First Time Setup)

Before storing memories, create a named user identity:

**Frontend Flow** (automatic on first visit):
```typescript
// Check localStorage for existing userId
let userId = localStorage.getItem('cerebrobot_userId');

if (!userId) {
  // Prompt user for name
  const name = prompt("Enter your name:");
  
  // Create user via API
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  
  const { userId: newUserId } = await response.json();
  
  // Persist userId in localStorage
  localStorage.setItem('cerebrobot_userId', newUserId);
  userId = newUserId;
}

// Use userId in all subsequent chat requests
```

**Backend Endpoint**:
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"operator"}'

# Response:
# {
#   "userId": "550e8400-e29b-41d4-a716-446655440000",
#   "name": "operator",
#   "createdAt": "2025-10-07T12:00:00Z"
# }
```

---

### 2. Enable Memory in a Session

Memory operates within **namespaces** scoped by user ID:

```typescript
import { buildUserNamespace } from "@/agent/memory/contracts";

const userId = "user_abc123";
const namespace = buildUserNamespace(userId); // ["memories", "user_abc123"]
```

### 3. Store a Memory Programmatically

```typescript
import { memoryStore } from "@/agent/memory/store";
import { v4 as uuidv4 } from "uuid";

await memoryStore.put(
  ["memories", userId],
  uuidv4(),
  {
    id: uuidv4(),
    namespace: ["memories", userId],
    key: uuidv4(),
    content: "User prefers JSON responses over verbose explanations",
    metadata: { category: "preferences", importance: "high" },
    createdAt: new Date(),
    updatedAt: new Date(),
  }
);
```

### 4. Search Memories

```typescript
const results = await memoryStore.search(
  ["memories", userId],
  "What format does the user like?",
  { threshold: 0.7 }
);

console.log(results);
// [
//   {
//     content: "User prefers JSON responses over verbose explanations",
//     similarity: 0.89,
//     ...
//   }
// ]
```

### 5. LLM-Driven Memory Updates

The LLM can call the `upsertMemory` tool:

**User:** "Remember that I prefer dark mode in all interfaces."

**LLM Tool Call:**
```json
{
  "tool": "upsertMemory",
  "input": {
    "content": "User prefers dark mode in all interfaces",
    "metadata": { "category": "preferences" }
  }
}
```

**Result:**
```json
{
  "success": true,
  "memoryId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Memory stored successfully"
}
```

---

## Testing

### Run All Tests

```bash
# From workspace root
pnpm test

# Or specifically for memory tests
pnpm --filter @cerebrobot/server test apps/server/src/agent/memory
```

### Unit Tests

Test individual components:

```bash
# Store operations
pnpm vitest apps/server/src/agent/memory/__tests__/store.test.ts

# Graph node integration
pnpm vitest apps/server/src/agent/__tests__/langgraph-agent.test.ts
```

### Integration Tests

Test end-to-end memory flow:

```bash
# Full graph with memory retrieval + storage
pnpm vitest apps/server/src/agent/__tests__/langgraph-persistence.test.ts
```

### Manual Testing via API

1. **Start server:** `pnpm dev`
2. **Create session:** `POST http://localhost:3000/api/sessions`
3. **Send message with memory context:**

```bash
curl -X POST http://localhost:3000/api/sessions/{sessionId}/messages \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Remember: I live in San Francisco and work in AI research",
    "userId": "test_user_123"
  }'
```

4. **Verify retrieval in next message:**

```bash
curl -X POST http://localhost:3000/api/sessions/{sessionId}/messages \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Where do I live again?",
    "userId": "test_user_123"
  }'
```

Expected: LLM response references San Francisco due to memory retrieval.

---

## Troubleshooting

### Memory Not Retrieved

**Symptom:** LLM doesn't reference stored memories

**Checks:**
1. Verify `MEMORY_ENABLED=true` in `.env`
2. Check `MEMORY_SIMILARITY_THRESHOLD` (try lowering to 0.5 for debugging)
3. Inspect logs for `retrieveMemories` node output:
   ```
   [DEBUG] Retrieved 0 memories for query "..." (threshold: 0.7)
   ```
4. Confirm embeddings exist:
   ```sql
   SELECT id, content, embedding IS NOT NULL as has_embedding 
   FROM "Memory" 
   WHERE namespace = '{memories,user_abc123}'::TEXT[];
   ```

**Solution:** Reduce threshold or verify embeddings are generated.

---

### Embedding Generation Fails

**Symptom:** Errors during memory storage

**Checks:**
1. Validate DeepInfra API key:
   ```bash
   curl https://api.deepinfra.com/v1/openai/embeddings \
     -H "Authorization: Bearer $DEEPINFRA_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"sentence-transformers/all-MiniLM-L6-v2","input":"test"}'
   ```
2. Check embedding endpoint configuration:
   ```
   MEMORY_EMBEDDING_ENDPOINT=https://api.deepinfra.com/v1/openai
   ```
3. Review error logs for API rate limits or network issues

**Solution:** Verify API credentials and network connectivity.

---

### Content Size Errors

**Symptom:** `MemoryValidationError: Memory content exceeds 2048 token limit`

**Checks:**
1. Measure content length:
   ```typescript
   const estimatedTokens = Math.ceil(content.length / 4);
   console.log(`Estimated tokens: ${estimatedTokens}`);
   ```
2. Review `MEMORY_CONTENT_MAX_TOKENS` setting

**Solution:** Truncate or summarize content before storing. Raise limit if justified by use case (update config + validation).

---

### Concurrent Update Conflicts

**Symptom:** Unexpected memory overwrites

**Behavior:** Last-write-wins policy (Phase 1 design)

**Checks:**
1. Inspect `updatedAt` timestamps:
   ```sql
   SELECT namespace, key, content, "updatedAt" 
   FROM "Memory" 
   ORDER BY "updatedAt" DESC 
   LIMIT 10;
   ```
2. Review memory operation order in logs

**Solution:** Expected behavior for Phase 1. Future phases may add optimistic locking or conflict resolution.

---

### Database Performance Issues

**Symptom:** Slow search queries (>200ms)

**Checks:**
1. Verify pgvector index exists:
   ```sql
   SELECT indexname, indexdef 
   FROM pg_indexes 
   WHERE tablename = 'Memory' AND indexname = 'embedding_idx';
   ```
2. Check table size:
   ```sql
   SELECT COUNT(*), pg_size_pretty(pg_total_relation_size('"Memory"')) 
   FROM "Memory";
   ```
3. Analyze query plan:
   ```sql
   EXPLAIN ANALYZE 
   SELECT * FROM "Memory" 
   WHERE embedding <-> '[0.1, 0.2, ...]'::vector < 0.3 
   LIMIT 20;
   ```

**Solution:** 
- Ensure IVFFlat index is built (`CREATE INDEX` command in migration)
- Tune `lists` parameter for larger datasets (IVFFlat tuning)
- Consider HNSW index for very large memory stores (future optimization)

---

## Next Steps

- **Review [data-model.md](./data-model.md)** for schema details
- **Explore [contracts/memory-store.schema.ts](./contracts/memory-store.schema.ts)** for TypeScript interfaces
- **Read [research.md](./research.md)** for design decisions and alternatives
- **Check [plan.md](./plan.md)** for implementation roadmap

## Success Criteria

Your memory system is working correctly when:

- ✅ Memories persist across sessions
- ✅ Semantic search returns relevant results (similarity ≥0.7)
- ✅ LLM references stored memories in responses
- ✅ `upsertMemory` tool calls succeed with ≥95% reliability
- ✅ Search latency <200ms for typical workloads (<1000 memories)
- ✅ All integration tests pass

Run the validation suite:

```bash
pnpm test:memory:e2e
```

Expected output:

```
✓ Cross-thread memory recall (142ms)
✓ Semantic search relevance (89ms)  
✓ LLM-driven memory updates (203ms)
✓ Multi-user isolation (67ms)

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
```

---

**Questions?** Consult the [spec.md](./spec.md) or review implementation in `apps/server/src/agent/memory/`.
