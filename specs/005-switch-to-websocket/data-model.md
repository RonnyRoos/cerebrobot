# Data Model: WebSocket Migration

**Feature**: Switch to WebSocket Communication Protocol  
**Date**: October 11, 2025  
**Status**: Phase 1 Design

## Overview

This feature is a **transport layer migration** with minimal data model changes. Existing entities (Thread, Message, User) remain unchanged. This document captures the ephemeral runtime entities introduced for WebSocket connection management.

---

## Core Entities

### WebSocket Connection (Runtime Only)

**Description**: Ephemeral bidirectional communication channel between client browser and server. Exists only during active connection; not persisted.

**Attributes**:
- `connectionId`: String (generated server-side, used in logs)
- `state`: Enum [`CONNECTING`, `OPEN`, `CLOSING`, `CLOSED`] (standard WebSocket states)
- `threadId`: String (conversation context associated with this connection)
- `userId`: String UUID (user making the request)
- `correlationId`: String UUID (client-generated request trace ID)
- `createdAt`: Timestamp (connection establishment time)
- `lastMessageAt`: Timestamp (most recent message sent/received)

**Relationships**:
- Belongs to one User (via userId)
- Associated with one Thread (via threadId)
- Produces multiple ChatEvents during lifetime

**Lifecycle**:
1. **CONNECTING**: Client initiates WebSocket upgrade request
2. **OPEN**: Server accepts upgrade; connection ready for messaging
3. **Message Exchange**: Client sends chat request; server streams response events
4. **CLOSING**: Either party initiates close handshake
5. **CLOSED**: Connection terminated; resources released

**Validation Rules**:
- userId MUST be valid UUID (per FR-008)
- threadId MUST reference existing Thread
- Message payload MUST be ≤1MB (per FR-015)
- Connection MUST NOT exceed idle timeout (none enforced per clarification Q5)

**State Transitions**:
```
CONNECTING → OPEN → CLOSING → CLOSED
     ↓         ↓        ↓
  [error]  [error]  [error]
     ↓         ↓        ↓
   CLOSED    CLOSED   CLOSED
```

---

### Chat Event (Message Frame)

**Description**: Single WebSocket message frame transmitted during conversation streaming. Ephemeral; not persisted.

**Attributes**:
- `type`: Enum [`token`, `final`, `error`] (event classification)
- `payload`: Object (type-specific data, see variants below)
- `timestamp`: Timestamp (when event generated)
- `correlationId`: String UUID (inherited from connection for tracing)

**Event Type Variants**:

#### Token Event
```typescript
{
  type: 'token',
  value: string  // Single token/chunk of streaming response
}
```

#### Final Event
```typescript
{
  type: 'final',
  message: string,           // Complete assembled response
  latencyMs?: number,        // Request processing time
  tokenUsage?: {             // LLM usage metrics
    recentTokens: number,
    overflowTokens: number,
    budget: number,
    utilisationPct: number
  }
}
```

#### Error Event
```typescript
{
  type: 'error',
  message: string,    // Human-readable error description
  retryable: boolean  // Whether user can retry the request
}
```

**Relationships**:
- Produced by one WebSocket Connection
- Maps to existing `AgentStreamEvent` schema (in `@cerebrobot/chat-shared`)

**Validation Rules**:
- `type` MUST be one of three allowed values
- Token event `value` MUST be non-empty string
- Final event `message` MUST be non-empty string
- Error event `retryable` MUST be boolean
- Serialized JSON MUST be ≤1MB (per FR-015)

---

## Unchanged Entities

The following existing entities are **not modified** by this feature:

### Thread
- **No Changes**: WebSocket migration does not alter Thread model
- **Integration**: `threadId` passed in WebSocket message payload to load thread metadata

### Message  
- **No Changes**: Persisted message format unchanged
- **Integration**: Final message content saved to database using existing persistence logic

### User
- **No Changes**: User model unchanged
- **Integration**: `userId` required in every WebSocket message (per FR-008)

### TokenUsage
- **No Changes**: Usage tracking schema unchanged
- **Integration**: Included in final event payload, logged identically to SSE implementation

---

## Entity Relationships Diagram

