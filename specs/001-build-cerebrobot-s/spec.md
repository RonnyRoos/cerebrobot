# Feature Specification: Long-Term Memory Layer with LangGraph Store

**Feature Branch**: `001-build-cerebrobot-s`  
**Created**: 2025-10-07  
**Status**: Draft  
**Input**: User description: "Build Cerebrobot's long-term memory layer using LangGraph's Store abstraction backed by Postgres. The system should maintain user-specific memories across all conversation threads, automatically retrieving relevant context before each LLM call and storing new memories when the LLM uses the upsertMemory tool. Memory entries will be flexible JSON objects stored under user-namespaced keys with semantic search powered by embeddings. The implementation mirrors the Python LangGraph memory article, integrating two new nodes—retrieveMemories and storeMemory—into the existing conversation graph while keeping the current checkpoint-based short-term memory intact. Configuration will default to always-on with DeepInfra embeddings, unit tests will validate the Store abstraction and node behavior, and the feature will work alongside existing summarization without replacing it. It must follow the reference article but convert all features to LangGraph JS."

## User Scenarios & Testing *(mandatory)*


### User Story 1 - Persistent User Preferences Across Conversations (Priority: P1)

A user shares personal information (preferences, facts, context) during a conversation. In a completely new conversation thread days later, the bot recalls this information without the user repeating it, demonstrating true long-term memory across sessions.

**Why this priority**: This is the core value proposition of long-term memory—breaking the isolation barrier between conversation threads. Without this, each conversation starts from zero context, creating a frustrating user experience.

**Independent Test**: Can be fully tested by (1) telling the bot a preference in thread A, (2) starting a fresh thread B, (3) asking about that preference, and (4) verifying the bot recalls it correctly. Delivers immediate value by eliminating repetition.

**Acceptance Scenarios**:

1. **Given** a user tells the bot "I'm vegetarian" in conversation thread A, **When** they start a new thread B and ask "What food should I make?", **Then** the bot recommends vegetarian options without asking about dietary preferences
2. **Given** a user shares their timezone "EST" in thread A, **When** they start thread B and say "Schedule something for 3pm", **Then** the bot correctly interprets 3pm EST without asking for timezone
3. **Given** a user states "My name is Sarah" in thread A, **When** they return in thread B, **Then** the bot greets them by name

---

### User Story 2 - Semantic Memory Search (Priority: P2)

A user asks a question that relates to previously stored information, but doesn't use the exact same words. The system finds relevant memories using semantic similarity, not just keyword matching.

**Why this priority**: Semantic search transforms memory from a rigid database into an intelligent recall system. Users naturally rephrase questions, and the system must understand intent, not just exact matches.

**Independent Test**: Can be tested by storing a memory like "User works at Microsoft" and later asking "Where does the user have a job?" The system should return the Microsoft memory despite different wording. Delivers value by making memory retrieval feel natural.

**Acceptance Scenarios**:

1. **Given** the bot has stored "User prefers thriller movies", **When** the user asks "What kind of films do I like?", **Then** the bot retrieves and uses the thriller preference memory
2. **Given** the bot has stored "User's birthday is March 15", **When** the user asks "When am I born?", **Then** the bot retrieves the birthday memory
3. **Given** the bot has stored multiple food-related memories, **When** the user asks "What are my eating habits?", **Then** the bot retrieves all relevant food/diet memories

---

### User Story 3 - LLM-Driven Memory Updates (Priority: P2)

During conversation, the LLM identifies new information worth remembering and automatically stores it using the upsertMemory tool. The user doesn't need to explicitly tell the bot to "remember this."

**Why this priority**: Autonomous memory management makes the system intelligent and low-friction. Users shouldn't have to think about what to store—the LLM determines what's valuable.

**Independent Test**: Can be tested by having a natural conversation where the user mentions preferences or facts. Inspect the memory store afterward to verify the LLM extracted and saved key information. Delivers value by learning from context automatically.

**Acceptance Scenarios**:

1. **Given** a user says "I've been learning Spanish for 3 months", **When** the LLM processes this message, **Then** it stores a memory about the user learning Spanish
2. **Given** a user mentions "I live in Seattle", **When** the LLM identifies this as location information, **Then** it upserts a memory with the user's location
3. **Given** a user provides updated information "Actually, I'm vegan now, not just vegetarian", **When** the LLM processes this, **Then** it updates the existing dietary preference memory

