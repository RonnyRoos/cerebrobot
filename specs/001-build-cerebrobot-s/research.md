# Research: Long-Term Memory Implementation

**Phase 0 Output** | **Date**: 2025-10-07

## Overview

This document consolidates research findings for implementing LangGraph Store-based long-term memory in Cerebrobot. The implementation adapts patterns from the Python LangGraph memory article to LangGraph JS while integrating with the existing Postgres-backed checkpoint system.

## Key Decisions

### Decision 1: LangGraph JS Store Abstraction

**Decision**: Implement memory storage using LangGraph's Store interface pattern, adapted from Python to TypeScript

**Rationale**:
- LangGraph provides a consistent Store abstraction across Python and JS implementations
- Store interface supports both key-value and semantic search operations
- Existing Postgres infrastructure from Phase 1.5 can be leveraged
- TypeScript port maintains same conceptual model as reference Python article

**Alternatives Considered**:
- Custom memory service: Rejected - reinvents patterns already established in LangGraph ecosystem
- LangChain memory classes: Rejected - deprecated in favor of LangGraph Store pattern
- Direct Postgres access: Rejected - bypasses LangGraph's persistence abstractions

**Implementation Notes**:
- Create `BaseStore` interface matching Python API: `put()`, `get()`, `search()`, `delete()`
- Implement `PostgresStore` class using Prisma for database operations
- Use pgvector extension for embedding storage and semantic search
- Store records organized by namespace tuple pattern: `("memories", userId)`

**References**:
- LangGraph Python Store documentation (adapted for JS)
- Medium article: "Long-Term Agentic Memory With LangGraph" (Python examples)
- Existing `postgres-checkpoint.ts` implementation patterns

---

### Decision 2: Embedding Integration with DeepInfra

**Decision**: Use DeepInfra's OpenAI-compatible embeddings API for semantic search

**Rationale**:
- OpenAI-compatible interface allows provider swapping (Constitution VI: Configuration Over Hardcoding)
- DeepInfra specified in requirements as default provider
- Embeddings required for semantic similarity search (0.7 threshold per clarifications)
- Existing project uses OpenAI-compatible LLM endpoints

**Alternatives Considered**:
- Local embedding models (sentence-transformers): Rejected - adds deployment complexity
- OpenAI directly: Rejected - cost and dependency concerns for hobby deployment
- No embeddings (keyword only): Rejected - defeats semantic search requirement (FR-004)

**Implementation Notes**:
- Configure embedding endpoint via `MEMORY_EMBEDDING_ENDPOINT` env var
- Use `@langchain/openai` OpenAIEmbeddings class with custom base URL
- Cache embeddings in Postgres alongside memory content
- Similarity search uses cosine distance on pgvector column

**Configuration Example**:
```typescript
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.DEEPINFRA_API_KEY,
  configuration: {
    baseURL: process.env.MEMORY_EMBEDDING_ENDPOINT || "https://api.deepinfra.com/v1/openai",
  },
  modelName: "sentence-transformers/all-MiniLM-L6-v2", // Configurable
});
```

---

### Decision 3: Graph Integration Pattern (Pre/Post LLM Nodes)

**Decision**: Add `retrieveMemories` and `storeMemory` nodes with conditional edges in existing graph

**Rationale**:
- Non-invasive integration preserves existing checkpoint and summarization flows
- Pre-LLM node injects memories into context before generation
- Post-LLM node processes tool calls for memory storage
- Conditional routing allows memory features to be toggled via config

**Alternatives Considered**:
- Middleware/interceptor pattern: Rejected - less explicit in graph visualization
- Rebuild entire graph: Rejected - violates Constitution IV (incremental changes)
- Single memory node: Rejected - separates concerns (retrieve vs store)

**Implementation Notes**:
```typescript
// Simplified graph structure
builder.addNode("retrieveMemories", retrieveMemoriesNode);
builder.addNode("callModel", callModelNode); // Existing
builder.addNode("storeMemory", storeMemoryNode);

// Conditional edges
builder.addConditionalEdges("retrieveMemories", (state) => 
  state.memoryEnabled ? "callModel" : "callModel" // Always proceed
);

builder.addConditionalEdges("callModel", (state) => 
  state.toolCalls?.some(t => t.name === "upsertMemory") 
    ? "storeMemory" 
    : "END"
);
```

**Integration Points**:
- Modify `langgraph-agent.ts` to add new nodes
- Pass `store` parameter via graph compilation config
- Inject retrieved memories into system prompt or message list
- Process `upsertMemory` tool calls in post-LLM node

---

### Decision 4: Memory Schema and Constraints

**Decision**: Store memories as JSON with strict validation (max 2048 tokens, required fields)

**Rationale**:
- Flexible JSON structure accommodates varying metadata
- Token limit prevents context pollution (clarification: 2048 tokens max)
- Zod schemas provide runtime validation
- Prisma JSON column type supports flexible metadata

