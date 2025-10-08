# Data Model: Long-Term Memory System

**Phase 1 Output** | **Date**: 2025-10-07

## Overview

This document defines the data model for Cerebrobot's long-term memory system. The model supports user-namespaced memories with semantic search capabilities, integrating with the existing Postgres database from Phase 1.5.

## 1. Core Entities

### User

**Description**: Represents a named user for memory namespace isolation. Created on first visit via name input.

**Fields**:
- `id` (UUID, PK): Unique user identifier
- `name` (TEXT, NOT NULL): Human-readable name (e.g., "operator", "demo")
- `createdAt` (TIMESTAMP, NOT NULL): User creation timestamp

**Constraints**:
- Primary key on `id`
- No unique constraint on `name` (operator can create duplicate names if needed)

**Usage**:
- Frontend stores `userId` in localStorage indefinitely
- All chat requests include `userId` for memory namespace scoping
- Many sessions can belong to one userId

---

### Memory Entry

**Description**: Represents a single piece of stored knowledge in the long-term memory system.

**Fields**:

**Attributes**:
- `id`: UUID - Unique identifier for the memory entry
- `namespace`: string[] - Organizational tuple scoping the memory (e.g., `["memories", "user123"]`)
- `key`: string - Unique key within the namespace
- `content`: string - The actual memory content (max 2048 tokens)
- `metadata`: Record<string, unknown> - Flexible JSON object for additional context
- `embedding`: number[] - Vector representation of content for semantic search (384 dimensions)
- `createdAt`: DateTime - Timestamp when memory was created
- `updatedAt`: DateTime - Timestamp when memory was last modified

**Validation Rules**:
- `content` must not exceed 2048 tokens (enforced at application layer)
- `namespace` + `key` combination must be unique (composite unique constraint)
- `embedding` dimension must match configured model (default: 384 for MiniLM-L6-v2)
- `metadata` is optional and can contain arbitrary JSON

**State Transitions**:
1. **Created**: New memory entry inserted via `upsertMemory` tool
2. **Updated**: Existing memory modified via `upsertMemory` (last-write-wins)
3. **Deleted**: Not supported in Phase 1 (manual database cleanup only)

**Relationships**:
- Scoped by namespace (hierarchical organization)
- No explicit foreign keys to User entity (userId embedded in namespace)

---

### Memory Namespace

Organizational unit for grouping related memories.

**Attributes**:
- `path`: string[] - Tuple representing the namespace hierarchy

**Patterns**:
- User memories: `["memories", userId]`
- Future: Domain-specific memories: `["memories", userId, "preferences"]`
- Future: Shared memories: `["shared", "team123"]`

**Validation Rules**:
- Namespace tuple must have at least 2 elements (type + identifier)
- Elements must be non-empty strings

**Usage**:
- Provides isolation between users (multi-tenant support)
- Enables hierarchical memory organization
- Supports future extensions (team memories, domain-specific stores)

---

### upsertMemory Tool Schema

LLM-accessible tool for storing or updating memories.

**Input Parameters**:
- `content`: string (required) - The memory content to store
- `metadata`: object (optional) - Additional context as JSON
- `key`: string (optional) - Specific key for the memory; auto-generated if not provided

**Output**:
- `success`: boolean - Indicates if operation succeeded
- `memoryId`: string - UUID of the created/updated memory
- `message`: string - Human-readable result message

**Behavior**:
- If key exists in user's namespace: UPDATE existing memory
- If key does not exist: CREATE new memory
- Auto-generates UUID-based key if not provided
- Computes and stores embedding automatically

---

## Database Schema (Prisma)

### Memory Table

```prisma
model Memory {
  id        String   @id @default(uuid())
  namespace String[] // Array representing namespace tuple
  key       String   // Unique within namespace
  content   String   // Memory content (validate ≤2048 tokens at app layer)
  metadata  Json?    // Optional flexible metadata
  embedding Unsupported("vector(384)")? @db.Vector(384) // pgvector column
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([namespace, key], name: "namespace_key")
  @@index([embedding], type: Ivfflat, name: "embedding_idx") // Vector similarity index
}
```

**Index Strategy**:
- `@@unique([namespace, key])`: Enforce uniqueness per namespace
- `@@index([embedding])`: IVFFlat index for fast vector similarity search
- Consider adding `@@index([namespace])` for faster namespace-scoped queries

**Vector Extension**:
- Requires `pgvector` extension: `CREATE EXTENSION IF NOT EXISTS vector;`
- Vector dimension: 384 (matches MiniLM-L6-v2 model)
- Distance metric: Cosine similarity (`<=>` operator)

---

## TypeScript Interfaces

### Core Types