---

### User Story 4 - Memory Namespacing per User (Priority: P3)

Multiple users interact with the same bot instance, and their memories remain completely isolated. User A's preferences never leak into User B's context.

**Why this priority**: Essential for multi-user deployments, but lower priority since Phase 1 targets single-operator use. Still important for future-proofing and testing isolation.

**Independent Test**: Can be tested by having two different user IDs interact with the bot, storing different preferences for each, then verifying each user only sees their own memories. Delivers value by ensuring privacy and correctness.

**Acceptance Scenarios**:

1. **Given** user A stores "I like jazz music" and user B stores "I like rock music", **When** user A asks "What music do I like?", **Then** they only see jazz, not rock
2. **Given** user A and user B both have location memories, **When** memories are retrieved for user A, **Then** only user A's namespace is searched
3. **Given** user A updates a preference, **When** user B accesses memories, **Then** user B's memories are unchanged

---

### User Story 5 - Hybrid Memory (Short-term + Long-term) (Priority: P2)

The system combines short-term memory (current conversation context) with long-term memory (stored preferences from past conversations) to provide contextually rich responses.

**Why this priority**: Validates that both memory systems work together without conflicts. Critical for ensuring FR-008 (preserve checkpoint-based short-term memory) and FR-009 (work alongside summarization) are met.

**Independent Test**: Can be tested by (1) mentioning a preference in current conversation, (2) having a stored preference from past conversation, (3) asking a question that requires both contexts, (4) verifying the response uses both memory types. Delivers value by proving memory system integration.

**Acceptance Scenarios**:

1. **Given** a user mentions "I'm craving pizza" in the current conversation (short-term memory), **And** they previously stored "I'm vegetarian" in a past conversation (long-term memory), **When** they ask "What should I order?", **Then** the bot recommends vegetarian pizza options (combining both memory types)
2. **Given** a user is discussing travel plans in current thread (short-term), **And** their stored preference is "I prefer budget hotels" (long-term), **When** they ask for hotel recommendations, **Then** the bot suggests budget options in the discussed destination
3. **Given** a user asks "What did we just talk about?" (short-term recall), **And** asks "What do you know about me?" (long-term recall), **Then** the bot correctly distinguishes between recent conversation topics and stored user facts

---

### Edge Cases

- What happens when the embedding service (DeepInfra) is unavailable? System should fall back to non-semantic retrieval or log errors gracefully
- How does the system handle duplicate or conflicting memories (e.g., user says "I like pizza" then later "I don't like pizza")? The upsert operation should update existing memories using last-write-wins strategy (no optimistic locking for Phase 1)
- What happens when Postgres connection fails during memory retrieval? The conversation should continue with checkpoint-based short-term memory only, logging the failure
- How are very long memory content entries handled? Memory content exceeding 2048 tokens should be truncated with ellipsis or rejected with a validation error
- What happens when a user's memory store grows very large (1000+ entries)? Semantic search should still perform adequately; may need pagination or limits

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST implement LangGraph Store abstraction backed by PostgreSQL for persistent memory storage
- **FR-002**: System MUST create user-specific memory namespaces using pattern `("memories", userId)`
- **FR-003**: System MUST store memory entries as flexible JSON objects with at minimum `content` and `metadata` fields
- **FR-004**: System MUST support semantic search using embeddings from DeepInfra (OpenAI-compatible endpoint)
- **FR-005**: System MUST integrate memory operations into the conversation graph:
  - **retrieveMemories** node (custom): Runs before LLM to inject relevant context via semantic search
  - **tools** node (ToolNode): Executes the `upsertMemory` tool when LLM decides to store memories
  - **Rationale**: Follows idiomatic LangGraph pattern—custom nodes for preprocessing, ToolNode for tool execution (see [ADR: ToolNode Pattern](../../docs/architecture/langgraph-toolnode-pattern.md))
