# Quickstart: Migrating to Thread-Persistent WebSocket Connections

**Feature**: 006-migrate-to-thread  
**Date**: October 11, 2025  
**Audience**: Cerebrobot developers implementing spec 006

## Overview

This guide walks you through migrating from the one-message-per-connection pattern (spec 005) to thread-persistent WebSocket connections with request multiplexing and cancellation support.

**What Changes**:
- ❌ **Old**: New WebSocket connection per message, auto-close after `final` event
- ✅ **New**: Single WebSocket per thread, multiple messages over same connection, explicit cancellation

**Why Migrate**:
- Lower latency (no connection handshake per message)
- Cancellation support (abort mid-stream with AbortController)
- Better resource usage (fewer TCP connections)
- Simpler UX (persistent connection status indicator)

---

## Quick Reference

### Before (Spec 005 - One Message Per Connection)

**Client Code**:
```typescript
// OLD: Create new connection for every message
function sendMessage(content: string) {
  const ws = new WebSocket(`/api/chat/ws?threadId=${threadId}`);
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'token') {
      appendToken(data.token);
    } else if (data.type === 'final') {
      setResponse(data.response.content);
      ws.close(); // Connection closed after every message
    }
  };
  
  ws.onopen = () => {
    ws.send(JSON.stringify({ content }));
  };
}
```

**Issues**:
- No cancellation (user can't interrupt streaming response)
- No connection reuse (new handshake for every message = ~100-300ms latency)
- No request tracking (can't multiplex multiple requests)

---

### After (Spec 006 - Thread-Persistent Connections)

**Client Code**:
```typescript
// NEW: Single connection persists for entire component lifecycle
const { sendMessage, cancelMessage, isConnected } = useThreadConnection(threadId);

function handleSubmit() {
  const requestId = sendMessage(inputValue);
  // Connection stays open, ready for next message
}

function handleCancel() {
  cancelMessage(currentRequestId);
  // Abort LangGraph stream, send new message immediately
}
```

**Benefits**:
- ✅ Cancellation via `AbortController` (spec FR-008)
- ✅ Connection reuse (zero handshake overhead after first connect)
- ✅ Request correlation via `requestId` (spec FR-004)

---

## Step-by-Step Migration

### Phase 1: Update Client-Side (React)

#### 1.1 Install Hook

**Location**: `apps/client/src/hooks/useThreadConnection.ts` (create new file)

```typescript
import { useEffect, useRef, useState } from 'react';
import type { ServerEvent, ClientMessage } from '@repo/chat-shared/schemas';

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:3000';

type ResponseHandler = (event: ServerEvent) => void;

export function useThreadConnection(threadId: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const inflightRequests = useRef<Map<string, ResponseHandler>>(new Map());
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(`${WS_BASE_URL}/api/chat/ws?threadId=${threadId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log(`[WebSocket Connected] threadId=${threadId}`);
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      console.log('[WebSocket Closed]', event.code, event.reason);
      // TODO: Add reconnection logic (see useReconnection hook)
    };

    ws.onerror = (error) => {
      console.error('[WebSocket Error]', error);
    };

    ws.onmessage = (event) => {
      const serverEvent: ServerEvent = JSON.parse(event.data);
      const { requestId } = serverEvent;

      const handler = inflightRequests.current.get(requestId);
      if (!handler) {
        console.error(`[Orphaned Response] requestId=${requestId}`);
        return; // Graceful degradation (edge case per spec)
      }

      handler(serverEvent);

      // Cleanup on final/error/cancelled events
      if (
        serverEvent.type === 'final' ||
        serverEvent.type === 'error' ||
        serverEvent.type === 'cancelled'
      ) {
        inflightRequests.current.delete(requestId);
      }
    };

    return () => {
      ws.close(1000, 'Component unmounted');
      inflightRequests.current.clear();
    };
  }, [threadId]);

  const sendMessage = (
    content: string,
    onToken: (token: string) => void,
    onComplete: (response: string) => void,
    onError: (error: string) => void
  ): string => {
    const requestId = crypto.randomUUID(); // Generate unique ID per spec

    const handler: ResponseHandler = (event) => {
      switch (event.type) {
        case 'token':
          onToken(event.token);
          break;
        case 'final':
          onComplete(event.response.content);
          break;
        case 'error':
          onError(event.error.message);
          break;
        case 'cancelled':
          console.log(`[Request Cancelled] requestId=${requestId}`);
          break;
      }
    };

    inflightRequests.current.set(requestId, handler);

    const message: ClientMessage = {
      type: 'message',
      requestId,
      threadId,
      content,
    };

    wsRef.current?.send(JSON.stringify(message));
    return requestId; // Return for cancellation tracking
  };

  const cancelMessage = (requestId: string) => {
    const cancelSignal: ClientMessage = {
      type: 'cancel',
      requestId,
    };

    wsRef.current?.send(JSON.stringify(cancelSignal));
  };

  return {
    sendMessage,
    cancelMessage,
    isConnected,
  };
}
```

**Key Changes from Spec 005**:
- ✅ Connection persists (no `ws.close()` after final event)
- ✅ `requestId` generated via `crypto.randomUUID()` per spec research.md decision #1
- ✅ `inflightRequests` Map tracks multiple concurrent requests (multiplexing)
- ✅ `cancelMessage()` sends cancellation signal per message-protocol.md

---

#### 1.2 Update Chat Component

**Location**: `apps/client/src/components/ChatWindow.tsx`

**Before**:
```typescript
// OLD: Manual WebSocket creation
const [messages, setMessages] = useState<Message[]>([]);

