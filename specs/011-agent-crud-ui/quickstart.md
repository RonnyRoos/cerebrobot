# Quickstart: Agent Management UI

**Feature**: 011-agent-crud-ui  
**Date**: 2025-10-31  
**Audience**: Developers implementing this feature

## Overview

This guide walks through implementing agent CRUD operations with database storage, REST API, and React UI. Follow steps sequentially to build the feature incrementally.

## Prerequisites

- Cerebrobot repository cloned and dependencies installed (`pnpm install`)
- PostgreSQL running via Docker Compose (`docker-compose up -d`)
- Development server running (`pnpm dev`)
- Familiarity with Prisma, Fastify, React, Zod

## Implementation Phases

### Phase 1: Database Schema (P1 Foundation)

**Goal**: Add Agent table to Prisma schema and run migration.

**Files**:
- `prisma/schema.prisma`
- `prisma/migrations/YYYYMMDDHHMMSS_add_agents/migration.sql`

**Steps**:

1. **Add Agent model to Prisma schema**:
   ```prisma
   model Agent {
     id        String   @id @default(uuid()) @db.Uuid
     name      String
     config    Json     @db.JsonB
     createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
     updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz
     
     threads   Thread[] @relation("AgentThreads")
     
     @@index([name])
     @@index([createdAt(sort: Desc)])
     @@map("agents")
   }
   ```

2. **Create migration**:
   ```bash
   pnpm --filter @cerebrobot/server prisma migrate dev --name add_agents
   ```

3. **Verify migration**:
   ```bash
   pnpm --filter @cerebrobot/server prisma studio
   # Check that agents table exists
   ```

4. **Generate Prisma client**:
   ```bash
   pnpm --filter @cerebrobot/server prisma generate
   ```

**Validation**:
- Migration creates `agents` table
- Indexes on `name` and `created_at` exist
- No errors in `pnpm test`

---

### Phase 2: Shared Schema (P2 Foundation)

**Goal**: Define Zod schema for agent validation in shared package.

**Files**:
- `packages/chat-shared/src/schemas/agent.ts`
- `packages/chat-shared/src/schemas/index.ts`
- `packages/chat-shared/__tests__/schemas/agent.test.ts`

**Steps**:

1. **Create Zod schema** (based on data-model.md, updated 2025-10-31 for 2M token support):
   ```typescript
   import { z } from 'zod';
   
   export const AgentConfigSchema = z.object({
     id: z.string().uuid(),
     name: z.string().min(1).max(100),
     systemPrompt: z.string().min(1).max(10000),
     personaTag: z.string().min(1).max(50),
     llm: z.object({
       model: z.string().min(1),
       temperature: z.number().min(0).max(2),
       apiKey: z.string().min(1),
       apiBase: z.string().url(),
       maxTokens: z.number().min(1).max(2000000).optional(),
     }),
     memory: z.object({
       hotPathLimit: z.number().min(1).max(1000),
       // ... (see data-model.md for complete schema with 2M token limits)
     }),
     autonomy: z.object({
       enabled: z.boolean(),
       evaluator: z.object({ /* ... */ }).optional(),
       limits: z.object({ /* ... */ }).optional(),
       memoryContext: z.object({ /* ... */ }).optional(),
     }),
   });
   
   export type AgentConfig = z.infer<typeof AgentConfigSchema>;
   ```

2. **Export from index**:
   ```typescript
   export { AgentConfigSchema, type AgentConfig } from './schemas/agent';
   ```

3. **Write validation tests**:
   ```typescript
   describe('AgentConfigSchema', () => {
     it('validates complete agent config', () => {
       const valid = { /* ... */ };
       expect(() => AgentConfigSchema.parse(valid)).not.toThrow();
     });
     
     it('rejects invalid temperature', () => {
       const invalid = { /* ... */ llm: { temperature: 3.0 } };
       expect(() => AgentConfigSchema.parse(invalid)).toThrow();
     });
   });
   ```

**Validation**:
- `pnpm --filter @cerebrobot/chat-shared test` passes
- Schema exports available in other packages

---

### Phase 3: Backend API (P1 User Story)

**Goal**: Implement REST API endpoints with Zod validation.

