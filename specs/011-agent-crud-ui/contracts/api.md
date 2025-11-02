# API Contracts: Agent Management

**Feature**: 011-agent-crud-ui  
**Date**: 2025-10-31  
**Version**: 1.0.0

## Overview

RESTful API contracts for agent CRUD operations. All endpoints use JSON request/response bodies and follow Fastify conventions.

## Base URL

```
http://localhost:3000/api/agents
```

## Authentication

**Phase 1**: No authentication (single-operator deployment behind reverse proxy)

## Common Response Codes

- `200 OK`: Successful GET, PUT
- `201 Created`: Successful POST
- `204 No Content`: Successful DELETE
- `400 Bad Request`: Validation error
- `404 Not Found`: Agent not found
- `500 Internal Server Error`: Server error

## Error Response Format

```typescript
{
  statusCode: number;
  error: string;      // e.g., "Bad Request"
  message: string;    // Human-readable error
  validation?: {      // Present for 400 validation errors
    field: string;
    message: string;
  }[];
}
```

**Example**:
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "validation": [
    { "field": "name", "message": "Name is required" },
    { "field": "llm.temperature", "message": "Temperature must be between 0.0 and 2.0" }
  ]
}
```

---

## Endpoints

### 1. List All Agents

**GET** `/api/agents`

**Description**: Retrieve all agents (lightweight list view).

**Request**: None

**Response**: `200 OK`
```typescript
{
  agents: {
    id: string;          // UUID
    name: string;
    createdAt: string;   // ISO 8601 timestamp
    updatedAt: string;   // ISO 8601 timestamp
  }[];
}
```

**Example Response**:
```json
{
  "agents": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Helpful Assistant",
      "createdAt": "2025-10-31T10:30:00.000Z",
      "updatedAt": "2025-10-31T10:30:00.000Z"
    },
    {
      "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "name": "Research Agent",
      "createdAt": "2025-10-30T14:20:00.000Z",
      "updatedAt": "2025-10-31T09:15:00.000Z"
    }
  ]
}
```

**Performance**: Must complete in <2 seconds (SC-001)

---

### 2. Get Agent Details

**GET** `/api/agents/:id`

**Description**: Retrieve full agent configuration by ID.

**Path Parameters**:
- `id` (string, UUID): Agent ID

**Request**: None

**Response**: `200 OK`
```typescript
{
  agent: AgentConfig;  // Full configuration (see data-model.md)
}
```

**Example Response**:
```json
{
  "agent": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Helpful Assistant",
    "systemPrompt": "You are a helpful assistant...",
    "personaTag": "🤖 assistant",
    "llm": {
      "model": "deepseek-ai/DeepSeek-V3",
      "temperature": 0.7,
      "apiKey": "sk-abc123...",
      "apiBase": "https://api.deepinfra.com/v1/openai",
      "maxTokens": 2048
    },
    "memory": { /* ... */ },
    "autonomy": { /* ... */ }
  }
}
```

**Errors**:
- `404 Not Found`: Agent with specified ID does not exist

---

### 3. Create Agent

**POST** `/api/agents`

**Description**: Create a new agent configuration.

**Request Body**:
```typescript
{
  name: string;
  systemPrompt: string;
  personaTag: string;
  llm: { /* ... */ };
  memory: { /* ... */ };
  autonomy: { /* ... */ };
}
```

**Note**: `id` is auto-generated (UUID). Do not include in request.

**Example Request**:
```json
{
  "name": "New Assistant",
  "systemPrompt": "You are a helpful AI assistant.",
  "personaTag": "🤖 bot",
  "llm": {
    "model": "deepseek-ai/DeepSeek-V3",
    "temperature": 0.7,
    "apiKey": "sk-xyz789...",
    "apiBase": "https://api.deepinfra.com/v1/openai"
  },
  "memory": {
    "hotPathLimit": 16,
    "hotPathTokenBudget": 3000,
    "recentMessageFloor": 4,
    "hotPathMarginPct": 0.1,
    "embeddingModel": "Qwen/Qwen3-Embedding-8B",
    "embeddingEndpoint": "https://api.deepinfra.com/v1/openai",
    "apiKey": "sk-xyz789...",
    "similarityThreshold": 0.5,
    "maxTokens": 2048,
    "injectionBudget": 1000,
    "retrievalTimeoutMs": 5000
  },
  "autonomy": {
    "enabled": false
  }
}
```

**Response**: `201 Created`
```typescript
{
  agent: AgentConfig;  // Newly created agent with generated ID
}
```

**Errors**:
- `400 Bad Request`: Validation failed (see validation errors)
- `409 Conflict`: Agent with same ID already exists (edge case, UUID collision)

**Performance**: Must complete in <1 second (SC-005)

---

### 4. Update Agent

**PUT** `/api/agents/:id`

**Description**: Update existing agent configuration (full replacement).

**Path Parameters**:
- `id` (string, UUID): Agent ID

**Request Body**: Same as Create Agent (full AgentConfig without `id`)

**Example Request**: (Same as Create Agent, but updates existing)

**Response**: `200 OK`
```typescript
{
  agent: AgentConfig;  // Updated agent configuration
}
```

**Errors**:
- `404 Not Found`: Agent with specified ID does not exist
- `400 Bad Request`: Validation failed

**Performance**: Must complete in <1 second (SC-005)

**Note**: Existing conversations continue with old config; new conversations use updated config (FR-015)

---

### 5. Delete Agent

**DELETE** `/api/agents/:id`

**Description**: Delete agent and cascade delete all associated conversations and checkpoints.

**Path Parameters**:
- `id` (string, UUID): Agent ID

**Request**: None

**Response**: `204 No Content`

**Errors**:
- `404 Not Found`: Agent with specified ID does not exist

**Cascade Behavior** (FR-019, FR-019a):
1. Find all threads with `agentId = :id`
2. Delete all LangGraph checkpoints for those threads
3. Delete all threads
4. Delete agent

**Transaction**: All deletes occur within a single transaction (atomicity guaranteed)

**Warning**: UI must show confirmation dialog before calling this endpoint (FR-017, FR-018)

---

## Validation Details

### Request Body Validation

All `POST` and `PUT` endpoints validate request bodies using the shared Zod schema (`packages/chat-shared/src/schemas/agent.ts`).

**Validation Sequence**:
1. Parse JSON body
2. Validate against `AgentConfigSchema` (Zod)
3. Return `400 Bad Request` with validation errors if failed
4. Proceed with database operation if passed

**Validation Timing**: Must complete in <500ms (SC-003)

### Field-Level Rules

See `data-model.md` for complete validation rules including:
- Required fields
- String length constraints
- Numeric ranges
- URL format validation
- Conditional requirements (autonomy)

---

## OpenAPI Specification

**File**: `specs/011-agent-crud-ui/contracts/openapi.yaml`

**Generated From**: Zod schemas using `zod-openapi` library

**Usage**: API documentation, client SDK generation, contract testing

(Note: Full OpenAPI YAML document to be generated programmatically from Zod schemas during implementation)

---

## WebSocket Support

**Phase 1**: Not required (single-operator assumption, no real-time sync needed)

**Future**: If multi-operator support added, consider WebSocket for real-time agent list updates

---

## Rate Limiting

**Phase 1**: None (single operator, trusted environment)

**Future**: If exposed publicly, consider rate limiting:
- 10 requests/second per IP
- 100 requests/minute per IP

---

## CORS

**Phase 1**: Same-origin only (frontend and backend served from same domain in Docker Compose)

**Configuration** (if needed):
```typescript
app.register(cors, {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:5173',
  credentials: true
});
```

---

## Summary

- **5 REST endpoints**: List, Get, Create, Update, Delete
- **JSON payloads**: Request and response bodies
- **Zod validation**: Shared schemas for client/server
- **Cascade deletes**: Automatic via application code
- **Performance targets**: <2s list, <500ms validation, <1s save/delete
- **Error handling**: Structured validation errors with field-level messages

Ready for quickstart guide (Phase 1 completion).