- **FR-006**: System MUST automatically retrieve relevant memories before each LLM call using semantic search, injecting all memories with similarity score above 0.7 threshold
- **FR-007**: System MUST provide the LLM with an `upsertMemory` tool that accepts memory content and optional metadata
- **FR-008**: System MUST preserve existing checkpoint-based short-term memory (thread-scoped state)
- **FR-009**: System MUST work alongside existing conversation summarization features without conflicts
- **FR-010**: System MUST configure memory features via environment variables with sensible defaults (always-on)
- **FR-011**: System MUST include unit tests validating Store operations (put, get, search) and node behavior
- **FR-012**: System MUST support both direct key-based retrieval and semantic similarity search
- **FR-013**: System MUST handle memory upsert operations idempotently (update if exists, create if new) using last-write-wins strategy for concurrent updates
- **FR-014**: System MUST inject retrieved memories into the LLM's context/system prompt before generation
- **FR-015**: System MUST log memory operations (store, retrieve, search) with structured logging (Pino)
- **FR-016**: System MUST retain memories indefinitely with no automatic expiration (manual cleanup via database access only)
- **FR-017**: System MUST use 0.7 as the minimum similarity score threshold for retrieving and determining memory relevance

### Key Entities

- **Memory Entry**: Represents a single piece of stored knowledge; contains `content` (string, max 2048 tokens), `metadata` (flexible JSON), `embedding` (vector), and `id` (UUID)
- **Memory Namespace**: Organizational unit scoping memories to a specific user; follows pattern `("memories", userId)`
- **Memory Store**: PostgreSQL-backed persistence layer implementing LangGraph Store interface; supports CRUD operations and semantic search
- **upsertMemory Tool**: LLM-accessible function allowing the model to store or update memories; accepts content and optional metadata as parameters

### Technical Specifications

#### Memory Entry Schema (CHK013)

```typescript
interface MemoryEntry {
  content: string;        // Required, 1-2048 tokens
  metadata?: {            // Optional flat key-value pairs
    [key: string]: string;
    // Constraints:
    // - Maximum 5 keys per memory
    // - Each key: max 50 characters
    // - Each value: max 200 characters
    // - Reserved keys (cannot be used): id, userId, createdAt, updatedAt, embedding
    // Example: { category: "preference", confidence: "high" }
  };
}
```

#### Pgvector Index Configuration (CHK003)

**Index Type**: IVFFlat (Inverted File with Flat Compression)

**Parameters**:
- **Lists**: 100 (number of clusters for index)
- **Probes**: 10 (number of clusters to search during query)
- **Distance Metric**: Cosine distance (`vector <=> vector`)

**Rationale**:
- IVFFlat chosen over HNSW for simpler setup and adequate performance at Phase 1 scale (<10K memories)
- 100 lists provides good balance: sqrt(total_rows) formula suggests 100 for ~10K rows
- 10 probes ensures 80%+ recall while maintaining <200ms latency (SC-003)
- Cosine distance standard for normalized embeddings from DeepInfra

**Migration SQL**:
```sql
CREATE INDEX memories_embedding_idx ON memories 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);
```

**Query Configuration**:
```sql
SET ivfflat.probes = 10;  -- Applied per-session or per-query
```

#### Environment Variables (CHK004)

**Required**:
- `DEEPINFRA_API_KEY`: API key for DeepInfra embeddings and LLM (no default, must be set)
- `DATABASE_URL`: PostgreSQL connection string (example: `postgresql://user:pass@localhost:5432/cerebrobot`)

**Optional with Defaults**:
- `MEMORY_EMBEDDING_ENDPOINT`: DeepInfra embeddings API URL (default: `https://api.deepinfra.com/v1/openai`)
- `MEMORY_EMBEDDING_MODEL`: Embedding model name (default: `Qwen/Qwen3-Embedding-8B`)
- `MEMORY_SIMILARITY_THRESHOLD`: Minimum similarity score for retrieval (default: `0.7`)
- `MEMORY_MAX_TOKENS`: Maximum tokens per memory content (default: `2048`)
- `MEMORY_INJECTION_BUDGET`: Maximum tokens for all injected memories (default: `1000`)
- `MEMORY_RETRIEVAL_TIMEOUT_MS`: Timeout for memory retrieval operations (default: `5000`)

**Example .env**:
```bash
DEEPINFRA_API_KEY=your_key_here
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cerebrobot
MEMORY_EMBEDDING_MODEL=Qwen/Qwen3-Embedding-8B
MEMORY_SIMILARITY_THRESHOLD=0.7
```

#### Memory Injection Format (CHK008)

**Approach**: MessagesPlaceholder pattern (adapted from LangGraph Python reference)

**Format**:
1. **Storage in State**: Retrieved memories stored in `state.memoryContext` field (string or undefined)
2. **Template**: Bullet list with dash prefix
   ```
   Relevant memories:
   - [memory content 1]
   - [memory content 2]
   ...
   ```