```
┌─────────────────┐
│   User          │
│  (persisted)    │
└────────┬────────┘
         │ 1
         │
         │ N
┌────────▼────────┐        ┌──────────────────┐
│ WebSocket       │ 1    N │  Chat Event      │
│ Connection      ├────────►  (ephemeral)     │
│ (ephemeral)     │        │  - token         │
└────────┬────────┘        │  - final         │
         │ 1               │  - error         │
         │                 └──────────────────┘
         │ 1
┌────────▼────────┐
│   Thread        │
│  (persisted)    │
└─────────────────┘
```

**Cardinality Notes**:
- One User can have multiple WebSocket Connections (up to 5 concurrent per clarification Q1)
- One Thread can be accessed via multiple WebSocket Connections (across sessions)
- One WebSocket Connection produces many Chat Events (streaming response)

---

## Data Flow

### Connection Establishment
```
Client                      Server
  │                           │
  ├─ WebSocket Upgrade ──────►│
  │                           ├─ Validate headers
  │                           ├─ Create Connection{state: CONNECTING}
  │◄── 101 Switching Protocols┤
  │                           ├─ Update Connection{state: OPEN}
  │                           ├─ Log: websocket_connected
  │                           │
```

### Message Streaming
```
Client                      Server
  │                           │
  ├─ JSON: {threadId, ...} ──►│
  │                           ├─ Validate payload (Zod)
  │                           ├─ Check threadId exists
  │                           ├─ Check userId valid
  │                           ├─ Check payload ≤1MB
  │                           ├─ Start LangGraph stream
  │                           │
  │◄─ ChatEvent{type:token} ──┤ (loop)
  │◄─ ChatEvent{type:token} ──┤
  │◄─ ChatEvent{type:final} ──┤
  │                           ├─ Log: websocket_stream_complete
  │◄─ Close(1000) ────────────┤
  │                           ├─ Update Connection{state: CLOSED}
  │                           ├─ Log: websocket_closed
  │                           │
```

### Error Handling
```
Client                      Server
  │                           │
  ├─ JSON: {invalid} ────────►│
  │                           ├─ Validation fails
  │◄─ ChatEvent{type:error} ──┤
  │◄─ Close(1000) ────────────┤
  │                           ├─ Log: websocket_error
  │                           │
```

---

## Persistence Impact

**No database schema changes required.**

- WebSocket Connection: Ephemeral (not persisted)
- Chat Event: Ephemeral (not persisted)  
- Message content: Persisted via existing LangGraph checkpointing (unchanged)
- Usage metrics: Logged via existing Pino logger (unchanged)

**Migration Required**: None

---

## Validation Rules Summary

| Field | Rule | Error Behavior |
|-------|------|----------------|
| userId | MUST be valid UUID | Send error event, close connection |
| threadId | MUST reference existing thread | Send error event (thread not found), close connection |
| message | MUST be non-empty string | Send error event (invalid payload), close connection |
| payload size | MUST be ≤1MB | Send error event (message too large), close connection |
| event type | MUST be token/final/error | Client discards unknown types |
| correlationId | SHOULD be UUID (optional) | Log warning if missing, continue processing |

---

## State Management

### Server-Side
- **No persistent state**: Connections tracked only in memory during lifecycle
- **No connection pool**: Each request gets new connection (per research Decision 3)
- **No session storage**: Connection metadata discarded after close

### Client-Side  
- **Transient state**: React hook manages connection reference via `useRef`
- **Message accumulation**: Tokens accumulated in component state during streaming
- **Cleanup**: Connection closed on component unmount via `useEffect` cleanup

---

## Concurrency Constraints

**Per clarification Q1**: System supports up to **5 concurrent connections** (single-user deployment).

**Enforcement**: Not enforced at code level; relies on deployment resource limits. Future work may add connection counter if needed.

**Thread Safety**: Not applicable (Node.js single-threaded event loop; WebSocket frames processed sequentially).

---

## References

- **Existing Schemas**: `packages/chat-shared/src/schemas/chat.ts` (ChatRequestSchema, ChatStreamEventSchema)
- **Research Decisions**: `specs/005-switch-to-websocket/research.md` (Decisions 3, 4)
- **Feature Spec**: `specs/005-switch-to-websocket/spec.md` (Key Entities section)
- **WebSocket States**: MDN WebSocket.readyState constants

---

**Data Model Status**: ✅ **COMPLETE**  
**Schema Changes Required**: None  
**Migration Required**: None  
**Ready for Contract Definition**: Yes
