# Research: Dynamic Agent Configuration

**Feature**: 004-agent-definition-we  
**Date**: October 10, 2025  
**Phase**: 0 - Outline & Research

## Overview

This document captures research decisions for migrating agent personality configuration from environment variables to JSON files with runtime loading and validation.

## Research Questions & Decisions

### 1. JSON Schema Validation Strategy

**Question**: How should we validate agent configuration JSON files to ensure all required fields are present and correctly typed?

**Decision**: Use Zod for runtime validation

**Rationale**:
- Already approved in tech stack (Zod 4.1.11)
- Type-safe: generates TypeScript types from schemas
- Runtime validation catches missing/invalid fields before server starts
- Clear error messages for validation failures
- Composable schemas (can nest LLM config, memory config as sub-schemas)

**Alternatives Considered**:
- **JSON Schema + AJV**: More verbose, requires separate type definitions, additional dependency
- **Manual validation**: Error-prone, no type inference, high maintenance burden
- **Class-validator decorators**: Requires class instances, less functional approach

**Implementation Pattern**:
```typescript
import { z } from 'zod';

const AgentConfigSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  systemPrompt: z.string().min(1),
  personaTag: z.string(),
  llm: z.object({
    model: z.string(),
    temperature: z.number().min(0).max(2),
    apiKey: z.string(),
    apiBase: z.string().url()
  }),
  memory: z.object({
    hotPathLimit: z.number().int().positive(),
    hotPathTokenBudget: z.number().int().positive(),
    // ... other memory fields
  })
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;
```

---

### 2. Configuration File Discovery Pattern

**Question**: How should the backend API discover available agent configuration files in the `./config/agents/` directory?

**Decision**: Filesystem scan on GET /api/agents request with fail-fast validation (lazy discovery, no caching)

**Rationale**:
- **KISS**: Read directory when API is called, not at startup
- **YAGNI**: No caching needed for 1-10 configs read from SSD (~20-50ms total, well under 100ms NFR)
- **Better UX**: New configs discoverable immediately without server restart (just refresh browser)
- **Simpler code**: No startup validation logic, no cache invalidation, no app decoration
- **Fail-fast transparency**: If ANY config is invalid, API returns 500 with clear error (operator gets immediate feedback)

**Alternatives Considered**:
- **Eager loading at startup**: Premature optimization; adds complexity (caching, startup validation) without meaningful performance benefit at single-operator scale
- **Best-effort listing (skip invalid)**: Hides errors from operator; violates transparency principle (Principle II)
- **File watcher (chokidar)**: Unnecessary; lazy loading achieves hot-reload without extra dependency
- **Database storage**: Overkill for hobby deployment

**Implementation Pattern**:
```typescript
// GET /api/agents handler - fail-fast validation
async function listAgents(request, reply) {
  const AGENTS_DIR = path.join(process.cwd(), 'config', 'agents');
  
  const files = fs.readdirSync(AGENTS_DIR)
    .filter(f => f.endsWith('.json') && f !== 'template.json');
  
  const agents = [];
  const errors = [];
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(AGENTS_DIR, file), 'utf-8');
      const config = AgentConfigSchema.parse(JSON.parse(content));
      agents.push({ id: config.id, name: config.name });
    } catch (error) {
      errors.push({ file, error: error.message });
    }
  }
  
  if (errors.length > 0) {
    reply.code(500).send({
      error: 'Invalid agent configurations detected',
      details: errors
    });
    return;
  }
  
  return { agents };
}
```

---

### 3. Configuration Loading Lifecycle

**Question**: When and how should the system load and validate agent configurations?

**Decision**: Load and validate on-demand with fail-fast at both validation points (lazy loading)
- GET /api/agents: Scan directory, validate ALL configs, return 500 if ANY invalid (fail-fast)
- Thread creation: Load selected config, strict validation, return 400 if invalid (fail-fast)
- No startup validation or caching

**Rationale**:
- **Fail-fast transparency**: Operator gets immediate, clear feedback at both validation points
- **KISS**: Validation happens when needed (listing or thread creation), not preemptively
- **Better UX**: Invalid config discovered immediately when listing (not hidden); fix and retry API call (no restart)
- **Simpler code**: No startup hooks, no cache management, no app decoration
- **Two clear failure points**: All configs valid to list (500 if not), selected config valid to use (400 if not)
- **Performance**: Reading 10 configs from SSD + validation = ~20-50ms (acceptable for infrequent API calls)

**Alternatives Considered**:
- **Eager loading at startup**: Adds complexity (cache, startup validation) without meaningful benefit at single-operator scale; requires restart for new configs
- **Best-effort listing (skip invalid)**: Hides errors; operator wonders why config missing; violates transparency (Constitution Principle II)
- **Startup validation + lazy instantiation**: Worst of both worlds (complexity + restart requirement)

