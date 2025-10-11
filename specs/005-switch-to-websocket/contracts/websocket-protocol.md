# WebSocket Protocol Contract

**Feature**: Switch to WebSocket Communication Protocol  
**Version**: 1.0.0  
**Date**: October 11, 2025

## Overview

This document defines the WebSocket protocol contract between the Cerebrobot client and server for real-time chat communication. It replaces the previous Server-Sent Events (SSE) protocol.

---

## Connection Endpoint

### WebSocket Upgrade Request

**Endpoint**: `GET /api/chat/ws`  
**Protocol**: WebSocket (ws:// for development, wss:// for production)  
**Upgrade Required**: Yes (HTTP → WebSocket protocol upgrade)

**HTTP Headers** (Initial Upgrade Request):
```http
GET /api/chat/ws HTTP/1.1
Host: localhost:3030
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: [client-generated]
Sec-WebSocket-Version: 13
```

**Response** (Successful Upgrade):
```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: [server-generated]
```

**Error Response** (Upgrade Failure):
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "WebSocket upgrade failed",
  "details": "Invalid headers or protocol version"
}
```

---

## Message Protocol

### Client → Server Messages

All client messages are JSON text frames.

#### Chat Request Message

**Sent**: Once per connection, immediately after connection established  
**Format**: JSON object

```json
{
  "threadId": "thread-uuid-here",
  "userId": "user-uuid-here",
  "message": "User's chat message content",
  "correlationId": "request-uuid-here"
}
```

**Fields**:

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `threadId` | string | Yes | Non-empty UUID | Existing conversation thread identifier |
| `userId` | string | Yes | Valid UUID | User making the request |
| `message` | string | Yes | Non-empty, ≤1MB | User's chat input |
| `correlationId` | string | No | UUID format | Client-generated request trace ID |

**Validation**:
- Entire message payload MUST be ≤1MB (enforced at application layer)
- All UUIDs MUST be valid format
- `threadId` MUST reference an existing thread in the database
- `message` MUST NOT be empty string

**Error Responses**:
If validation fails, server sends error event (see below) and closes connection.

---

### Server → Client Messages

All server messages are JSON text frames with `type` discriminator.

#### Token Event

**Purpose**: Stream individual response chunks as they're generated  
**Frequency**: Multiple per conversation turn (0-N events)

```json
{
  "type": "token",
  "value": "hello"
}
```

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Always `"token"` |
| `value` | string | Yes | Single token/chunk of streaming response |

**Client Handling**:
- Append `value` to accumulated response text
- Display progressively in UI (character-by-character rendering)

---

#### Final Event

**Purpose**: Signal completion of streaming and provide metadata  
**Frequency**: Exactly one per conversation turn (final event)

```json
{
  "type": "final",
  "message": "Complete assembled response text",
  "latencyMs": 1234,
  "tokenUsage": {
    "recentTokens": 150,
    "overflowTokens": 0,
    "budget": 1000,
    "utilisationPct": 15
  }
}
```

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Always `"final"` |
| `message` | string | Yes | Complete response text (may differ from accumulated tokens due to trimming) |
| `latencyMs` | number | No | Request processing time in milliseconds |
| `tokenUsage` | object | No | LLM usage metrics (see schema below) |

**Token Usage Schema**:
```typescript
{
  recentTokens: number;      // Tokens in current conversation window
  overflowTokens: number;    // Tokens beyond context window
  budget: number;            // Total token budget allocated
  utilisationPct: number;    // Percentage of budget used (0-100)
}
```

**Client Handling**:
- Replace accumulated text with `message` (authoritative final version)
- Display latency and usage metrics in UI
- Mark streaming as complete

---

#### Error Event

**Purpose**: Communicate failures during request processing  
**Frequency**: 0-1 per conversation turn (only on errors)

```json
{
  "type": "error",
  "message": "Thread not found: thread-abc123",
  "retryable": false
}
```

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Always `"error"` |
| `message` | string | Yes | Human-readable error description |
| `retryable` | boolean | Yes | Whether client should offer retry option |

**Retryable Error Examples**:
- Network timeout communicating with LLM
- Temporary server overload
- Connection interrupted mid-stream

**Non-Retryable Error Examples**:
- Thread not found (invalid threadId)
- User not authorized (invalid userId)
- Message exceeds 1MB size limit
- Invalid JSON payload

**Client Handling**:
- Display error message to user
- If `retryable === true`: Show retry button
- If `retryable === false`: Show error without retry option
- Discard any partial streaming content (per clarification Q2)

---

## Connection Lifecycle

### Normal Flow

```
1. Client initiates WebSocket upgrade request
2. Server accepts and returns 101 Switching Protocols
3. Connection state: OPEN
4. Client sends chat request message (JSON)
5. Server validates request
6. Server streams 0-N token events
7. Server sends 1 final event
8. Server sends Close frame (code 1000)
9. Connection state: CLOSED
```

### Error Flow

```
1-4. [Same as normal flow]
5. Server validation fails
6. Server sends error event
7. Server sends Close frame (code 1000 or 1011)
8. Connection state: CLOSED
```

### Interrupted Flow

```
1-4. [Same as normal flow]
5-6. Server streaming in progress
7. Network connection lost (client or server side)
8. Connection state: CLOSED (code 1006 abnormal closure)
9. Client discards partial message (per clarification Q2)
```

---

## Close Codes

### Standard Codes

| Code | Name | Usage | Retry? |
|------|------|-------|--------|
| 1000 | Normal Closure | Successful completion of streaming | No |
| 1001 | Going Away | Server shutting down | Yes |
| 1006 | Abnormal Closure | Connection lost without close frame | Yes |
| 1011 | Internal Error | Server encountered unexpected error | Yes |

### Custom Reason Strings

Server MAY include descriptive reason in Close frame:
```
Close(1000, "Stream complete")
Close(1011, "LLM request timeout")
Close(1001, "Server restarting")
```

---

## Size Limits

### Message Payload
- **Maximum**: 1MB (1,048,576 bytes)
- **Applies To**: Both client request and server response events
- **Enforcement**: Application layer validation (not WebSocket frame limit)
- **Exceeded**: Server sends error event with `retryable: false` and closes connection

### Frame Size
- **WebSocket Default**: No explicit limit (handled by underlying ws library)
- **Practical Limit**: 1MB application-level constraint prevents frame size issues

---

## Concurrency Limits

**Maximum Concurrent Connections**: 5 (per clarification Q1)

**Enforcement**:
- Soft limit (not enforced by code)
- Relies on deployment resource constraints
- Single-user deployment assumption

**Behavior if Exceeded**:
- Additional connections accepted but may experience degraded performance
- No explicit connection rejection implemented

---

## Timeout Behavior

**Idle Timeout**: None (per clarification Q5)

**Behavior**:
- Connections remain open indefinitely until explicit close
- No automatic timeout for inactive connections
- Client responsible for closing on navigation/unmount

**Keepalive**:
- Default WebSocket keepalive mechanism (TCP-level)
- No application-level ping/pong frames

---

## Error Handling Examples

### Invalid Thread ID

**Client Request**:
```json
{
  "threadId": "non-existent-thread-id",
  "userId": "user-123",
  "message": "Hello"
}
```

**Server Response**:
```json
{
  "type": "error",
  "message": "Thread not found: non-existent-thread-id",
  "retryable": false
}
```
**Close**: Code 1000 (normal closure after error event)

---

### Message Too Large

**Client Request**: 2MB JSON payload

**Server Response**:
```json
{
  "type": "error",
  "message": "Message exceeds maximum size of 1MB",
  "retryable": false
}
```
**Close**: Code 1000

---

### LLM Timeout

**Server Response** (after partial streaming):
```json
{
  "type": "error",
  "message": "Request to language model timed out. Please try again.",
  "retryable": true
}
```
**Close**: Code 1011 (internal error)

---

## Logging Requirements

Per clarification Q4 (structured logging), all lifecycle events MUST be logged:

### Connection Events
```typescript
logger.info({
  event: 'websocket_connected',
  correlationId: string,
  threadId: string,
  userId: string,
}, 'WebSocket connection established');

