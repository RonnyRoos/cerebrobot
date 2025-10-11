# Data Model: Dynamic Agent Configuration

**Feature**: 004-agent-definition-we  
**Date**: October 10, 2025  
**Phase**: 1 - Design & Contracts

## Overview

This document defines the data structures for agent configuration, focusing on the JSON schema that operators will create and the system will validate at runtime.

## Entities

### AgentConfiguration

The complete specification of an agent's personality and behavior, stored as a JSON file in `./config/agents/`.

**Fields**:

| Field | Type | Required | Validation Rules | Description |
|-------|------|----------|------------------|-------------|
| `id` | string (UUID v4) | Yes | Must match UUID v4 format | Globally unique identifier for the agent |
| `name` | string | Yes | Min length: 1 | Human-readable name displayed in UI |
| `systemPrompt` | string | Yes | Min length: 1 | Core personality prompt sent to LLM |
| `personaTag` | string | Yes | Non-empty string | Tag for persona identification (e.g., "operator", "assistant") |
| `llm` | LLMConfig | Yes | Valid nested object | LLM provider and model settings |
| `memory` | MemoryConfig | Yes | Valid nested object | Memory system configuration |

**Relationships**:
- One-to-many: One AgentConfiguration per JSON file
- No database storage: Configurations exist only as filesystem artifacts
- Referenced by: Frontend UI (via GET /api/agents), thread creation endpoint (loads on-demand)

**State Transitions**:
- **Created**: Operator manually creates JSON file in `./config/agents/`
- **Discovered**: GET /api/agents scans filesystem and lists valid configs
- **Validated**: API request or thread creation validates against Zod schema (fail-fast)
- **Active**: Selected by operator in UI for current thread/conversation
- **Failed**: Invalid config causes 500 error at listing or 400 error at thread creation

**Lifecycle**:
1. Operator creates JSON file from template
2. GET /api/agents called → scans directory, validates all configs
3. Validation runs → returns 500 if ANY config invalid, 200 with list if all valid
4. Operator selects config in UI
5. Thread creation → loads specific config, validates, initializes agent
6. Conversation uses selected agent's settings

---

### LLMConfig (Nested Object)

Configuration for the language model provider and behavior.

**Fields**:

| Field | Type | Required | Validation Rules | Description |
|-------|------|----------|------------------|-------------|
| `model` | string | Yes | Non-empty string | Model identifier (e.g., "deepseek-ai/DeepSeek-V3.1-Terminus") |
| `temperature` | number | Yes | Min: 0, Max: 2 | Sampling temperature for response generation |
| `apiKey` | string | Yes | Non-empty string | API key for LLM provider (secret) |
| `apiBase` | string (URL) | Yes | Valid URL format | Base URL for API endpoint |

**Example**:
```json
{
  "model": "deepseek-ai/DeepSeek-V3.1-Terminus",
  "temperature": 0.7,
  "apiKey": "K6X3RHYeiqUGxx11setuOP6h9uksRKhi",
  "apiBase": "https://api.deepinfra.com/v1/openai"
}
```

---

### MemoryConfig (Nested Object)

Configuration for the LangGraph memory system (hot path, embeddings, retrieval).

**Fields**:

| Field | Type | Required | Validation Rules | Description |
|-------|------|----------|------------------|-------------|
| `hotPathLimit` | integer | Yes | Positive integer | Max recent messages kept verbatim before summarization |
| `hotPathTokenBudget` | integer | Yes | Positive integer | Token budget for hot path window |
| `recentMessageFloor` | integer | Yes | Non-negative integer | Minimum guaranteed unsummarized messages |
| `hotPathMarginPct` | number | Yes | Min: 0, Max: 1 | Headroom within token budget (e.g., 0.3 = use 70%) |
| `embeddingModel` | string | Yes | Non-empty string | Model for generating embeddings (e.g., "Qwen/Qwen3-Embedding-8B") |
| `embeddingEndpoint` | string (URL) | Yes | Valid URL format | API endpoint for embedding generation |
| `similarityThreshold` | number | Yes | Min: 0, Max: 1 | Minimum similarity score for memory retrieval |
| `maxTokens` | integer | Yes | Positive integer | Max tokens for memory context injection |
| `injectionBudget` | integer | Yes | Positive integer | Token budget for injected memory |
| `retrievalTimeoutMs` | integer | Yes | Positive integer | Timeout for memory retrieval operations (milliseconds) |

