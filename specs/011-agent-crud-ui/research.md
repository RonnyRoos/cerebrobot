# Research: Agent Management UI

**Feature**: 011-agent-crud-ui  
**Date**: 2025-10-31  
**Status**: Complete

## Overview

This document consolidates research findings for implementing agent CRUD operations with database storage, REST API, and React UI within the existing Cerebrobot monorepo.

## Database Schema Design

### Decision: Add Agent table with JSONB config column

**Rationale**:
- PostgreSQL JSONB provides flexible schema for agent configurations while maintaining query performance
- Avoids rigid table structure that would need migration every time agent schema evolves
- Enables schema validation at application layer (Zod) rather than database constraints
- Aligns with existing Thread table pattern (simple metadata + foreign keys)

**Schema**:
```prisma
model Agent {
  id        String   @id @default(uuid()) @db.Uuid
  name      String   // Denormalized for list queries
  config    Json     @db.JsonB // Full agent configuration
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz
  
  threads   Thread[] // Cascade delete handled at API layer
  
  @@map("agents")
}
```

**Alternatives Considered**:
- **Fully normalized schema** (separate tables for LLM settings, memory config, autonomy): Rejected due to complexity and frequent schema changes
- **Text column with JSON**: Rejected due to lack of indexing and query capabilities of JSONB
- **File storage** (filesystem): Rejected as it doesn't support the UI's database-first requirement

## API Design Patterns

### Decision: RESTful CRUD with Zod validation

**Rationale**:
- REST aligns with existing Fastify routes in apps/server
- Zod schemas provide runtime validation consistent with current codebase
- OpenAPI generation via zod-openapi already in use
- Simple CRUD operations don't require GraphQL complexity

**Endpoints**:
```
GET    /api/agents          # List all agents
GET    /api/agents/:id      # Get single agent
POST   /api/agents          # Create agent
PUT    /api/agents/:id      # Update agent
DELETE /api/agents/:id      # Delete agent (cascade)
```

**Alternatives Considered**:
- **GraphQL**: Rejected due to YAGNI (no complex queries needed, simple CRUD sufficient)
- **WebSocket for real-time updates**: Rejected due to single-operator assumption (no concurrent sessions)
- **PATCH for partial updates**: Rejected in favor of full PUT (simpler validation, clearer intent)

## Cascade Delete Strategy

### Decision: Application-layer cascade with transaction

**Rationale**:
- Provides fine-grained control over deletion order
- Enables clear audit logging for each cascaded deletion
- Allows validation/confirmation before cascading
- PostgreSQL foreign key cascades would be automatic but less transparent

**Implementation**:
```typescript
// Prisma transaction ensures atomicity
await prisma.$transaction(async (tx) => {
  // 1. Delete LangGraph checkpoints for all agent conversations
  await tx.langGraphCheckpoint.deleteMany({
    where: { threadId: { in: threadIds } }
  });
  
  // 2. Delete conversations (threads)
  await tx.thread.deleteMany({
    where: { agentId: id }
  });
  
  // 3. Delete agent
  await tx.agent.delete({
    where: { id }
  });
});
```

**Alternatives Considered**:
- **Database CASCADE constraints**: Rejected for lack of transparency and audit trail
- **Soft delete with flags**: Rejected per spec clarification (no versioning in Phase 1)
- **Background job for cleanup**: Rejected as overkill for single-operator hobbyist deployment

## Schema Validation Strategy

### Decision: Shared Zod schema in packages/chat-shared

**Rationale**:
- Single source of truth for agent configuration structure
- Client and server use identical validation logic
- Template.json structure converted to Zod schema programmatically
- Runtime validation catches errors before database persistence

**Schema Location**:
```
packages/chat-shared/src/schemas/agent.ts
```

**Validation Flow**:
1. Client validates form input on blur/submit
2. Server validates request body before Prisma operation
3. Consistent error messages on both sides

**Alternatives Considered**:
- **JSON Schema**: Rejected in favor of Zod (TypeScript-first, better type inference)
- **Database CHECK constraints**: Rejected due to JSONB flexibility requirement
- **Separate client/server schemas**: Rejected to avoid drift and duplication

## React UI Component Structure

### Decision: Compound component pattern with hooks

**Rationale**:
- Follows existing UI patterns in apps/client
- Separation of concerns (presentation vs. data fetching)
- Reusable hooks for API calls
- Testable components with clean boundaries

**Component Hierarchy**:
```
<AgentManager>
  <AgentList>                    # P1: View all
    <AgentListItem />
  </AgentList>
  <AgentForm mode="create" />   # P2: Create
  <AgentForm mode="edit" />     # P3: Edit
  <DeleteConfirmDialog />       # P4: Delete
</AgentManager>
```