**Alternatives Considered**:
- Rigid SQL columns: Rejected - limits extensibility
- No size limits: Rejected - risks context overflow
- String concatenation: Rejected - loses structure

**Schema Definition**:
```typescript
// Zod schema (packages/chat-shared/src/schemas/memory.ts)
export const MemoryEntrySchema = z.object({
  id: z.string().uuid(),
  content: z.string().max(2048, "Content exceeds 2048 token limit"), // Approximate
  metadata: z.record(z.unknown()).optional(),
  embedding: z.array(z.number()).optional(), // Vector representation
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Prisma schema addition
model Memory {
  id        String   @id @default(uuid())
  namespace String[] // Composite key part
  key       String   // Composite key part
  content   String   // Text content (validate ≤2048 tokens)
  metadata  Json?    // Flexible metadata
  embedding Unsupported("vector(384)")? // pgvector column
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([namespace, key])
  @@index([embedding], type: IVF) // Vector index for search
}
```

---

### Decision 5: Concurrency and Update Strategy

**Decision**: Last-write-wins strategy for concurrent memory updates (clarification confirmed)

**Rationale**:
- Simplest implementation for Phase 1 single-operator deployment
- Postgres UPSERT handles race conditions at database level
- No optimistic locking overhead
- Acceptable data loss risk for hobby deployment

**Alternatives Considered**:
- Optimistic locking with version: Rejected - added complexity for Phase 1
- Pessimistic locking: Rejected - performance concerns
- Conflict resolution UI: Rejected - out of scope (FR scope)

**Implementation Notes**:
```typescript
async upsert(namespace: string[], key: string, value: MemoryEntry): Promise<void> {
  await prisma.memory.upsert({
    where: { namespace_key: { namespace, key } },
    update: { 
      content: value.content,
      metadata: value.metadata,
      embedding: value.embedding,
      updatedAt: new Date(),
    },
    create: {
      id: value.id,
      namespace,
      key,
      content: value.content,
      metadata: value.metadata,
      embedding: value.embedding,
    },
  });
}
```

---

### Decision 6: Semantic Search Implementation

**Decision**: Use pgvector cosine similarity with 0.7 threshold, return all matches above threshold

**Rationale**:
- Clarification confirmed: retrieve all memories ≥0.7 similarity score
- pgvector provides efficient vector search in Postgres
- Cosine similarity standard for embedding-based retrieval
- No arbitrary limit on result count (dynamic based on relevance)

**Alternatives Considered**:
- Top-K retrieval: Rejected - clarification specified threshold-based, not count-based
- Euclidean distance: Rejected - cosine similarity more common for embeddings
- External vector DB (Pinecone, Weaviate): Rejected - added deployment complexity

**Implementation Notes**:
```typescript
async search(
  namespace: string[], 
  query: string, 
  threshold: number = 0.7
): Promise<MemoryEntry[]> {
  // Generate query embedding
  const queryEmbedding = await this.embeddings.embedQuery(query);
  
  // Vector similarity search
  const results = await prisma.$queryRaw`
    SELECT id, content, metadata, 
           1 - (embedding <=> ${queryEmbedding}::vector) as similarity
    FROM "Memory"
    WHERE namespace = ${namespace}
      AND 1 - (embedding <=> ${queryEmbedding}::vector) >= ${threshold}
    ORDER BY similarity DESC
  `;
  
  return results.map(r => ({
    id: r.id,
    content: r.content,
    metadata: r.metadata,
    similarity: r.similarity,
  }));
}
```

---

### Decision 7: Configuration and Environment Variables

**Decision**: Centralize memory config in environment variables with sensible defaults (always-on)

**Rationale**:
- Constitution VI mandates swappable configuration
- FR-010 requires env var configuration
- Always-on default per spec requirements
- Enables testing and development overrides

**Environment Variables**:
```bash
# Memory feature toggle (default: enabled)
MEMORY_ENABLED=true

# Embedding service
MEMORY_EMBEDDING_ENDPOINT=https://api.deepinfra.com/v1/openai
MEMORY_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
DEEPINFRA_API_KEY=<your-key>

# Search and limits
MEMORY_SIMILARITY_THRESHOLD=0.7
MEMORY_CONTENT_MAX_TOKENS=2048

# Postgres connection (reuse existing)
DATABASE_URL=postgresql://...
```

**Configuration Module**:
```typescript
// apps/server/src/agent/memory/config.ts
export const memoryConfig = {
  enabled: process.env.MEMORY_ENABLED !== "false",
  embeddingEndpoint: process.env.MEMORY_EMBEDDING_ENDPOINT || "https://api.deepinfra.com/v1/openai",
  embeddingModel: process.env.MEMORY_EMBEDDING_MODEL || "sentence-transformers/all-MiniLM-L6-v2",
  similarityThreshold: parseFloat(process.env.MEMORY_SIMILARITY_THRESHOLD || "0.7"),
  contentMaxTokens: parseInt(process.env.MEMORY_CONTENT_MAX_TOKENS || "2048"),
};
```

---

## Best Practices