const handleSend = (content: string) => {
  const ws = new WebSocket(`/api/chat/ws?threadId=${threadId}`);
  ws.onmessage = (event) => { /* ... */ };
  ws.send(JSON.stringify({ content }));
};
```

**After**:
```typescript
// NEW: Use hook for persistent connection
import { useThreadConnection } from '@/hooks/useThreadConnection';

const [messages, setMessages] = useState<Message[]>([]);
const [isStreaming, setIsStreaming] = useState(false);
const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);

const { sendMessage, cancelMessage, isConnected } = useThreadConnection(threadId);

const handleSend = (content: string) => {
  setIsStreaming(true);

  const requestId = sendMessage(
    content,
    (token) => {
      // Append token to streaming message
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg?.role === 'assistant' && lastMsg.isStreaming) {
          return [...prev.slice(0, -1), { ...lastMsg, content: lastMsg.content + token }];
        }
        return [...prev, { role: 'assistant', content: token, isStreaming: true }];
      });
    },
    (finalContent) => {
      // Finalize message
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        return [...prev.slice(0, -1), { ...lastMsg, content: finalContent, isStreaming: false }];
      });
      setIsStreaming(false);
      setCurrentRequestId(null);
    },
    (error) => {
      console.error('Message error:', error);
      setIsStreaming(false);
      setCurrentRequestId(null);
    }
  );

  setCurrentRequestId(requestId);
};

const handleCancel = () => {
  if (currentRequestId) {
    cancelMessage(currentRequestId);
  }
};
```

**New Features**:
- ✅ `isConnected` status indicator (show "Connecting..." / "Disconnected" UI)
- ✅ `currentRequestId` tracking for cancellation button
- ✅ `handleCancel()` sends cancel signal mid-stream per FR-008

---

#### 1.3 Add Reconnection Hook (Optional but Recommended)

**Location**: `apps/client/src/hooks/useReconnection.ts`

```typescript
import { useEffect, useRef } from 'react';

const RECONNECT_DELAYS = [1000, 2000, 4000]; // 1s, 2s, 4s per spec
const MAX_ATTEMPTS = 3;

export function useReconnection(
  isConnected: boolean,
  reconnectFn: () => void
) {
  const attemptRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isConnected) {
      attemptRef.current = 0; // Reset on successful connection
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // Disconnected - start reconnection attempts
    const attemptReconnect = () => {
      if (attemptRef.current >= MAX_ATTEMPTS) {
        console.error('[Reconnect Failed] Max attempts reached');
        return;
      }

      const delay = RECONNECT_DELAYS[attemptRef.current];
      console.log(`[Reconnecting] Attempt ${attemptRef.current + 1} in ${delay}ms`);

      timerRef.current = setTimeout(() => {
        reconnectFn(); // Trigger new WebSocket creation
        attemptRef.current++;
      }, delay);
    };

    attemptReconnect();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isConnected, reconnectFn]);
}
```

**Usage**:
```typescript
const [reconnectTrigger, setReconnectTrigger] = useState(0);

useReconnection(isConnected, () => setReconnectTrigger((prev) => prev + 1));

