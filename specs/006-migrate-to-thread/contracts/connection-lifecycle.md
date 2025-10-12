# WebSocket Connection Lifecycle Specification

**Feature**: 006-migrate-to-thread  
**Date**: October 11, 2025  
**Phase**: 1 (Design - Contracts)

## Overview

This document specifies the lifecycle of thread-persistent WebSocket connections from client mount to cleanup. It covers establishment, multiplexing, cancellation, reconnection, and unmount flows.

---

## Lifecycle Phases

```
┌─────────────┐
│   Unmounted │ (React component not rendered)
└──────┬──────┘
       │ useThreadConnection(threadId) hook mounts
       ▼
┌─────────────┐
│ Connecting  │ (new WebSocket(url), readyState = CONNECTING)
└──────┬──────┘
       │ onopen event
       ▼
┌─────────────┐
│  Connected  │◄───┐ (readyState = OPEN, ready to send messages)
└──────┬──────┘    │
       │           │ Reconnection after disconnect
       │           │ (exponential backoff: 1s, 2s, 4s)
       ▼           │
┌─────────────┐    │
│ Multiplexing│────┘ (multiple message/cancel cycles on same connection)
└──────┬──────┘
       │
       │ User navigates away OR network error
       ▼
┌─────────────┐
│Disconnecting│ (close() called OR onerror/onclose fired)
└──────┬──────┘
       │ cleanup complete
       ▼
┌─────────────┐
│ Unmounted   │ (connection closed, listeners removed)
└─────────────┘
```

---

## Phase 1: Connection Establishment

### Client-Side Flow (useThreadConnection Hook)

**Trigger**: React component with `useThreadConnection(threadId)` hook mounts

**Steps**:
1. **Initialize State**:
   ```typescript
   const wsRef = useRef<WebSocket | null>(null);
   const inflightRequests = useRef<Map<string, ResponseHandler>>(new Map());
   const [isConnected, setIsConnected] = useState(false);
   ```

2. **Create WebSocket** (useEffect with threadId dependency):
   ```typescript
   useEffect(() => {
     const ws = new WebSocket(`${WS_BASE_URL}/api/chat/ws?threadId=${threadId}`);
     wsRef.current = ws;

     ws.onopen = () => {
       setIsConnected(true);
       console.log(`[Connected] threadId=${threadId}`);
     };

     ws.onerror = (error) => {
       console.error('[WebSocket Error]', error);
     };

     ws.onclose = () => {
       setIsConnected(false);
       console.log('[Disconnected]');
       // Reconnection logic in useReconnection hook
     };

     ws.onmessage = (event) => {
       const serverEvent = JSON.parse(event.data);
       const { requestId } = serverEvent;
       const handler = inflightRequests.current.get(requestId);
       if (handler) {
         handler(serverEvent); // Route to correct message handler
       }
     };

     return () => {
       ws.close();
       inflightRequests.current.clear();
     };
   }, [threadId]);
   ```

3. **Return Connection Interface**:
   ```typescript
   return {
     sendMessage: (content: string) => { /* ... */ },
     cancelMessage: (requestId: string) => { /* ... */ },
     isConnected,
   };
   ```

**State Transitions**:
- `Unmounted` → `Connecting`: Hook mounts, WebSocket constructor called
- `Connecting` → `Connected`: `onopen` event fires
- `Connecting` → `Disconnecting`: `onerror` or timeout during handshake

---

### Server-Side Flow (Fastify WebSocket Route)

**Trigger**: Client initiates WebSocket handshake to `/api/chat/ws?threadId=...`

**Steps**:
1. **Extract Thread ID** (from query parameter):
   ```typescript
   fastify.get('/api/chat/ws', { websocket: true }, (connection, req) => {
     const { threadId } = req.query;
     if (!threadId) {
       connection.socket.close(1008, 'Missing threadId parameter');
       return;
     }

     const connectionId = crypto.randomUUID();
     connectionManager.register(connectionId, threadId, connection.socket);
     console.log(`[Connection] connectionId=${connectionId}, threadId=${threadId}`);

     // ...event handlers...
   });
   ```

