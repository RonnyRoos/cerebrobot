# Data Model: Thread-Persistent WebSocket Connections

**Feature**: 006-migrate-to-thread  
**Date**: October 11, 2025  
**Phase**: 1 (Design)

## Overview

This document defines the runtime entities and their relationships for thread-persistent WebSocket connections. These are in-memory, ephemeral entities (no database persistence) that manage connection lifecycle, request correlation, and cancellation state.

---

## Runtime Entities

### 1. Thread Connection

**Description**: Represents the persistent WebSocket connection for a single conversation thread. Lifecycle spans from thread component mount to unmount.

**Attributes**:

| Attribute | Type | Required | Description | Validation Rules |
|-----------|------|----------|-------------|------------------|
| `connectionId` | UUID string | Yes | Unique identifier for this connection instance | RFC 4122 v4 UUID generated via crypto.randomUUID() |
| `threadId` | string | Yes | Associated conversation thread identifier | Non-empty string; matches thread in database |
| `userId` | string \| null | No | User owning this connection (null until auth implemented) | Null for MVP; will be required in future auth work |
| `connectionState` | enum | Yes | Current connection status | One of: 'connecting' \| 'connected' \| 'disconnecting' \| 'closed' |
| `activeRequestId` | UUID string \| null | No | RequestId of currently streaming response (null if idle) | Null or valid UUID; cleared on completion/error/cancellation |
| `connectedAt` | Date | Yes | Timestamp when connection was established | ISO 8601 timestamp |
| `messageCount` | number | Yes | Total messages sent over this connection | Non-negative integer; incremented on each message send |

**Relationships**:
- 1 Thread Connection → 0..1 Request Correlation (current active request)
- 1 Thread Connection → 0..* Request Correlation (historical requests, not persisted)
- 1 Thread Connection belongs to 1 Thread (via threadId)

**State Transitions**:
```
connecting → connected (WebSocket onopen)
connected → disconnecting (user closes thread, navigation away)
connected → closed (unexpected disconnect, server restart)
disconnecting → closed (graceful close complete)
closed → connecting (reconnection attempt)
```

**Lifecycle**:
- **Creation**: Thread component mounts → `useThreadConnection` hook → WebSocket established → connectionId generated
- **Active**: User sends messages → messageCount increments → activeRequestId tracks current request
- **Cleanup**: Thread component unmounts → WebSocket.close() → state deleted from ConnectionManager Map

**Implementation Notes**:
- Client-side: Managed by `useThreadConnection` React hook (useRef for WebSocket, useState for connectionState)
- Server-side: Managed by `ConnectionManager` class (Map<connectionId, ConnectionState>)
- Not persisted to database (ephemeral, in-memory only)

---

### 2. Request Correlation

**Description**: Tracks a single request/response exchange over a multiplexed connection. Enables matching response events (token/final/error/cancelled) to the originating request.

**Attributes**:

| Attribute | Type | Required | Description | Validation Rules |
|-----------|------|----------|-------------|------------------|
| `requestId` | UUID string | Yes | Unique identifier for this request/response pair | RFC 4122 v4 UUID generated via crypto.randomUUID() |
| `connectionId` | UUID string | Yes | Parent connection identifier | Must reference existing Thread Connection |
| `timestamp` | Date | Yes | When request was initiated | ISO 8601 timestamp |
| `requestStatus` | enum | Yes | Current request processing state | One of: 'pending' \| 'streaming' \| 'completed' \| 'cancelled' \| 'error' |

**Relationships**:
- N Request Correlations → 1 Thread Connection
- 1 Request Correlation → 0..1 Cancellation Signal (if cancelled)

**State Transitions**:
```
pending → streaming (first token received)
streaming → completed (final event received)
streaming → cancelled (cancel signal sent, acknowledgment received)
streaming → error (error event received)
pending → error (error before streaming starts)
```

**Lifecycle**:
- **Creation**: User sends message → requestId generated → added to inflightRequests Map
- **Active**: Server sends token/final/error events → matched via requestId → handler invoked
- **Cleanup**: final/error/cancelled received → removed from inflightRequests Map

**Implementation Notes**:
- Client-side: Managed by `useChatMessages` hook (Map<requestId, RequestHandler>)
- Server-side: Implicit (requestId extracted from incoming message, echoed in outgoing events)
- Not persisted (exists only during active request/response cycle)

---

### 3. Cancellation Signal

**Description**: Explicit command from client to server requesting termination of an in-progress response. Triggers AbortController on server side.

**Attributes**:

| Attribute | Type | Required | Description | Validation Rules |
|-----------|------|----------|-------------|------------------|
| `requestId` | UUID string | Yes | RequestId of the request to cancel | Must reference existing Request Correlation |
| `timestamp` | Date | Yes | When cancellation was initiated | ISO 8601 timestamp |

**Relationships**:
- 1 Cancellation Signal → 1 Request Correlation (targets specific request)
- Sent via WebSocket message (not a persistent entity)

**Lifecycle**:
- **Creation**: User sends new message while previous response streaming → cancel message sent first
- **Processing**: Server receives cancel → aborts AbortController → sends acknowledgment
- **Cleanup**: Acknowledgment received → in-flight request removed → new request begins