useEffect(() => {
  // WebSocket creation logic...
}, [threadId, reconnectTrigger]); // Recreate on reconnect trigger
```

---

### Phase 2: Update Server-Side (Fastify)

#### 2.1 Add ConnectionManager Class

**Location**: `apps/server/src/services/ConnectionManager.ts` (create new file)

```typescript
import type { WebSocket } from 'ws';

export interface ConnectionState {
  connectionId: string;
  threadId: string;
  socket: WebSocket;
  activeRequestId: string | null;
  abortController: AbortController | null;
}

export class ConnectionManager {
  private connections = new Map<string, ConnectionState>();

  register(connectionId: string, threadId: string, socket: WebSocket): void {
    this.connections.set(connectionId, {
      connectionId,
      threadId,
      socket,
      activeRequestId: null,
      abortController: null,
    });
  }

  get(connectionId: string): ConnectionState | undefined {
    return this.connections.get(connectionId);
  }

  setActiveRequest(connectionId: string, requestId: string, controller: AbortController): void {
    const state = this.connections.get(connectionId);
    if (state) {
      state.activeRequestId = requestId;
      state.abortController = controller;
    }
  }

  clearActiveRequest(connectionId: string): void {
    const state = this.connections.get(connectionId);
    if (state) {
      state.activeRequestId = null;
      state.abortController = null;
    }
  }

  abort(connectionId: string, requestId: string): boolean {
    const state = this.connections.get(connectionId);
    if (state?.activeRequestId === requestId && state.abortController) {
      state.abortController.abort();
      this.clearActiveRequest(connectionId);
      return true; // Cancellation successful
    }
    return false; // Already completed or different request active
  }

  unregister(connectionId: string): void {
    const state = this.connections.get(connectionId);
    if (state?.abortController) {
      state.abortController.abort(); // Cleanup on disconnect
    }
    this.connections.delete(connectionId);
  }
}
```

---

#### 2.2 Update WebSocket Route

**Location**: `apps/server/src/routes/chat.ts`

**Before (Spec 005)**:
```typescript
// OLD: One message per connection
fastify.get('/api/chat/ws', { websocket: true }, (connection, req) => {
  connection.socket.on('message', async (data: Buffer) => {
    const { content } = JSON.parse(data.toString());
    
    // Process message, stream response, then close
    await streamResponse(content, (token) => {
      connection.socket.send(JSON.stringify({ type: 'token', token }));
    });
    
    connection.socket.close(); // ❌ Close after every message
  });
});
```

**After (Spec 006)**:
```typescript
// NEW: Thread-persistent connection with multiplexing
import { ConnectionManager } from '@/services/ConnectionManager';
import type { ClientMessage, ServerEvent } from '@repo/chat-shared/schemas';

const connectionManager = new ConnectionManager();

fastify.get('/api/chat/ws', { websocket: true }, (connection, req) => {
  const { threadId } = req.query as { threadId: string };
  
  if (!threadId) {
    connection.socket.close(1008, 'Missing threadId parameter');
    return;
  }

  const connectionId = crypto.randomUUID();
  connectionManager.register(connectionId, threadId, connection.socket);

  connection.socket.on('message', async (data: Buffer) => {
    const clientMessage: ClientMessage = JSON.parse(data.toString());

    if (clientMessage.type === 'message') {
      await handleChatMessage(connectionId, clientMessage);
    } else if (clientMessage.type === 'cancel') {
      await handleCancellation(connectionId, clientMessage.requestId);
    }
  });

  connection.socket.on('close', () => {
    connectionManager.unregister(connectionId);
    fastify.log.info({ connectionId }, 'WebSocket connection closed');
  });
});

async function handleChatMessage(
  connectionId: string,
  message: ClientMessage & { type: 'message' }
) {
  const state = connectionManager.get(connectionId);
  if (!state) return;

  const { requestId, content, threadId } = message;
  const abortController = new AbortController();

  connectionManager.setActiveRequest(connectionId, requestId, abortController);

  try {
    // Stream LangGraph response with cancellation support
    for await (const chunk of agent.stream(
      { messages: [{ role: 'user', content }] },
      { configurable: { thread_id: threadId }, signal: abortController.signal }
    )) {
      const token = extractToken(chunk);
      const tokenEvent: ServerEvent = { type: 'token', requestId, token };
      state.socket.send(JSON.stringify(tokenEvent));
    }

    const finalEvent: ServerEvent = {
      type: 'final',
      requestId,
      response: { content: accumulatedContent, metadata: { tokensUsed: 0, latencyMs: 0 } },
    };
    state.socket.send(JSON.stringify(finalEvent));
  } catch (error) {
    if (error.name === 'AbortError') {
      // Cancellation handled in handleCancellation
      return;
    }

    const errorEvent: ServerEvent = {
      type: 'error',
      requestId,
      error: { code: 'AGENT_ERROR', message: error.message, retryable: true },
    };
    state.socket.send(JSON.stringify(errorEvent));
  } finally {
    connectionManager.clearActiveRequest(connectionId);
  }
}

