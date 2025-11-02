# Data Model: Agent Management UI

**Feature**: 011-agent-crud-ui  
**Date**: 2025-10-31  
**Status**: Complete

## Overview

This document defines the data model for agent configuration storage and management, including database schema, TypeScript types, validation rules, and relationships.

## Database Schema

### Agent Table

**Purpose**: Store agent configurations as JSON documents with metadata for efficient querying.

```prisma
model Agent {
  id        String   @id @default(uuid()) @db.Uuid
  name      String   // Denormalized from config.name for list queries
  config    Json     @db.JsonB // Complete agent configuration
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz
  
  threads   Thread[] @relation("AgentThreads")
  
  @@index([name])
  @@index([createdAt(sort: Desc)])
  @@map("agents")
}
```

**Fields**:
- `id`: UUID primary key, auto-generated
- `name`: Denormalized agent name for list view performance
- `config`: JSONB column storing complete agent configuration (see Agent Config Structure below)
- `createdAt`: Timestamp of agent creation (UTC)
- `updatedAt`: Timestamp of last update (UTC)

**Indexes**:
- `name`: Support filtering/searching by agent name
- `createdAt DESC`: Support sorting by most recently created

**Relationships**:
- `threads`: One-to-many with Thread table (cascade delete handled at application layer)

### Updated Thread Model

**Change**: Existing Thread model already has `agentId` field. No schema changes needed, but cascade delete behavior must be implemented in application code.

```prisma
model Thread {
  id        String   @id @default(uuid())
  agentId   String   @map("agent_id")  // References Agent.id OR filesystem agent ID
  userId    String?  @map("user_id")
  createdAt DateTime @default(now()) @map("created_at")

  @@index([agentId])
  @@index([userId])
  @@map("threads")
}
```

**Note**: `agentId` references database agents only (UUIDs). After migration, filesystem agent loading is deprecated - all agents managed via database.

## Agent Configuration Structure

### TypeScript Type

```typescript
interface AgentConfig {
  id: string;                    // UUID (matches database Agent.id)
  name: string;                  // Display name
  systemPrompt: string;          // LLM system prompt
  personaTag: string;            // UI display tag (e.g., "🤖 assistant")
  
  llm: {
    model: string;               // e.g., "deepseek-ai/DeepSeek-V3"
    temperature: number;         // 0.0-2.0
    apiKey: string;              // Plain text API key
    apiBase: string;             // OpenAI-compatible endpoint URL
    maxTokens?: number;          // Optional max tokens
  };
  
  memory: {
    hotPathLimit: number;        // Max memories in hot path
    hotPathTokenBudget: number;  // Token budget for hot path
    recentMessageFloor: number;  // Min recent messages to include
    hotPathMarginPct: number;    // Margin percentage (0.0-1.0)
    embeddingModel: string;      // e.g., "Qwen/Qwen3-Embedding-8B"
    embeddingEndpoint: string;   // Embedding API endpoint
    apiKey: string;              // Embedding API key (plain text)
    similarityThreshold: number; // 0.0-1.0
    maxTokens: number;           // Max tokens for memory injection
    injectionBudget: number;     // Token budget for injection
    retrievalTimeoutMs: number;  // Timeout in milliseconds
  };
  
  autonomy: {
    enabled: boolean;
    
    evaluator: {
      model: string;             // Evaluator LLM model
      temperature: number;       // 0.0-2.0
      maxTokens: number;         // Max tokens for evaluation
      systemPrompt: string;      // Evaluator instructions
    };
    
    limits: {
      maxFollowUpsPerSession: number;
      minDelayMs: number;
      maxDelayMs: number;
    };
    
    memoryContext: {
      recentMemoryCount: number;
      includeRecentMessages: number;
    };
  };
}
```

### Validation Rules

**Required Fields** (must be present and non-empty):
- `id` (UUID format)
- `name` (min 1 char, max 100 chars)
- `systemPrompt` (min 1 char, max 10,000 chars)
- `personaTag` (min 1 char, max 50 chars)
- `llm.model`
- `llm.temperature` (0.0-2.0)
- `llm.apiKey` (min 1 char)
- `llm.apiBase` (valid URL)
- `memory.*` (all fields required with ranges below)
- `autonomy.enabled` (boolean)

**Numeric Ranges** (Updated 2025-10-31 to support 2M token context windows):
- `llm.temperature`: 0.0-2.0
- `llm.maxTokens`: 1-2000000 (if provided)
- `memory.hotPathLimit`: 1-1000
- `memory.hotPathTokenBudget`: 100-2000000
- `memory.recentMessageFloor`: 0-100
- `memory.hotPathMarginPct`: 0.0-1.0
- `memory.similarityThreshold`: 0.0-1.0
- `memory.maxTokens`: 100-2000000
- `memory.injectionBudget`: 100-2000000
- `memory.retrievalTimeoutMs`: 100-60000
- `autonomy.evaluator.temperature`: 0.0-2.0
- `autonomy.evaluator.maxTokens`: 1-2000000
- `autonomy.limits.maxFollowUpsPerSession`: 1-100
- `autonomy.limits.minDelayMs`: 1000-3600000
- `autonomy.limits.maxDelayMs`: 1000-3600000 (must be >= minDelayMs)
- `autonomy.memoryContext.recentMemoryCount`: 0-100
- `autonomy.memoryContext.includeRecentMessages`: 0-100