**Message Schema** (JSON over WebSocket):
```typescript
// Client → Server
{
  type: 'cancel',
  requestId: string, // UUID of request to cancel
}

// Server → Client (acknowledgment)
{
  type: 'cancelled',
  requestId: string, // Echo of cancelled requestId
}
```

**Implementation Notes**:
- Transient message (not stored)
- Server checks if request still active (edge case: cancellation arrives after natural completion)
- AbortController stored in Connection State entity

---

### 4. Connection State (Server-Side)

**Description**: Server-side representation of connection state maintained per WebSocket. Extends Thread Connection with server-specific runtime data.

**Attributes**:

| Attribute | Type | Required | Description | Validation Rules |
|-----------|------|----------|-------------|------------------|
| `connectionId` | UUID string | Yes | Unique connection identifier | RFC 4122 v4 UUID |
| `threadId` | string | Yes | Associated thread | Non-empty string |
| `userId` | string \| null | No | User identifier (null for MVP) | Null until auth implemented |
| `activeRequestId` | UUID string \| null | No | Currently processing requestId | Null or valid UUID |
| `abortController` | AbortController \| null | No | Cancellation controller for active request | Null when idle; cleanup on completion |
| `messageCount` | number | Yes | Total messages processed | Non-negative integer |
| `connectedAt` | Date | Yes | Connection timestamp | ISO 8601 timestamp |

**Relationships**:
- 1 Connection State → 1 WebSocket instance (via Fastify WebSocket plugin)
- 1 Connection State → 0..1 AbortController (current active request)

**Lifecycle**:
- **Creation**: WebSocket connection event → ConnectionManager.onCreate() → added to Map
- **Active**: Message received → ConnectionManager.onMessage() → abortController created → request processed
- **Cleanup**: WebSocket close event → ConnectionManager.onClose() → removed from Map

**Implementation Notes**:
- Managed by `ConnectionManager` class
- Map<connectionId, ConnectionState> for O(1) lookup
- Metrics logged on cleanup: messageCount, connection duration
- AbortController cleaned up on both natural completion and forced cancellation

---

## Entity Relationship Diagram

```
┌─────────────────────────────┐
│   Thread Connection         │
│  (Client-side useRef)       │
├─────────────────────────────┤
│ connectionId: UUID          │
│ threadId: string            │
│ connectionState: enum       │
│ activeRequestId: UUID?      │
│ connectedAt: Date           │
│ messageCount: number        │
└──────────┬──────────────────┘
           │ 1
           │
           │ 0..*
           ▼
┌─────────────────────────────┐          ┌─────────────────────────────┐
│   Request Correlation       │          │   Connection State          │
│  (Client Map<id, handler>)  │          │  (Server ConnectionManager) │
├─────────────────────────────┤          ├─────────────────────────────┤
│ requestId: UUID             │          │ connectionId: UUID          │
│ connectionId: UUID          │◄─────────┤ threadId: string            │
│ timestamp: Date             │   same   │ activeRequestId: UUID?      │
│ requestStatus: enum         │   IDs    │ abortController: AC?        │
└──────────┬──────────────────┘          │ messageCount: number        │
           │ 0..1                         │ connectedAt: Date           │
           │                              └─────────────────────────────┘
           ▼
┌─────────────────────────────┐
│   Cancellation Signal       │
│  (WebSocket message)        │
├─────────────────────────────┤
│ requestId: UUID             │
│ timestamp: Date             │
└─────────────────────────────┘
```

---

## Validation Rules Summary

**UUID Generation**:
- All UUIDs generated via `crypto.randomUUID()` (RFC 4122 v4)
- Client generates requestId before sending message
- Server generates connectionId on connection establishment

**State Consistency**:
- `activeRequestId` in Thread Connection must match Connection State on server (if not null)
- Request Correlation removed from inflightRequests Map when status transitions to completed/cancelled/error
- AbortController in Connection State cleaned up when activeRequestId set to null

**Lifecycle Guarantees**:
- Thread Connection deleted on unmount (WebSocket cleanup in useEffect return)
- Connection State deleted on WebSocket close (ConnectionManager.onClose)
- Request Correlation removed on final/error/cancelled event (no orphaned handlers)

**Edge Case Handling**:
- Orphaned response (requestId not in inflightRequests Map) → log error, ignore event
- Cancellation after completion (requestId not active) → server noops gracefully
- Multiple cancellations for same requestId → idempotent (second cancel ignored)

---

## Persistence Strategy

**No database persistence required**. All entities are ephemeral runtime state:

- Thread Connection: Recreated on page load/refresh (user re-opens thread)
- Request Correlation: Exists only during active request/response cycle
- Cancellation Signal: Transient message (not stored)
- Connection State: In-memory Map on server (cleared on restart)

**Rationale**: Single-user deployment, no multi-device sync requirements, connection state non-critical (users can re-send messages). Aligns with Constitution Principle VII (Operator-Centric Design) - keep it simple for hobby deployments.

---

## Data Model Complete ✅

All runtime entities defined with attributes, relationships, state transitions, and validation rules.

**Ready for Phase 1 Contracts**: Message protocol specification, connection lifecycle flows