**Example**:
```json
{
  "hotPathLimit": 1000,
  "hotPathTokenBudget": 1024,
  "recentMessageFloor": 2,
  "hotPathMarginPct": 0.3,
  "embeddingModel": "Qwen/Qwen3-Embedding-8B",
  "embeddingEndpoint": "https://api.deepinfra.com/v1/openai",
  "similarityThreshold": 0.5,
  "maxTokens": 2048,
  "injectionBudget": 1000,
  "retrievalTimeoutMs": 5000
}
```

---

### AgentMetadata (API Response)

Lightweight representation of an agent configuration for frontend display (excludes secrets).

**Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID v4) | Agent unique identifier |
| `name` | string | Human-readable agent name |

**Example** (GET /api/agents response):
```json
{
  "agents": [
    { "id": "550e8400-e29b-41d4-a716-446655440000", "name": "Helpful Assistant" },
    { "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8", "name": "Professional Helper" }
  ]
}
```

---

## Validation Rules Summary

### Required Field Enforcement
- **All fields required**: No defaults provided (FR-006)
- Validation failure → server exits with non-zero code (FR-005)
- Template file provides example values for all fields (FR-011)

### Type Safety
- UUID v4 format validated with Zod `.uuid()` method
- URL fields validated with `.url()` method
- Numeric ranges enforced (temperature 0-2, similarity 0-1, positive integers)
- String minimums enforced (`.min(1)` for non-empty)

### Unknown Fields
- Ignored during validation (forward compatibility)
- Not exposed in TypeScript types (strict mode)

---

## File Storage Schema

### Directory Structure
```
config/
└── agents/
    ├── .gitkeep                          # Tracked (preserves directory)
    ├── template.json                     # Tracked (example for operators)
    └── *.json                            # Git-ignored (operator configs with secrets)
```

### .gitignore Rules
```
# Ignore all agent configs except template and directory marker
config/agents/*
!config/agents/.gitkeep
!config/agents/template.json
```

### File Naming Convention
- Pattern: `{descriptive-name}.json` (e.g., `flirty-assistant.json`, `professional-bot.json`)
- Reserved names: `template.json` (excluded from API listing)
- Case-insensitive filesystem support (lowercase recommended)

---

## Zod Schema Definition

```typescript
import { z } from 'zod';

const LLMConfigSchema = z.object({
  model: z.string().min(1, 'Model name is required'),
  temperature: z.number().min(0).max(2, 'Temperature must be between 0 and 2'),
  apiKey: z.string().min(1, 'API key is required'),
  apiBase: z.string().url('Must be a valid URL')
});

const MemoryConfigSchema = z.object({
  hotPathLimit: z.number().int().positive('Must be a positive integer'),
  hotPathTokenBudget: z.number().int().positive('Must be a positive integer'),
  recentMessageFloor: z.number().int().nonnegative('Must be non-negative'),
  hotPathMarginPct: z.number().min(0).max(1, 'Must be between 0 and 1'),
  embeddingModel: z.string().min(1, 'Embedding model is required'),
  embeddingEndpoint: z.string().url('Must be a valid URL'),
  similarityThreshold: z.number().min(0).max(1, 'Must be between 0 and 1'),
  maxTokens: z.number().int().positive('Must be a positive integer'),
  injectionBudget: z.number().int().positive('Must be a positive integer'),
  retrievalTimeoutMs: z.number().int().positive('Must be a positive integer')
});

export const AgentConfigSchema = z.object({
  id: z.string().uuid('Must be a valid UUID v4'),
  name: z.string().min(1, 'Name is required'),
  systemPrompt: z.string().min(1, 'System prompt is required'),
  personaTag: z.string().min(1, 'Persona tag is required'),
  llm: LLMConfigSchema,
  memory: MemoryConfigSchema
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type LLMConfig = z.infer<typeof LLMConfigSchema>;
export type MemoryConfig = z.infer<typeof MemoryConfigSchema>;

export const AgentMetadataSchema = z.object({
  id: z.string().uuid(),
  name: z.string()
});

export type AgentMetadata = z.infer<typeof AgentMetadataSchema>;
```