async function handleCancellation(connectionId: string, requestId: string) {
  const cancelled = connectionManager.abort(connectionId, requestId);
  
  if (cancelled) {
    const state = connectionManager.get(connectionId);
    if (state) {
      const cancelledEvent: ServerEvent = { type: 'cancelled', requestId };
      state.socket.send(JSON.stringify(cancelledEvent));
    }
  }
  // If not cancelled (already completed), noop gracefully per spec FR-010
}
```

**Key Changes**:
- ✅ No `connection.socket.close()` after message (connection persists)
- ✅ `connectionManager` tracks multiple connections with state
- ✅ `AbortController` passed to `agent.stream()` for cancellation per research.md decision #2
- ✅ Idempotent cancellation (no error if requestId already completed) per FR-010

---

### Phase 3: Update Shared Schemas

**Location**: `packages/chat-shared/src/schemas/connection.ts` (create new file)

```typescript
import { z } from 'zod';

export const chatMessageSchema = z.object({
  type: z.literal('message'),
  requestId: z.string().uuid(),
  threadId: z.string().min(1),
  content: z.string().min(1),
});

export const cancellationSignalSchema = z.object({
  type: z.literal('cancel'),
  requestId: z.string().uuid(),
});

export const clientMessageSchema = z.union([
  chatMessageSchema,
  cancellationSignalSchema,
]);

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type CancellationSignal = z.infer<typeof cancellationSignalSchema>;
export type ClientMessage = z.infer<typeof clientMessageSchema>;
```

**Location**: `packages/chat-shared/src/schemas/chat.ts` (update existing)

```typescript
// Add requestId field to existing events
export const tokenEventSchema = z.object({
  type: z.literal('token'),
  requestId: z.string().uuid(), // NEW
  token: z.string(),
});

export const finalEventSchema = z.object({
  type: z.literal('final'),
  requestId: z.string().uuid(), // NEW
  response: z.object({
    content: z.string(),
    metadata: z.object({
      tokensUsed: z.number(),
      latencyMs: z.number(),
    }),
  }),
});

export const errorEventSchema = z.object({
  type: z.literal('error'),
  requestId: z.string().uuid(), // NEW
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean(),
  }),
});

export const cancelledEventSchema = z.object({ // NEW event type
  type: z.literal('cancelled'),
  requestId: z.string().uuid(),
});

export const serverEventSchema = z.union([
  tokenEventSchema,
  finalEventSchema,
  errorEventSchema,
  cancelledEventSchema, // NEW
]);

export type ServerEvent = z.infer<typeof serverEventSchema>;
```

---

## Testing Strategy

### Unit Tests (Client)

**Location**: `apps/client/src/hooks/__tests__/useThreadConnection.test.ts`

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { WS } from 'vitest-websocket-mock';
import { useThreadConnection } from '../useThreadConnection';

describe('useThreadConnection', () => {
  let ws: WS;

  beforeEach(() => {
    ws = new WS('ws://localhost:3000/api/chat/ws?threadId=test-thread');
  });

  afterEach(() => {
    WS.clean();
  });

  it('should establish connection on mount', async () => {
    const { result } = renderHook(() => useThreadConnection('test-thread'));

    await waitFor(() => expect(result.current.isConnected).toBe(true));
  });

  it('should send message with requestId', async () => {
    const { result } = renderHook(() => useThreadConnection('test-thread'));
    await waitFor(() => expect(result.current.isConnected).toBe(true));

    const requestId = result.current.sendMessage(
      'Hello',
      () => {},
      () => {},
      () => {}
    );

    const message = await ws.nextMessage;
    const parsed = JSON.parse(message as string);

    expect(parsed.type).toBe('message');
    expect(parsed.requestId).toBe(requestId);
    expect(parsed.content).toBe('Hello');
  });

  it('should handle cancellation', async () => {
    const { result } = renderHook(() => useThreadConnection('test-thread'));
    await waitFor(() => expect(result.current.isConnected).toBe(true));

    const requestId = result.current.sendMessage('Test', () => {}, () => {}, () => {});
    result.current.cancelMessage(requestId);

    const cancelSignal = await ws.nextMessage;
    const parsed = JSON.parse(cancelSignal as string);

    expect(parsed.type).toBe('cancel');
    expect(parsed.requestId).toBe(requestId);
  });
});
```