### LangGraph Store Pattern
- Implement consistent namespace organization: `("memories", userId)`
- Use UUID for memory IDs to avoid collisions
- Leverage Prisma migrations for schema changes
- Log all store operations for observability (Pino)

### Embedding Best Practices
- Cache embeddings to avoid redundant API calls
- Handle embedding service failures gracefully (fallback to keyword search or skip)
- Validate embedding dimensions match pgvector column
- Consider batch embedding for multiple memories

### Graph Node Best Practices
- Keep nodes pure functions with explicit dependencies
- Pass store via graph config, not global state
- Handle missing store gracefully (feature toggle)
- Test nodes in isolation with mock store

### Testing Strategy
- Unit tests: Store operations (put, get, search, delete)
- Unit tests: Node behavior (retrieve, store logic)
- Integration tests: End-to-end memory persistence across threads
- Mock embeddings for deterministic tests

---

## Open Questions Resolved

1. **How many memories to retrieve?** → All memories above 0.7 similarity threshold (clarification)
2. **Memory size limit?** → 2048 tokens max (clarification)
3. **Concurrent updates?** → Last-write-wins strategy (clarification)
4. **Retention policy?** → Forever, no automatic expiration (clarification)
5. **Similarity threshold for testing?** → Same 0.7 threshold defines relevance (clarification)

---

## Dependencies and Prerequisites

**Required**:
- Postgres database with pgvector extension installed
- Prisma CLI for migrations
- DeepInfra API key for embeddings
- LangGraph JS 0.4.9+ (existing)

**Optional**:
- pgvector Docker image for local development
- Vector index tuning for large datasets (>10k memories)

---

### Decision 8: User Identification Mechanism

**Problem**: Memory system requires persistent `userId` for cross-session recall, but current system only has ephemeral `sessionId`.

**Solution**: Implement lightweight name-based user creation with localStorage persistence.

**Flow**:
1. Frontend prompts for name on first visit (no password)
2. POST `/api/users` with name → backend generates UUID userId
3. Backend returns `{ userId, name }` to frontend
4. Frontend stores userId in `localStorage` indefinitely
5. All chat requests include userId (separate from sessionId)
6. Memory namespace uses userId: `["memories", userId]`

**Architecture**:
- **SessionId**: Ephemeral, checkpoint-based short-term memory (per conversation thread)
- **UserId**: Persistent, long-term memory namespace (across all sessions)
- **Relationship**: Many sessions belong to one userId

**Rationale**:
- ✅ Persistent cross-session memories (survives browser refresh)
- ✅ Simple UX (name input, no authentication)
- ✅ Operator-friendly (can create named contexts: "operator", "demo", "test")
- ✅ Phase 1 appropriate (no auth complexity)
- ✅ Testable (mock localStorage, validate userId flow)

**Alternatives Rejected**:
- **sessionId = userId**: Memories lost on session reset
- **Full authentication**: Out of scope for Phase 1
- **Anonymous UUID only**: Poor UX, hard to distinguish users

**Implementation Notes**:
- Add `User` table: `id (UUID PK)`, `name (TEXT)`, `createdAt`
- Add Zod schema: `CreateUserRequestSchema`, `CreateUserResponseSchema`
- ChatRequest schema: Add optional `userId` field (falls back to sessionId if missing)
- Frontend: Check localStorage on mount, prompt if missing, persist on creation
- Backend: Simple user creation endpoint, no password/auth logic

**Testing**:
- Unit: User creation endpoint, localStorage mock
- Integration: UserId flow across sessions, memory namespace isolation
- E2E: Create user → chat → refresh browser → verify memories persist

**Risks**:
- localStorage can be cleared (acceptable for Phase 1 operator use)
- No multi-device sync (future: add login to sync userId)
- Name collisions allowed (acceptable: operator manages names)

**Mitigation**:
- Document localStorage persistence in quickstart.md
- Add "Export memories" feature in future for backup
- Phase 3: Add authentication to sync userId across devices

---

## Risk Mitigation

**Risk 1: LangGraph JS Store API differs from Python**
- Mitigation: Review LangGraph JS source code for actual Store interface
- Mitigation: Implement minimal interface first, extend as needed

**Risk 2: Embedding service downtime**
- Mitigation: Graceful degradation (skip memory retrieval, log error)
- Mitigation: Conversation continues with short-term memory only

**Risk 3: Token counting accuracy**
- Mitigation: Use tiktoken library for accurate token counting
- Mitigation: Add buffer (truncate at 2000 tokens to be safe)

**Risk 4: Performance with large memory stores**
- Mitigation: Monitor query performance, add indexes as needed
- Mitigation: Implement pagination if retrieval exceeds reasonable limits

---

## Next Steps (Phase 1)

1. Create data model documentation (`data-model.md`)
2. Define TypeScript contracts (`contracts/memory-store.schema.ts`)
3. Generate quickstart guide (`quickstart.md`)
4. Update agent context file
5. Re-evaluate Constitution Check post-design