2. **Register Connection** (ConnectionManager stores state):
   ```typescript
   class ConnectionManager {
     private connections = new Map<string, ConnectionState>();

     register(connectionId: string, threadId: string, socket: WebSocket) {
       this.connections.set(connectionId, {
         connectionId,
         threadId,
         socket,
         activeRequestId: null,
         abortController: null,
       });
     }
   }
   ```

3. **Setup Message Listener**:
   ```typescript
   connection.socket.on('message', async (data: Buffer) => {
     const clientMessage = JSON.parse(data.toString());
     if (clientMessage.type === 'message') {
       await handleChatMessage(connectionId, clientMessage);
     } else if (clientMessage.type === 'cancel') {
       await handleCancellation(connectionId, clientMessage.requestId);
     }
   });
   ```

4. **Setup Close Handler**:
   ```typescript
   connection.socket.on('close', () => {
     connectionManager.unregister(connectionId);
     console.log(`[Disconnected] connectionId=${connectionId}`);
   });
   ```

**State Transitions**:
- New connection → `ConnectionManager.register()` → Ready for messages
- Close event → `ConnectionManager.unregister()` → Cleanup

---

## Phase 2: Message Multiplexing

### Normal Message Flow (No Cancellation)

**Sequence Diagram**:
```
Client (React)                 Server (Fastify)              LangGraph Agent
     │                               │                             │
     ├─► sendMessage("Hello")        │                             │
     │   requestId = uuid()          │                             │
     │   inflightRequests.set(...)   │                             │
     │                               │                             │
     ├──────► { type: 'message' }────┤                             │
     │                               ├──► Store activeRequestId    │
     │                               ├──► Create AbortController   │
     │                               │                             │
     │                               ├─────────► stream(config)────┤
     │                               │                             ├─► Generate
     │                               │                             │
     │ ◄──────┤ { type: 'token' }────┤◄─────────── yield chunk ────┤
     │   handler(event)              │                             │
     │   appendToken(...)            │                             │
     │                               │                             │
     │ ◄──────┤ { type: 'token' }────┤◄─────────── yield chunk ────┤
     │   handler(event)              │                             │
     │                               │                             │
     │ ◄──────┤ { type: 'final' }────┤◄─────────── stream ends ────┤
     │   handler(event)              │                             │
     │   inflightRequests.delete()   ├──► Clear activeRequestId    │
     │                               │                             │
     │─┐                             │                             │
     │ │ sendMessage("Next msg")     │                             │
     │ │ NEW requestId = uuid()      │                             │
     │◄┘                             │                             │
     │                               │                             │
     ├──────► { type: 'message' }────┤                             │
     │        (same connection!)     │                             │
```

**Key Properties** (FR-001, FR-002, FR-004):
- Single WebSocket connection handles multiple request/response cycles
- New messages allowed after previous response completes (`isStreaming = false`)
- Each message gets unique requestId; server echoes in all responses
- Connection remains open (no close between messages)

---

### Cancellation Flow (Mid-Stream Abort)

**Scenario**: User sends new message while previous response still streaming

**Sequence Diagram**:
```
Client (React)                 Server (Fastify)              LangGraph Agent
     │                               │                             │
     ├──────► { type: 'message' }────┤                             │
     │        requestId = 'req-1'    ├──► activeRequestId = 'req-1'│
     │                               │                             │
     │ ◄──────┤ { type: 'token' }────┤◄─────────── yield chunk ────┤
     │        requestId = 'req-1'    │                             │
     │                               │                             │
     │─┐                             │                             │
     │ │ User types new message      │                             │
     │ │ sendMessage("Stop, do X")   │                             │
     │◄┘                             │                             │
     │                               │                             │
     ├──────► { type: 'cancel' }─────┤                             │
     │        requestId = 'req-1'    ├──► if (activeRequestId ==   │
     │                               │         'req-1') {           │
     │                               │       abortController.abort()├──► AbortError
     │                               │     }                        │
     │                               │                             │
     │ ◄──────┤ { type: 'cancelled' }┤                             │
     │        requestId = 'req-1'    ├──► Clear activeRequestId    │
     │   inflightRequests.delete()   │                             │
     │   isStreaming = false         │                             │
     │                               │                             │
     ├──────► { type: 'message' }────┤                             │
     │        requestId = 'req-2'    ├──► activeRequestId = 'req-2'│
     │                               ├─────────► stream(config)────┤
     │                               │            (new request)    │
```