---

### Integration Tests (Server)

**Location**: `apps/server/src/routes/__tests__/chat.test.ts`

```typescript
import { WebSocket } from 'ws';
import { buildApp } from '@/app';

describe('WebSocket Chat Route', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let ws: WebSocket;

  beforeAll(async () => {
    app = await buildApp();
    await app.listen({ port: 0 });
  });

  afterAll(async () => {
    await app.close();
  });

  it('should persist connection across multiple messages', async () => {
    const port = app.server.address().port;
    ws = new WebSocket(`ws://localhost:${port}/api/chat/ws?threadId=test-thread`);

    await new Promise((resolve) => ws.once('open', resolve));

    // Send first message
    ws.send(JSON.stringify({
      type: 'message',
      requestId: 'req-1',
      threadId: 'test-thread',
      content: 'First message',
    }));

    const response1 = await new Promise((resolve) => ws.once('message', resolve));
    expect(JSON.parse(response1.toString()).requestId).toBe('req-1');

    // Send second message (same connection!)
    ws.send(JSON.stringify({
      type: 'message',
      requestId: 'req-2',
      threadId: 'test-thread',
      content: 'Second message',
    }));

    const response2 = await new Promise((resolve) => ws.once('message', resolve));
    expect(JSON.parse(response2.toString()).requestId).toBe('req-2');

    // Connection should still be open
    expect(ws.readyState).toBe(WebSocket.OPEN);
  });

  it('should abort LangGraph stream on cancellation', async () => {
    // ... (test AbortController integration)
  });
});
```

---

## Deployment Checklist

- [ ] **Client updated**: `useThreadConnection` hook implemented
- [ ] **Server updated**: `ConnectionManager` class added, route handles multiplexing
- [ ] **Schemas updated**: `requestId` added to all events, `cancelled` event added
- [ ] **Tests passing**: Client hook tests + server integration tests
- [ ] **Manual smoke test**: Connect, send multiple messages, cancel mid-stream, reconnect after disconnect
- [ ] **Monitoring**: Add `connectionId` + `requestId` to all logs (dual-ID logging per FR-016)
- [ ] **Backward compatibility**: Confirm existing clients without `requestId` are rejected gracefully

---

## Troubleshooting

### Issue: "Orphaned response" errors in console

**Cause**: Server sending events for requestId not in `inflightRequests` Map

**Fix**: Check that client doesn't clear requestId too early (only on final/error/cancelled)

---

### Issue: Cancellation not working

**Cause**: `AbortController.abort()` not propagating to LangGraph stream

**Fix**: Verify `signal` passed to `agent.stream()` config:
```typescript
agent.stream(input, {
  configurable: { thread_id: threadId },
  signal: abortController.signal, // ✅ Must be present
});
```

---

### Issue: Connection closes after first message

**Cause**: Leftover `connection.socket.close()` from spec 005

**Fix**: Remove all `ws.close()` calls except in cleanup (unmount/error)

---

## Next Steps

1. **Implement reconnection UI**: Show connection status indicator (🟢/🟡/🔴)
2. **Add telemetry**: Track cancellation rate, reconnection frequency (FR-016)
3. **Optimize reconnection**: Tune backoff delays based on production metrics
4. **Multi-tab support**: Coordinate WebSocket connections across browser tabs (out of scope for spec 006, future work)

---

## Reference Documentation

- **Message Protocol**: [`contracts/message-protocol.md`](./contracts/message-protocol.md)
- **Connection Lifecycle**: [`contracts/connection-lifecycle.md`](./contracts/connection-lifecycle.md)
- **Data Model**: [`data-model.md`](./data-model.md)
- **Technical Decisions**: [`research.md`](./research.md)
- **Full Specification**: [`spec.md`](./spec.md)

---

**Quickstart Complete** ✅  
Ready for implementation. Questions? See [spec.md](./spec.md) Clarifications section or open a discussion.