**Hooks**:
- `useAgents()` - List, create, update, delete operations
- `useAgentForm()` - Form state management and validation

**Alternatives Considered**:
- **Single monolithic component**: Rejected due to testability and maintainability concerns
- **Redux state management**: Rejected as overkill for simple CRUD (React Query or SWR sufficient)
- **Form library (React Hook Form)**: Considered but deferred to implementation phase

## Migration from Filesystem to Database

### Decision: No automated migration (manual recreation)

**Rationale** (from spec clarification):
- Operator preference for clean slate approach
- Filesystem configs remain as reference/backup
- Avoids migration complexity and potential errors
- Aligns with KISS principle

**Operator Workflow**:
1. Open agent management UI
2. See empty state with guidance
3. Reference existing config/agents/*.json files
4. Manually create agents via UI form
5. Filesystem-based agent loading continues to work independently

**Alternatives Considered**:
- **One-time migration script**: Rejected per operator feedback
- **Dual-mode loader (DB → filesystem fallback)**: Rejected as adding unnecessary complexity

## Form Validation UX

### Decision: Inline validation with debounce

**Rationale**:
- Immediate feedback improves UX (meets <500ms validation SC)
- Debounce prevents excessive validation calls during typing
- Field-level errors guide operator to specific issues
- Submit button disabled until all fields valid

**Validation Timing**:
- On blur: Validate single field
- On change (debounced 300ms): Re-validate if already touched
- On submit: Validate entire form

**Alternatives Considered**:
- **Submit-only validation**: Rejected due to poor UX (operator doesn't discover errors until submit)
- **Real-time validation (no debounce)**: Rejected due to performance concerns and visual noise

## API Key Display Security

### Decision: Plain text display (from clarification)

**Rationale** (from spec clarification):
- Single-operator deployment (trusted environment)
- Operator needs to view/edit keys directly
- No multi-user access requiring masking
- Aligns with operator-centric design principle

**Implementation**: Standard `<input type="text">` for API key fields

**Alternatives Considered**:
- **Masked with reveal toggle**: Rejected per operator preference (KISS)
- **Environment variables only**: Rejected as it prevents UI-based configuration
- **Hidden (write-only) fields**: Rejected per operator preference

## Testing Strategy

### Unit Tests
- **Zod schemas**: Validate agent config structure (packages/chat-shared)
- **API routes**: Test CRUD operations with in-memory Prisma (apps/server)
- **React components**: Test rendering, form submission, validation (apps/client)

### Postgres Validation Test
- **Migration verification**: Ensure Agent table created correctly
- **JSONB operations**: Verify config storage/retrieval
- **Cascade delete**: Confirm threads and checkpoints deleted

### Manual Smoke Tests
- **E2E flow**: Create → Edit → Delete agent via UI
- **Validation feedback**: Verify error messages for invalid configs
- **Performance**: Confirm <2s load, <500ms validation, <1s save

## Performance Considerations

### Decision: No pagination for agent list (initial implementation)

**Rationale**:
- Assumption: <50 agents per deployment (hobbyist scale)
- <2s load time achievable with simple `SELECT * FROM agents` + JSONB
- Index on `created_at` supports sorting
- Can add pagination in future if needed (YAGNI)

**Optimizations**:
- Only fetch `id`, `name`, key metadata for list view
- Full `config` loaded on demand for edit view
- Client-side filtering/sorting if needed

**Alternatives Considered**:
- **Cursor-based pagination**: Rejected as premature optimization
- **Virtual scrolling**: Rejected as overkill for expected data volume

## Filesystem vs Database Agent Coexistence

### Decision: Independent loading mechanisms

**Rationale**:
- Filesystem loader (existing) reads config/agents/*.json
- Database loader (new) queries Agent table
- Thread.agentId references either filesystem ID or database UUID
- Operator chooses which system to use (no enforcement)

**Identification**:
- Filesystem agents: Human-readable IDs from filename (e.g., "helpful-assistant")
- Database agents: Auto-generated UUIDs
- UI only shows database agents (filesystem agents remain CLI/config-accessible)

**Alternatives Considered**:
- **Unified loader with fallback**: Rejected due to added complexity
- **Migration flag to switch modes**: Rejected as unnecessary (both systems can coexist)

## Summary

All technical unknowns resolved. Implementation can proceed with:
- **Database**: Prisma migration adding Agent table with JSONB config
- **Backend**: Fastify REST API with Zod validation
- **Frontend**: React components with compound pattern + hooks
- **Testing**: Unit tests + Postgres validation test + manual smoke tests
- **Migration**: No automation (manual operator recreation)
- **Security**: Plain text API key display (trusted single-operator)

No blockers identified. Ready for Phase 1: Design & Contracts.