---

## Migration from .env

### Current .env Variables → JSON Mapping

| .env Variable | JSON Path | Notes |
|---------------|-----------|-------|
| `LANGGRAPH_SYSTEM_PROMPT` | `.systemPrompt` | Direct mapping |
| `LANGGRAPH_PERSONA_TAG` | `.personaTag` | Direct mapping |
| `LANGCHAIN_MODEL` | `.llm.model` | Nested in llm object |
| `LANGCHAIN_TEMPERATURE` | `.llm.temperature` | Nested in llm object |
| `DEEPINFRA_API_KEY` | `.llm.apiKey` | Nested in llm object |
| `DEEPINFRA_API_BASE` | `.llm.apiBase` | Nested in llm object |
| `LANGMEM_HOTPATH_LIMIT` | `.memory.hotPathLimit` | Nested in memory object |
| `LANGMEM_HOTPATH_TOKEN_BUDGET` | `.memory.hotPathTokenBudget` | Nested in memory object |
| `LANGMEM_RECENT_MESSAGE_FLOOR` | `.memory.recentMessageFloor` | Nested in memory object |
| `LANGMEM_HOTPATH_MARGIN_PCT` | `.memory.hotPathMarginPct` | Nested in memory object |
| `MEMORY_EMBEDDING_MODEL` | `.memory.embeddingModel` | Nested in memory object |
| `MEMORY_EMBEDDING_ENDPOINT` | `.memory.embeddingEndpoint` | Nested in memory object |
| `MEMORY_SIMILARITY_THRESHOLD` | `.memory.similarityThreshold` | Nested in memory object |
| `MEMORY_MAX_TOKENS` | `.memory.maxTokens` | Nested in memory object |
| `MEMORY_INJECTION_BUDGET` | `.memory.injectionBudget` | Nested in memory object |
| `MEMORY_RETRIEVAL_TIMEOUT_MS` | `.memory.retrievalTimeoutMs` | Nested in memory object |

### Variables Remaining in .env (Infrastructure)
- `DATABASE_URL` - Postgres connection (deployment-specific)
- `POSTGRES_*` - Database credentials (deployment-specific)
- `LANGGRAPH_PG_URL` - Checkpoint storage (deployment-specific)
- `FASTIFY_PORT` - Server port (deployment-specific)
- `CLIENT_PORT` - Frontend dev server (deployment-specific)
- `VITE_API_BASE` - Frontend API URL (deployment-specific)

---

## Error Handling

### Validation Errors
- **Missing required field**: `"Agent config validation failed: name is required"`
- **Invalid UUID**: `"Agent config validation failed: id must be a valid UUID v4"`
- **Out of range**: `"Agent config validation failed: temperature must be between 0 and 2"`
- **Malformed JSON**: `"Failed to parse agent config: Unexpected token } in JSON at position 42"`

### File System Errors
- **Directory missing**: `"Agent config directory not found: ./config/agents (falling back to .env)"`
- **File not readable**: `"Failed to read agent config: flirty-assistant.json (EACCES: permission denied)"`
- **No configs found**: `"No agent configurations found in ./config/agents (falling back to .env)"`

---

## Testing Strategy

### Unit Tests
- ✅ Valid config passes schema validation
- ✅ Missing required field throws validation error
- ✅ Invalid UUID format rejected
- ✅ Out-of-range numbers rejected (temperature > 2, negative integers)
- ✅ Invalid URL format rejected
- ✅ Unknown fields ignored (forward compatibility)
- ✅ Template.json file excluded from API listing
- ✅ Fallback to .env when directory missing/empty

### Integration Points
- Config discovery called when GET /api/agents invoked (lazy loading, no startup overhead)
- No caching - configs read from filesystem on each API request (~20-50ms)
- Thread creation loads specific config by ID on-demand
- Frontend fetches metadata on component mount (triggers API request)

---

## References

- Spec: [spec.md](./spec.md)
- Research: [research.md](./research.md)
- API Contracts: [contracts/agents-api.yaml](./contracts/agents-api.yaml)
- Template: [config/agents/template.json](../../config/agents/template.json)