3. **Position**: Injected as separate message placeholder AFTER system prompt, BEFORE user messages
4. **Token Budget**: Maximum 1000 tokens for all memories combined (configurable via `MEMORY_INJECTION_BUDGET`)
5. **Truncation**: If memories exceed budget, include highest-scoring memories until budget exhausted, then append `[...and N more memories]`
6. **Empty Case**: If no memories retrieved, `memoryContext` is undefined (placeholder omitted, no extra tokens)
7. **Sorting**: Memories ordered by similarity score descending (highest relevance first)

**TypeScript Implementation Pattern**:
```typescript
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";

// In retrieveMemories node
const memories = await store.search(namespace, { query });
const memoryText = memories
  .map(mem => `- ${mem.value.content}`)
  .join('\n');

if (memoryText) {
  state.memoryContext = `Relevant memories:\n${memoryText}`;
}

// In LLM chain
const prompt = ChatPromptTemplate.fromMessages([
  ["system", SYSTEM_PROMPT],
  new MessagesPlaceholder("messages"),
  new MessagesPlaceholder("memoryContext", true) // optional=true
]);
```

#### Failure Handling (CHK019)

**retrieveMemories Failures**:
- **Timeout** (>5s): Log warning with userId, continue with empty memories (`state.memoryContext = undefined`)
- **Database Error**: Log error with userId and stack trace, continue with empty memories
- **Embedding Service Unavailable**: Log error, skip semantic search, continue with empty memories
- **User Notification**: None (transparent failure, operator monitors logs)

**storeMemory Failures**:
- **Database Error**: Log error with memory content preview, do NOT block response to user
- **Validation Error**: Log error (e.g., content exceeds 2048 tokens), do NOT block response
- **User Notification**: None (transparent failure, operator monitors logs)

**Retry Logic**:
- No automatic retries in Phase 1
- Next conversation turn will naturally retry retrieval
- Operator can manually re-trigger storage via database inspection

**Logging Format** (Pino structured):
```typescript
logger.error({
  operation: 'retrieveMemories',
  userId,
  error: err.message,
  stack: err.stack
}, 'Memory retrieval failed, continuing with empty memories');
```

#### Frontend User Persistence (CHK020)

**localStorage Configuration**:
- **Key**: `cerebrobot_userId`
- **Value**: UUID string from POST /api/users response
- **Set Timing**: After successful user creation/retrieval (200 or 201 response)
- **Expiration**: Never (persists across browser sessions)
- **Fallback**: If localStorage unavailable (private browsing, disabled), prompt for name on every page load
- **Cross-tab Sync**: Not needed (Phase 1 assumes single-tab usage)
- **Clearing**: Manual only via browser DevTools (no automatic logout/clear)

**React Implementation Pattern**:
```typescript
// After POST /api/users success
const response = await fetch('/api/users', {
  method: 'POST',
  body: JSON.stringify({ name: userName })
});
const { id } = await response.json();

try {
  localStorage.setItem('cerebrobot_userId', id);
} catch (err) {
  console.warn('localStorage unavailable, userId will not persist');
}

// On app load
const getUserId = () => {
  try {
    return localStorage.getItem('cerebrobot_userId');
  } catch {
    return null; // Will prompt for name
  }
};
```

#### POST /api/users API Contract (CHK006)

**Endpoint**: `POST /api/users`

**Request Body**:
```typescript
{
  name: string; // Required, 1-100 characters, alphanumeric + spaces only
}
```

**Validation Rules**:
- `name` must be present and non-empty
- `name` length: 1-100 characters
- `name` format: `/^[a-zA-Z0-9 ]+$/` (alphanumeric and spaces)

**Response - 201 Created** (new user):
```typescript
{
  id: string;        // UUID v4
  name: string;      // Echoed from request
  createdAt: string; // ISO 8601 timestamp
}
```

**Response - 200 OK** (existing user, idempotent):
```typescript
{
  id: string;        // Existing UUID
  name: string;      // Existing name
  createdAt: string; // Original creation timestamp
}
```

**Error Responses**:
- **400 Bad Request**: Invalid name format or missing field
  ```typescript
  { error: "Validation failed", details: "Name must be 1-100 alphanumeric characters" }
  ```
- **500 Internal Server Error**: Database error
  ```typescript
  { error: "Internal server error", message: "Failed to create user" }
  ```