**Files**:
- `apps/server/src/routes/agents/index.ts`
- `apps/server/src/routes/agents/list.ts`
- `apps/server/src/routes/agents/get.ts`
- `apps/server/src/routes/agents/create.ts`
- `apps/server/src/routes/agents/update.ts`
- `apps/server/src/routes/agents/delete.ts`
- `apps/server/src/services/agentService.ts`
- `apps/server/__tests__/routes/agents.test.ts`

**Steps**:

1. **Create agent service** (business logic):
   ```typescript
   // apps/server/src/services/agentService.ts
   import { prisma } from '../db/prisma';
   import { AgentConfigSchema } from '@cerebrobot/chat-shared';
   
   export async function listAgents() {
     return prisma.agent.findMany({
       select: { id: true, name: true, createdAt: true, updatedAt: true },
       orderBy: { createdAt: 'desc' },
     });
   }
   
   export async function getAgent(id: string) {
     const agent = await prisma.agent.findUnique({ where: { id } });
     if (!agent) throw new Error('Agent not found');
     return agent;
   }
   
   export async function createAgent(config: unknown) {
     const validated = AgentConfigSchema.omit({ id: true }).parse(config);
     return prisma.agent.create({
       data: {
         name: validated.name,
         config: validated as any, // JSONB
       },
     });
   }
   
   export async function updateAgent(id: string, config: unknown) {
     const validated = AgentConfigSchema.omit({ id: true }).parse(config);
     return prisma.agent.update({
       where: { id },
       data: {
         name: validated.name,
         config: validated as any,
       },
     });
   }
   
   export async function deleteAgent(id: string) {
     // Cascade delete logic (transaction)
     return prisma.$transaction(async (tx) => {
       const threads = await tx.thread.findMany({
         where: { agentId: id },
         select: { id: true },
       });
       const threadIds = threads.map(t => t.id);
       
       // Delete checkpoints
       await tx.langGraphCheckpoint.deleteMany({
         where: { threadId: { in: threadIds } },
       });
       
       // Delete threads
       await tx.thread.deleteMany({
         where: { agentId: id },
       });
       
       // Delete agent
       await tx.agent.delete({
         where: { id },
       });
     });
   }
   ```

2. **Create route handlers**:
   ```typescript
   // apps/server/src/routes/agents/list.ts
   import type { FastifyInstance } from 'fastify';
   import { listAgents } from '../../services/agentService';
   
   export default async function listRoute(app: FastifyInstance) {
     app.get('/', async (request, reply) => {
       const agents = await listAgents();
       return { agents };
     });
   }
   ```

3. **Register routes**:
   ```typescript
   // apps/server/src/routes/agents/index.ts
   import type { FastifyInstance } from 'fastify';
   import listRoute from './list';
   import getRoute from './get';
   import createRoute from './create';
   import updateRoute from './update';
   import deleteRoute from './delete';
   
   export default async function agentsRoutes(app: FastifyInstance) {
     await app.register(listRoute);
     await app.register(getRoute);
     await app.register(createRoute);
     await app.register(updateRoute);
     await app.register(deleteRoute);
   }
   ```

4. **Register in main app**:
   ```typescript
   // apps/server/src/index.ts
   import agentsRoutes from './routes/agents';
   
   app.register(agentsRoutes, { prefix: '/api/agents' });
   ```

5. **Write route tests**:
   ```typescript
   // apps/server/__tests__/routes/agents.test.ts
   describe('GET /api/agents', () => {
     it('returns empty list when no agents', async () => {
       const response = await app.inject({
         method: 'GET',
         url: '/api/agents',
       });
       expect(response.statusCode).toBe(200);
       expect(response.json()).toEqual({ agents: [] });
     });
   });
   ```

**Validation**:
- `pnpm --filter @cerebrobot/server test` passes
- Manual testing via curl/Postman

---

### Phase 4: Frontend UI (P1-P4 User Stories)

**Goal**: Build React components for agent management.

**Files**:
- `apps/client/src/components/AgentManager/AgentManager.tsx`
- `apps/client/src/components/AgentManager/AgentList.tsx`
- `apps/client/src/components/AgentManager/AgentForm.tsx`
- `apps/client/src/components/AgentManager/DeleteConfirmDialog.tsx`
- `apps/client/src/hooks/useAgents.ts`
- `apps/client/src/services/agentApi.ts`
- `apps/client/__tests__/components/AgentManager.test.tsx`

**Steps**:

1. **Create API client**:
   ```typescript
   // apps/client/src/services/agentApi.ts
   import type { AgentConfig } from '@cerebrobot/chat-shared';
   
   const API_BASE = '/api/agents';
   
   export async function fetchAgents() {
     const res = await fetch(API_BASE);
     if (!res.ok) throw new Error('Failed to fetch agents');
     return res.json();
   }
   
   export async function createAgent(config: Partial<AgentConfig>) {
     const res = await fetch(API_BASE, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(config),
     });
     if (!res.ok) throw new Error('Failed to create agent');
     return res.json();
   }
   
   // ... similar for update, delete
   ```

2. **Create React hook**:
   ```typescript
   // apps/client/src/hooks/useAgents.ts
   import { useState, useEffect } from 'react';
   import * as agentApi from '../services/agentApi';
   
   export function useAgents() {
     const [agents, setAgents] = useState([]);
     const [loading, setLoading] = useState(true);
     
     useEffect(() => {
       agentApi.fetchAgents()
         .then(data => setAgents(data.agents))
         .finally(() => setLoading(false));
     }, []);
     
     const createAgent = async (config) => {
       const result = await agentApi.createAgent(config);
       setAgents([...agents, result.agent]);
       return result.agent;
     };
     
     // ... similar for update, delete
     
     return { agents, loading, createAgent, /* ... */ };
   }
   ```

3. **Create UI components** (see contracts/api.md for design):
   - `AgentList`: Display agents, handle selection
   - `AgentForm`: Create/edit form with validation
   - `DeleteConfirmDialog`: Confirmation modal
   - `AgentManager`: Main container component

4. **Write component tests**:
   ```typescript
   describe('AgentList', () => {
     it('renders empty state when no agents', () => {
       render(<AgentList agents={[]} onSelect={jest.fn()} />);
       expect(screen.getByText(/no agents/i)).toBeInTheDocument();
     });
   });
   ```

**Validation**:
- `pnpm --filter @cerebrobot/client test` passes
- Manual UI testing in browser

---

### Phase 5: Integration Testing

**Goal**: Verify end-to-end flows work correctly.

**Files**:
- Manual smoke test checklist (update `specs/011-agent-crud-ui/tasks.md`)

**Steps**:

1. **Update Postgres validation test** (if schema changes warrant):
   ```typescript
   // Verify Agent table exists and JSONB works
   it('stores and retrieves agent config as JSONB', async () => {
     const agent = await prisma.agent.create({
       data: { name: 'Test', config: { /* ... */ } },
     });
     expect(agent.config).toMatchObject({ /* ... */ });
   });
   ```

2. **Manual smoke test checklist**:
   - [ ] Create agent via UI
   - [ ] View agent in list
   - [ ] Edit agent configuration
   - [ ] Delete agent (verify conversations deleted)
   - [ ] Validation errors display correctly
   - [ ] Performance: List loads in <2s
   - [ ] Performance: Save completes in <1s

**Validation**:
- All Postgres validation tests pass
- Manual smoke test checklist complete

---

## Performance Targets

| Operation | Target | Measurement |
|-----------|--------|-------------|
| List agents | <2 seconds | SC-001 |
| Validation feedback | <500ms | SC-003 |
| Save agent | <1 second | SC-005 |

**Monitoring**: Use browser DevTools Network tab and Pino logs to verify timing.

---

## Development Workflow

**For each code change**:

1. Implement feature
2. Write/update tests
3. Run hygiene loop:
   ```bash
   pnpm lint
   pnpm format:write
   pnpm test
   ```
4. Fix any failures before committing
5. Commit with descriptive message

---

## Common Issues & Solutions

### Issue: Prisma client not recognizing Agent model

**Solution**: Regenerate Prisma client:
```bash
pnpm --filter @cerebrobot/server prisma generate
```

### Issue: Validation errors not displaying in UI

**Solution**: Check Zod error formatting and ensure errors mapped to field names correctly.

### Issue: Cascade delete not working

**Solution**: Verify transaction logic in `agentService.deleteAgent()` and check database logs.

---

## Next Steps

After implementing this feature:

1. Run `/speckit.tasks` to generate task breakdown
2. Use tasks.md to track implementation progress
3. Update this quickstart with any lessons learned
4. Consider Phase 2 enhancements (pagination, search, etc.)

---

## References

- [Spec](../spec.md): Feature requirements and user stories
- [Data Model](../data-model.md): Database schema and types
- [API Contracts](../contracts/api.md): REST endpoint specifications
- [Research](../research.md): Technical decisions and rationale