**Critical Timing** (FR-008, FR-009, FR-010):
- **Immediate Cancellation**: Client sends cancel signal as soon as user types
- **Server Validation**: Only abort if `activeRequestId` matches (idempotent)
- **Acknowledgment**: Server sends `cancelled` event before processing new message
- **State Reset**: `isStreaming = false` allows new message to send

---

## Phase 3: Reconnection Strategy

### Reconnection Trigger Events

**Network Disconnect Scenarios** (Edge Case #3):
1. **Client-side network loss**: WiFi drops, airplane mode
2. **Server restart**: Backend redeployment
3. **Idle timeout**: Proxy/NAT closes connection after inactivity
4. **Explicit close**: Server sends close frame (e.g., maintenance mode)

**Detection** (useReconnection Hook):
```typescript
ws.onclose = (event) => {
  setIsConnected(false);
  if (event.code !== 1000) { // 1000 = normal closure
    console.warn('[Unexpected Disconnect]', event.code, event.reason);
    attemptReconnect();
  }
};
```

---

### Exponential Backoff Reconnection

**Algorithm** (Clarification Q2, FR-013):
```typescript
const RECONNECT_DELAYS = [1000, 2000, 4000]; // 1s, 2s, 4s
const MAX_ATTEMPTS = 3;

function attemptReconnect() {
  let attempt = 0;

  const reconnectTimer = setInterval(() => {
    if (attempt >= MAX_ATTEMPTS) {
      clearInterval(reconnectTimer);
      console.error('[Reconnect Failed] Max attempts reached');
      return;
    }

    const delay = RECONNECT_DELAYS[attempt];
    console.log(`[Reconnecting] Attempt ${attempt + 1} in ${delay}ms`);

    setTimeout(() => {
      const ws = new WebSocket(`${WS_BASE_URL}/api/chat/ws?threadId=${threadId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        clearInterval(reconnectTimer);
        console.log('[Reconnected]');
      };

      ws.onerror = () => {
        attempt++;
      };
    }, delay);
  }, 0);
}
```

**Backoff Schedule**:
- Attempt 1: Wait 1 second → connect
- Attempt 2 (if fails): Wait 2 seconds → connect
- Attempt 3 (if fails): Wait 4 seconds → connect
- After 3 failures: Give up, show "Connection Lost" UI

**User Experience** (FR-014, Edge Case #3):
- Connection status indicator: 🟢 Connected / 🟡 Reconnecting... / 🔴 Disconnected
- Input disabled during reconnection
- Message queue: Discard unsent messages (Clarification Q1 - KISS approach)

---

### Reconnection Success Flow

**Sequence**:
```
Client                                Server
  │                                     │
  │  [Disconnect: network error]        │
  │  ◄────────────────────────────────  │
  │                                     │
  │─┐ Wait 1s (attempt 1)               │
  │◄┘                                   │
  │                                     │
  ├──► new WebSocket(url)               │
  │                                     ├──► New connectionId assigned
  │                                     │    (old connection cleaned up)
  │                                     │
  │  ◄─────── onopen ───────────────────┤
  │  setIsConnected(true)               │
  │                                     │
  │  User can send messages again ✅    │
```

**State Reset** (FR-001):
- New WebSocket connection created (different underlying TCP connection)
- Server assigns new `connectionId` (UUIDs never collide)
- `inflightRequests` Map cleared (discard-and-retry per Q1)
- Thread history preserved (LangGraph checkpointer persists state)

---

## Phase 4: Connection Cleanup

### Normal Unmount (User Navigates Away)

**Client-Side Cleanup** (useEffect return):
```typescript
useEffect(() => {
  const ws = new WebSocket(...);
  // ...setup...

  return () => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close(1000, 'Component unmounted'); // Normal closure
    }
    inflightRequests.current.clear();
    wsRef.current = null;
  };
}, [threadId]);
```

**Server-Side Cleanup** (onclose handler):
```typescript
connection.socket.on('close', (code, reason) => {
  const state = connectionManager.get(connectionId);
  
  // Cancel active request if any
  if (state?.abortController) {
    state.abortController.abort();
  }
  
  connectionManager.unregister(connectionId);
  console.log(`[Connection Closed] code=${code}, reason=${reason}`);
});
```

**Guarantees**:
- Listeners removed (no memory leaks)
- Active requests aborted (no orphaned LangGraph streams)
- Connection state deleted (no stale references)

---

### Abnormal Cleanup (Network Error)

**Error Scenarios**:
1. **Sudden network loss**: `onerror` fires, then `onclose`
2. **Server crash**: `onclose` with abnormal code (1006)
3. **Timeout**: Fastify closes idle connection

**Client Handling**:
```typescript
ws.onerror = (error) => {
  console.error('[WebSocket Error]', error);
  // onclose will fire immediately after
};