**Implementation Pattern**:
```typescript
// GET /api/agents - fail-fast validation
async function listAgents(request, reply) {
  const configs = discoverAgentConfigs(); // Throws if ANY config invalid
  return { agents: configs.map(c => ({ id: c.id, name: c.name })) };
}

// Thread creation - fail-fast validation
async function createThread(request, reply) {
  const { agentId } = request.body;
  
  try {
    const config = loadAgentConfig(agentId); // Throws if invalid or not found
    const agent = initializeAgent(config);
    // ... create thread
  } catch (error) {
    const statusCode = error.code === 'NOT_FOUND' ? 404 : 400;
    reply.code(statusCode).send({ 
      error: 'Invalid agent configuration',
      details: error.message 
    });
  }
}
```

---

### 4. Backward Compatibility with .env Fallback

**Question**: How should the system handle the .env fallback when no JSON configs are present?

**Decision**: Check for `config/agents/` directory existence; if missing or empty, fall back to .env-based config

**Rationale**:
- Maintains backward compatibility (FR-008)
- Gradual migration path for operators
- Clear decision boundary: directory existence signals intent to use JSON configs
- If directory exists but contains invalid configs, fail hard (no silent fallback)

**Alternatives Considered**:
- **Environment variable flag**: Adds another config layer, confusing
- **Always require JSON**: Breaks existing deployments immediately
- **Merge .env and JSON**: Ambiguous precedence rules, hard to reason about

**Implementation Pattern**:
```typescript
function loadAgentConfigs(): AgentConfig[] {
  if (!fs.existsSync(AGENTS_DIR)) {
    app.log.warn('Agent config directory not found, falling back to .env');
    return [createConfigFromEnv()]; // Build from process.env.*
  }
  
  const configs = discoverAgentConfigs(); // Throws on invalid JSON
  
  if (configs.length === 0) {
    app.log.warn('No agent configs found, falling back to .env');
    return [createConfigFromEnv()];
  }
  
  return configs;
}
```

---

### 5. Frontend Agent Selection UX Pattern

**Question**: How should the frontend UI present and manage agent selection?

**Decision**: Dropdown component that fetches from `/api/agents` on mount, stores selection in React state

**Rationale**:
- Simple UX for single-operator (10 agents max)
- Standard REST pattern (GET endpoint)
- Selection persists in conversation context (passed to chat API)
- No local storage needed (selection per session)

**Alternatives Considered**:
- **LocalStorage persistence**: Unnecessary for session-based selection
- **URL parameter**: Exposes agent ID in browser, minor security concern
- **Server-side session**: Adds stateful complexity, violates operator model

**Implementation Pattern**:
```typescript
// AgentSelector.tsx
function AgentSelector({ onSelect }: { onSelect: (id: string) => void }) {
  const [agents, setAgents] = useState<AgentMetadata[]>([]);
  
  useEffect(() => {
    fetch('/api/agents')
      .then(res => res.json())
      .then(data => setAgents(data.agents));
  }, []);
  
  return (
    <select onChange={(e) => onSelect(e.target.value)}>
      {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
    </select>
  );
}
```

---

### 6. UUID Generation Strategy

**Question**: Should UUIDs be auto-generated by the system or manually specified by operators in JSON files?

**Decision**: Operators manually specify UUID v4 in JSON files (template provides example)

**Rationale**:
- Operators create JSON files manually (no web UI for creation in Phase 1)
- Template file demonstrates UUID format clearly
- Validation catches non-UUID values (Zod `.uuid()` check)
- Simplifies config portability (ID travels with file)
- Avoids file-name-to-ID mapping complexity

**Alternatives Considered**:
- **Auto-generate on first load**: Requires storing ID somewhere (filename or separate file)
- **Derive from filename**: Fragile to renames, not globally unique
- **Auto-generate + embed in file**: Complex write-back logic, concurrency issues

**Template Snippet**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Example Assistant",
  ...
}
```

---

## Best Practices Applied

### Zod Schema Design
- Use strict types (`.min(1)` for non-empty strings, `.positive()` for counts)
- Nested objects for logical grouping (llm, memory sub-configs)
- Type inference with `z.infer<typeof Schema>` for TypeScript integration
- Custom error messages for operator-facing validation failures

### Error Handling
- Structured logging with Pino (existing Fastify logger)
- Actionable error messages (include filename, field name, expected vs actual)
- Exit with non-zero code on validation failure (FR-005)
- Log successful config load with summary (count, IDs, names)

### File Organization
- Config schema in `apps/server/src/config/agent-config.ts`
- Loader logic in `apps/server/src/config/agent-loader.ts`
- Unit tests in `apps/server/src/config/agent-loader.test.ts`
- API route in `apps/server/src/api/routes/agents.ts`

---

## Open Questions (Resolved During Planning)

None remaining. All technical decisions documented above.

---

## References

- Zod documentation: https://zod.dev/
- Node.js fs module: https://nodejs.org/api/fs.html
- Fastify decorators: https://fastify.dev/docs/latest/Reference/Decorators/
- UUID v4 format: RFC 4122