logger.info({
  event: 'websocket_closed',
  correlationId: string,
  closeCode: number,
  reason: string,
}, 'WebSocket connection closed');
```

### Message Events
```typescript
logger.debug({
  event: 'websocket_message_sent',
  correlationId: string,
  eventType: 'token' | 'final' | 'error',
  messageSize: number,
}, 'WebSocket message sent');
```

### Stream Completion
```typescript
logger.info({
  event: 'websocket_stream_complete',
  correlationId: string,
  threadId: string,
  tokenCount: number,
  latencyMs: number,
  tokenUsage: object,
}, 'WebSocket stream completed');
```

### Errors
```typescript
logger.error({
  event: 'websocket_error',
  correlationId: string,
  err: Error,
  retryable: boolean,
}, 'WebSocket error occurred');
```

---

## Schema Validation

All JSON messages validated using Zod schemas from `@cerebrobot/chat-shared`:

**Client Request**:
```typescript
import { ChatRequestSchema } from '@cerebrobot/chat-shared';
const parseResult = ChatRequestSchema.safeParse(messageData);
```

**Server Events**:
```typescript
import { ChatStreamEventSchema } from '@cerebrobot/chat-shared';
// Union of ChatStreamTokenEventSchema | ChatStreamFinalEventSchema | ChatStreamErrorEventSchema
```

**Validation Failure**: Send error event and close connection (code 1000).

---

## Security Considerations

### Authentication
- Inherited from existing session/token mechanism
- No WebSocket-specific authentication changes
- Authorization checked on first message (threadId ownership)

### Message Validation
- All UUIDs validated against database
- Message size enforced (1MB limit)
- JSON structure validated via Zod schemas

### Connection Limits
- 5 concurrent connections per user (soft limit)
- No rate limiting implemented (single-user deployment)

### Data Sanitization
- Error messages sanitized (no sensitive data exposure)
- User input not executed (LLM generates responses)

---

## Testing Contract Compliance

### Unit Tests (vitest-websocket-mock)
- [ ] Client sends valid request → receives token/final events
- [ ] Client sends invalid threadId → receives error event with retryable=false
- [ ] Client sends oversized message → receives error event
- [ ] Connection interrupted mid-stream → client discards partial message

### Manual Smoke Tests
- [ ] Browser DevTools Network → WS filter shows frame-by-frame streaming
- [ ] Send message and verify progressive token display
- [ ] Disconnect network mid-stream → verify error + retry UX
- [ ] Send 5 concurrent messages → verify all complete successfully
- [ ] Send >1MB message → verify rejection error displayed

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-10-11 | Initial protocol definition (SSE replacement) |

---

## References

- **Feature Spec**: `specs/005-switch-to-websocket/spec.md`
- **Data Model**: `specs/005-switch-to-websocket/data-model.md`
- **Research**: `specs/005-switch-to-websocket/research.md`
- **Existing Schemas**: `packages/chat-shared/src/schemas/chat.ts`
- **WebSocket RFC**: RFC 6455
- **Close Codes**: MDN WebSocket CloseEvent