ws.onclose = (event) => {
  if (event.code === 1000) {
    console.log('[Normal Close]');
  } else {
    console.warn('[Abnormal Close]', event.code, event.reason);
    attemptReconnect(); // Trigger reconnection
  }
};
```

**No Partial State** (Clarification Q3):
- Client discards incomplete responses (no partial messages appended)
- Server logs error but doesn't persist failed state
- Retry from clean slate after reconnection

---

## Edge Case Handling

### Race Condition: Cancel After Natural Completion

**Timeline**:
```
t0: Server sends { type: 'final', requestId: 'req-1' }
t1: Client receives final event → inflightRequests.delete('req-1')
t2: (network delay) Client's earlier cancel signal arrives at server
t3: Server checks activeRequestId (already null) → noop
```

**Outcome**: No error, no duplicate `cancelled` event (idempotent per FR-010)

---

### Race Condition: Reconnect During Active Request

**Timeline**:
```
t0: Client sends message (requestId: 'req-1')
t1: Server starts streaming
t2: Network disconnect (WiFi drops)
t3: Client reconnects (new connectionId, old 'req-1' lost)
t4: Server's old connection cleanup aborts 'req-1'
```

**Outcome**:
- Old request aborted on server (cleanup in `onclose`)
- Client state reset (`inflightRequests` cleared)
- User sees "Reconnecting..." then "Send failed, try again" (discard-and-retry)

---

### Thread ID Mismatch

**Scenario**: Client reconnects with different threadId parameter

**Server Validation**:
```typescript
fastify.get('/api/chat/ws', { websocket: true }, (connection, req) => {
  const { threadId } = req.query;
  
  // Validate threadId exists (format validation TBD)
  if (!threadId || typeof threadId !== 'string') {
    connection.socket.close(1008, 'Invalid threadId');
    return;
  }
  
  // Each connection bound to single thread (no switching)
  connectionManager.register(connectionId, threadId, connection.socket);
});
```

**Guarantee** (FR-002): One connection = one thread; no mid-connection thread switching

---

## State Transition Diagram (Complete)

```
┌──────────────┐
│  Unmounted   │
└──────┬───────┘
       │ Component mounts
       ▼
┌──────────────┐
│ Connecting   │──────► [Handshake fails] ──► Reconnect Logic
└──────┬───────┘                                (exp backoff)
       │ onopen                                       │
       ▼                                              │
┌──────────────┐                                      │
│  Connected   │◄─────────────────────────────────────┘
│ (Idle)       │
└──────┬───────┘
       │ sendMessage()
       ▼
┌──────────────┐
│  Streaming   │───┐ (activeRequestId set,
│              │   │  isStreaming = true)
└──────┬───────┘   │
       │           │
       ├───────────┘ Receive token events
       │
       ├──► [User sends new message] ──► Send cancel signal
       │                                         │
       │                                         ▼
       │                                 ┌──────────────┐
       │                                 │ Cancelling   │
       │                                 │ (abort())    │
       │                                 └──────┬───────┘
       │                                        │
       │ ◄──────────────────────────────────────┘ Receive cancelled event
       │
       ├──► [Receive final event] ──► Connected (Idle)
       │
       ├──► [Network error] ──► Disconnecting ──► Reconnect Logic
       │
       ▼
┌──────────────┐
│  Connected   │ (ready for next message)
│  (Idle)      │
└──────────────┘
```

---

## Connection Lifecycle Specification Complete ✅

All flows documented: establishment, multiplexing, cancellation, reconnection, cleanup with sequence diagrams and edge case handling.

**Phase 1 Contracts Complete** ✅  
Next: `quickstart.md` (developer migration guide)