```typescript
// packages/chat-shared/src/schemas/memory.ts
import { z } from "zod";

export const MemoryEntrySchema = z.object({
  id: z.string().uuid(),
  namespace: z.array(z.string().min(1)).min(2),
  key: z.string().min(1),
  content: z.string().max(8192), // Approximate 2048 tokens = ~8KB chars
  metadata: z.record(z.unknown()).optional(),
  embedding: z.array(z.number()).length(384).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;

export const UpsertMemoryInputSchema = z.object({
  content: z.string().max(8192),
  metadata: z.record(z.unknown()).optional(),
  key: z.string().optional(),
});

export type UpsertMemoryInput = z.infer<typeof UpsertMemoryInputSchema>;

export const MemorySearchResultSchema = MemoryEntrySchema.extend({
  similarity: z.number().min(0).max(1),
});

export type MemorySearchResult = z.infer<typeof MemorySearchResultSchema>;
```

### Store Interface

```typescript
// apps/server/src/agent/memory/store.ts
export interface BaseStore {
  /**
   * Store a memory entry
   */
  put(namespace: string[], key: string, value: MemoryEntry): Promise<void>;

  /**
   * Retrieve a memory entry by key
   */
  get(namespace: string[], key: string): Promise<MemoryEntry | null>;

  /**
   * Search memories by semantic similarity
   */
  search(
    namespace: string[],
    query: string,
    options?: {
      threshold?: number; // Default: 0.7
      limit?: number; // Max results (optional)
    }
  ): Promise<MemorySearchResult[]>;

  /**
   * Delete a memory entry
   */
  delete(namespace: string[], key: string): Promise<void>;

  /**
   * List all keys in a namespace
   */
  list(namespace: string[]): Promise<string[]>;
}
```

---

## State Management

### Graph State Extension

```typescript
// Extend existing MessagesState
export interface MemoryState extends MessagesState {
  // Existing fields
  messages: BaseMessage[];
  summary?: string;
  
  // NEW: Memory fields
  userId: string; // User identifier for namespace
  retrievedMemories?: MemorySearchResult[]; // Memories injected into context
  memoryOperations?: UpsertMemoryInput[]; // Pending memory operations from LLM
}
```

### Memory Lifecycle in Graph

1. **retrieveMemories Node**:
   - Input: `MemoryState` with `userId` and latest user message
   - Process: Search memories with similarity ≥0.7
   - Output: Update `retrievedMemories` in state

2. **callModel Node** (existing, modified):
   - Input: `MemoryState` with `retrievedMemories`
   - Process: Inject memories into system prompt or messages
   - Output: LLM response with potential `upsertMemory` tool calls

3. **storeMemory Node**:
   - Input: `MemoryState` with `memoryOperations` from tool calls
   - Process: Execute upsert operations via store
   - Output: Updated state with operation results

---

## Data Flow Diagrams

### Memory Storage Flow

```
User Message
    ↓
[retrieveMemories Node]
    ├─→ Search store with query embedding
    ├─→ Filter results (similarity ≥ 0.7)
    └─→ Inject into state.retrievedMemories
    ↓
[callModel Node]
    ├─→ Build context with retrieved memories
    ├─→ LLM processes and may call upsertMemory tool
    └─→ Extract tool calls to state.memoryOperations
    ↓
[storeMemory Node]
    ├─→ For each memory operation:
    │   ├─→ Validate content (≤2048 tokens)
    │   ├─→ Generate embedding
    │   └─→ Upsert to store
    └─→ Log operation results
    ↓
Continue conversation
```

### Namespace Organization

```
Store Root
├── ["memories", "user123"]        # User-specific memories
│   ├── "pref_food" → vegetarian
│   ├── "pref_timezone" → EST
│   └── "name" → Sarah
│
├── ["memories", "user456"]        # Different user (isolated)
│   └── "pref_food" → carnivore
│
└── ["shared", "global"]           # Future: Shared memories (Phase 2+)
    └── ...
```

---

## Migration Strategy

### Database Migration

```sql
-- Migration: Add memory table with pgvector support
-- File: prisma/migrations/YYYYMMDD_add_memory_table/migration.sql

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create memory table
CREATE TABLE "Memory" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "namespace" TEXT[] NOT NULL,
  "key" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "metadata" JSONB,
  "embedding" vector(384),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "namespace_key" UNIQUE ("namespace", "key")
);

-- Create vector similarity index
CREATE INDEX "embedding_idx" ON "Memory" 
USING ivfflat ("embedding" vector_cosine_ops)
WITH (lists = 100);

-- Create namespace index for faster scoped queries
CREATE INDEX "namespace_idx" ON "Memory" ("namespace");
```

### Data Seeding (Optional)

```typescript
// For testing: Seed sample memories
const seedMemories = [
  {
    namespace: ["memories", "user123"],
    key: "pref_food",
    content: "User is vegetarian and prefers Italian cuisine",
    metadata: { category: "dietary", confidence: "high" },
  },
  {
    namespace: ["memories", "user123"],
    key: "pref_timezone",
    content: "User is located in EST timezone (New York)",
    metadata: { category: "location", confidence: "medium" },
  },
];
```