**Idempotency Behavior**:
- If user with same name exists: return existing user (200 OK)
- If user doesn't exist: create new user (201 Created)
- No duplicate prevention (multiple users can have same name, different IDs)

#### Rollback and Recovery (CHK030/CHK031)

**Memory Consistency Guarantees**:
- **No Transactional Coupling**: `storeMemory` failures do NOT rollback LLM responses
- **Response Priority**: User always receives LLM response, even if memory storage fails
- **Best-Effort Storage**: Memory writes are logged but not blocking

**storeMemory Failure Handling**:
1. LLM generates response with tool calls
2. Response sent to user immediately
3. `storeMemory` node attempts to persist memory
4. If failure occurs: log error, do NOT throw exception
5. Graph continues to next turn

**retrieveMemories Failure Handling**:
1. Attempt to retrieve memories with 5s timeout
2. If failure: log error, set `state.memoryContext = undefined`
3. LLM proceeds with empty memory context
4. Next turn automatically retries (no circuit breaker)

**Operator Recovery Procedures**:
- **Failed Storage**: Inspect Pino logs for error details, manually insert memory via SQL if critical
- **Failed Retrieval**: Check Postgres/DeepInfra connectivity, conversation continues degraded
- **Data Corruption**: No automatic rollback; operator manually repairs via database

**Phase 1 Pragmatism**:
- No distributed transactions
- No optimistic locking
- No automatic retry mechanisms
- No memory versioning or audit trails
- Conversation flow never blocked by memory system failures

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: User preferences shared in one conversation thread are successfully recalled in a separate thread without re-asking (100% recall rate for explicitly stored facts)
- **SC-002**: Semantic search retrieves relevant memories (similarity score ≥0.7) with at least 80% accuracy when queries use synonyms or rephrased language
- **SC-003**: Memory retrieval completes within 200ms for typical queries (under 10 stored memories) to avoid disrupting conversation flow
- **SC-004**: The system successfully stores memories from LLM tool calls in 95%+ of cases when new user information is shared
- **SC-005**: Memory operations fail gracefully—conversation continues using short-term memory when long-term memory is unavailable
- **SC-006**: Unit test coverage for memory nodes and Store operations reaches 90%+, validating core functionality
- **SC-007**: Multiple users can interact with the system concurrently without memory leakage (100% namespace isolation)
- **SC-008**: Existing summarization and checkpoint features continue working unchanged after memory integration (zero regressions)

## Assumptions *(informational)*

- DeepInfra's OpenAI-compatible embeddings API will be available and responsive (fallback to non-semantic search if unavailable)
- User identification mechanism (userId) will be implemented via name-based user creation with localStorage persistence (see research.md Decision 8)
- PostgreSQL database is already provisioned and accessible (per Phase 1.5 checkpoint work)
- LangGraph JS supports Store abstraction similar to Python implementation (adapting patterns as needed)
- Memory content size is reasonable (under 10KB per entry) for efficient storage and retrieval
- Initial deployment targets single-operator use, but multi-user namespacing is implemented for future scalability
- Existing LangGraph agent graph structure allows insertion of pre-LLM and post-LLM nodes without breaking flows

## Clarifications

### Session 2025-10-07

- Q: How many memories should be retrieved and injected into the LLM context per query? → A: All memories above 0.7 similarity score
- Q: What is the maximum size limit for a single memory content entry? → A: 2048 tokens max
- Q: How should the system handle concurrent updates to the same memory entry? → A: Last-write-wins (no locking)
- Q: How long should memories be retained in the system? → A: Forever (no expiration)
- Q: Should the 0.7 similarity threshold be considered the minimum for "relevant" matches, or is there a different threshold for testing success criteria? → A: Use the same threshold everywhere (0.7 defines relevance)

## Out of Scope *(boundary definition)*

- Memory deletion or archival features (manual cleanup can happen via direct database access; no automatic TTL or expiration in Phase 1)
- Complex memory reasoning or inference beyond what the LLM naturally does
- Memory conflict resolution UI or manual memory editing interfaces (operator can use database tools)
- Advanced memory types beyond semantic/episodic (no procedural or meta-memory in this phase)
- Real-time memory synchronization across distributed deployments
- Memory versioning or audit trails (basic logging only)
- Fine-tuned embedding models (using off-the-shelf DeepInfra embeddings)
- Memory compression or summarization of stored entries