**Conditional Requirements**:
- If `autonomy.enabled === true`, all `autonomy.evaluator`, `autonomy.limits`, and `autonomy.memoryContext` fields are required
- If `autonomy.enabled === false`, autonomy sub-fields are optional

## State Transitions

### Agent Lifecycle

```
[Non-existent] 
    ↓ POST /api/agents (with valid config)
[Active]
    ↓ PUT /api/agents/:id (with valid config)
[Active] (updated)
    ↓ DELETE /api/agents/:id
[Deleted] (cascade: threads → checkpoints)
```

**States**:
- **Non-existent**: Agent not in database
- **Active**: Agent exists in database, available for conversation threads
- **Deleted**: Agent removed from database (permanent, no soft-delete)

**Operations**:
- **Create**: Validate config → Insert into DB → Return agent
- **Update**: Validate config → Update DB → Return updated agent
- **Delete**: Check for threads → Cascade delete threads & checkpoints → Delete agent

**Note**: No draft, inactive, or archived states in Phase 1.

## Relationships & Cascade Behavior

### Agent → Thread (One-to-Many)

**Relationship**: One agent can have multiple threads (conversations).

**Cascade Delete** (application-enforced):
```
DELETE Agent
  ↓
DELETE Thread WHERE agentId = <agent_id>
  ↓
DELETE LangGraphCheckpoint WHERE threadId IN <thread_ids>
  ↓
DELETE LangGraphCheckpointWrite WHERE threadId IN <thread_ids>
```

**Transaction Boundaries**: All deletes occur within a single Prisma transaction to ensure atomicity.

### Thread → LangGraphCheckpoint (One-to-Many)

**Existing Relationship**: Thread references are embedded in LangGraph checkpoint data (threadId field).

**Cascade Delete**: LangGraph checkpoints and writes deleted when thread is deleted.

## Indexes & Query Patterns

### Common Queries

**List all agents** (for UI):
```sql
SELECT id, name, created_at, updated_at
FROM agents
ORDER BY created_at DESC;
```

**Get agent details** (for edit view):
```sql
SELECT id, name, config, created_at, updated_at
FROM agents
WHERE id = $1;
```

**Find threads for agent** (before delete):
```sql
SELECT id FROM threads WHERE agent_id = $1;
```

**Search agents by name** (future):
```sql
SELECT id, name, created_at
FROM agents
WHERE name ILIKE $1
ORDER BY name ASC;
```

### Index Usage

- `PRIMARY KEY (id)`: Fast lookups by UUID
- `INDEX (name)`: Fast filtering/searching by name
- `INDEX (created_at DESC)`: Fast sorting for list view (most recent first)

## Validation Layer

### Zod Schema Location

**File**: `packages/chat-shared/src/schemas/agent.ts`

**Exports**:
- `AgentConfigSchema`: Zod schema for runtime validation
- `AgentConfig`: TypeScript type inferred from schema
- `AgentListItemSchema`: Lightweight schema for list view (id, name, createdAt, updatedAt, autonomyEnabled)
- `AgentListItem`: TypeScript type for list item

**Note**: The existing `AgentListItemSchema` in packages/chat-shared/src/schemas/agent.ts needs to be updated to match FR-002 requirements (add timestamps and autonomy status, remove description field).

### Validation Points

1. **Client-side** (apps/client):
   - Form field validation on blur
   - Full form validation on submit
   - Prevents invalid requests

2. **Server-side** (apps/server):
   - Request body validation in route handlers
   - Defense against direct API calls
   - Ensures database integrity

### Error Messages

**Format**: `{ field: string; message: string }[]`

**Examples**:
- `{ field: "name", message: "Name is required" }`
- `{ field: "llm.temperature", message: "Temperature must be between 0.0 and 2.0" }`
- `{ field: "memory.hotPathLimit", message: "Hot path limit must be at least 1" }`

## Migration Strategy

### Prisma Migration

**File**: `prisma/migrations/YYYYMMDDHHMMSS_add_agents/migration.sql`

```sql
-- Create agents table
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_agents_name ON agents(name);
CREATE INDEX idx_agents_created_at ON agents(created_at DESC);

-- Add comment
COMMENT ON TABLE agents IS 'Agent configurations stored as JSONB for UI-based management';
```

**Rollback**:
```sql
DROP INDEX IF EXISTS idx_agents_created_at;
DROP INDEX IF EXISTS idx_agents_name;
DROP TABLE IF EXISTS agents CASCADE;
```

**Note**: No data migration from filesystem. Operators manually recreate agents via UI.

## Summary

- **Storage**: PostgreSQL with JSONB for flexible agent configs
- **Keys**: UUID primary keys (auto-generated)
- **Validation**: Shared Zod schemas (client + server)
- **Cascade**: Application-layer deletes (agents → threads → checkpoints)
- **Indexes**: Name and creation date for efficient queries
- **No migration**: Filesystem agents remain independent

Ready for contract generation (Phase 1 continuation).