---

## Validation Rules

### Content Validation

```typescript
export function validateMemoryContent(content: string): void {
  // Token counting (approximate: 4 chars ≈ 1 token)
  const estimatedTokens = Math.ceil(content.length / 4);
  
  if (estimatedTokens > 2048) {
    throw new Error(`Memory content exceeds 2048 token limit (estimated: ${estimatedTokens} tokens)`);
  }
  
  if (content.trim().length === 0) {
    throw new Error("Memory content cannot be empty");
  }
}
```

### Namespace Validation

```typescript
export function validateNamespace(namespace: string[]): void {
  if (namespace.length < 2) {
    throw new Error("Namespace must have at least 2 elements (type + identifier)");
  }
  
  if (namespace.some(part => !part.trim())) {
    throw new Error("Namespace elements cannot be empty");
  }
}
```

---

## Performance Considerations

### Query Optimization

- **Vector Index Tuning**: Adjust `lists` parameter based on dataset size
  - Small (<1K memories): lists = 10
  - Medium (1K-10K memories): lists = 100
  - Large (>10K memories): lists = 1000

- **Similarity Search**: Limit results if retrieval exceeds reasonable count
  ```typescript
  const MAX_RETRIEVED_MEMORIES = 20; // Safety limit
  ```

- **Embedding Cache**: Cache embeddings for frequently queried terms
  ```typescript
  const embeddingCache = new LRUCache<string, number[]>(100);
  ```

### Storage Estimates

- Average memory size: ~500 tokens × 4 chars = 2KB text
- Embedding size: 384 dimensions × 4 bytes = 1.5KB
- Total per memory: ~3.5KB
- 1000 memories: ~3.5MB
- Postgres storage growth: Manageable for single-operator deployment

---

## Security & Privacy

### Access Control

- **Namespace Isolation**: User memories scoped by userId in namespace
- **No Cross-User Access**: Store queries always include namespace filter
- **Future**: Add userId validation to ensure caller owns namespace

### Data Retention

- **Indefinite Storage**: No automatic expiration (per clarification)
- **Manual Cleanup**: Operator can delete via direct SQL
- **Future**: Add TTL support with configurable retention periods

---

## Testing Data Model

### Unit Test Coverage

1. **Schema Validation**:
   - Valid memory entry passes Zod validation
   - Invalid content (>2048 tokens) fails
   - Missing required fields fail

2. **Store Operations**:
   - PUT creates new memory
   - PUT updates existing memory (upsert)
   - GET retrieves by namespace + key
   - SEARCH returns results above threshold
   - DELETE removes memory

3. **Namespace Isolation**:
   - User A cannot retrieve User B's memories
   - Search scoped to specific namespace

### Integration Test Scenarios

1. **Cross-Thread Memory**:
   - Store memory in thread A
   - Retrieve memory in thread B
   - Verify content matches

2. **Semantic Search**:
   - Store "User is vegetarian"
   - Search "What food does user like?"
   - Verify memory retrieved (similarity ≥0.7)

3. **Concurrent Updates**:
   - Two threads update same memory
   - Verify last-write-wins behavior

---

## Future Extensions

### Phase 2+ Enhancements

- **Memory Categories**: Add `category` field for filtering (preferences, facts, goals)
- **Memory Importance**: Add `importance` score for prioritizing retrieval
- **Memory Expiry**: Add `expiresAt` field for TTL-based cleanup
- **Memory Versioning**: Track history of updates for audit trail
- **Shared Memories**: Support team/organization namespaces
- **Memory Linking**: Relationships between related memories

### Potential Schema Evolution

```typescript
// Future: Enhanced memory schema
export const EnhancedMemorySchema = MemoryEntrySchema.extend({
  category: z.enum(["preference", "fact", "goal", "context"]),
  importance: z.number().min(0).max(1), // Relevance score
  expiresAt: z.date().optional(), // TTL support
  version: z.number().int().positive(), // Version tracking
  parentId: z.string().uuid().optional(), // Memory linking
});
```

---

## Appendix: Reference Patterns from Python Article

**Adapted Patterns**:
1. ✅ Namespace-based organization: `("memories", userId)`
2. ✅ Semantic search with embedding similarity
3. ✅ Upsert pattern for memory updates
4. ✅ Pre-LLM retrieval and post-LLM storage nodes
5. ✅ Flexible metadata storage

**TypeScript Adaptations**:
- Prisma replaces SQLAlchemy for database access
- Zod replaces Pydantic for schema validation
- LangGraph JS patterns replace Python implementations
- pgvector for Postgres vector operations (same as Python)
