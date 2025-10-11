# WebSocket Migration Quickstart Guide

**Feature**: Switch to WebSocket Communication Protocol  
**Audience**: Developers implementing the migration  
**Prerequisites**: Familiarity with Fastify, React hooks, and WebSocket basics

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Migration Overview](#migration-overview)
3. [Server Changes](#server-changes)
4. [Client Changes](#client-changes)
5. [Testing Steps](#testing-steps)
6. [Validation Checklist](#validation-checklist)
7. [Rollback Plan](#rollback-plan)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Knowledge
- Fastify WebSocket plugin usage
- React hooks (`useState`, `useEffect`, `useRef`)
- Browser WebSocket API
- Async generator patterns (existing LangGraph streaming)

### Environment Setup
```bash
# Install dependencies
pnpm install

# Ensure Docker Compose services running
docker-compose up -d

# Run database migrations (no schema changes, but verify)
pnpm prisma migrate deploy
```

### Branch & Tooling
```bash
# Create feature branch
git checkout -b 005-switch-to-websocket

# Verify test environment
pnpm test  # All existing tests should pass before changes
```

---

## Migration Overview

### What's Changing
- **Transport Protocol**: SSE (text/event-stream) → WebSocket (binary/text frames)
- **Connection Model**: One-way streaming → Bidirectional (client sends request, server streams response)
- **Lifecycle**: Long-lived SSE connection → One-message-per-connection WebSocket

### What's NOT Changing
- LangGraph streaming logic (`streamChat` AsyncGenerator)
- Existing Zod schemas (`ChatRequestSchema`, `AgentStreamEvent`)
- Thread/message persistence layer
- React UI components (except hook implementation)

### Migration Strategy
**Complete cutover** — No parallel SSE/WebSocket support (per research Decision 7).

---

## Server Changes

### Step 1: Install WebSocket Dependencies

**File**: `apps/server/package.json`

```bash
# Install Fastify WebSocket plugin
pnpm add @fastify/websocket --filter @cerebrobot/server

# Install ws types
pnpm add -D @types/ws --filter @cerebrobot/server
```

**Expected versions** (from research Decision 1):
- `@fastify/websocket`: ^11.0.1
- `ws`: ^8.18.0 (peer dependency)
- `@types/ws`: ^8.5.13

---

### Step 2: Register WebSocket Plugin

**File**: `apps/server/src/app.ts`

**Before** (SSE plugin):
```typescript
import fastifySse from 'fastify-sse-v2';

// In createApp() function
await app.register(fastifySse);
```

**After** (WebSocket plugin):
```typescript
import websocket from '@fastify/websocket';

// In createApp() function
await app.register(websocket, {
  options: {
    maxPayload: 1048576, // 1MB (per clarification Q3)
  },
});
```

**Verify**: Run `pnpm dev` and check logs for plugin registration.

---

### Step 3: Create WebSocket Route Handler

**File**: `apps/server/src/chat/routes.ts`

**Remove** (SSE implementation):
```typescript
// Delete these functions entirely
function handleSseResponse(/* ... */) { /* ... */ }
function writeSseEvent(/* ... */) { /* ... */ }
function createSsePayload(/* ... */) { /* ... */ }

// Delete SSE route
app.get('/api/chat/sse', { /* ... */ }, async (request, reply) => {
  // Delete entire handler
});
```

**Add** (WebSocket implementation):
```typescript
import type { WebSocket } from 'ws';
import { randomUUID } from 'node:crypto';

app.get('/api/chat/ws', { websocket: true }, async (socket, request) => {
  const correlationId = randomUUID();
  const logger = app.log.child({ correlationId });

  logger.info({ event: 'websocket_connected' }, 'WebSocket connection established');

  // Wait for client request message
  socket.on('message', async (data: Buffer) => {
    try {
      // Parse and validate request
      const messageText = data.toString('utf-8');
      const messageData = JSON.parse(messageText);
      const chatRequest = ChatRequestSchema.parse(messageData);

      // Validate message size (1MB limit)
      if (data.byteLength > 1048576) {
        const errorEvent = {
          type: 'error',
          message: 'Message exceeds maximum size of 1MB',
          retryable: false,
        };
        socket.send(JSON.stringify(errorEvent));
        socket.close(1000, 'Message too large');
        return;
      }

      // Call existing LangGraph stream
      const stream = await streamChat({
        threadId: chatRequest.threadId,
        userId: chatRequest.userId,
        message: chatRequest.message,
      });

      // Stream token events
      let tokenCount = 0;
      for await (const event of stream) {
        if (event.type === 'token') {
          socket.send(JSON.stringify({ type: 'token', value: event.value }));
          tokenCount++;
        } else if (event.type === 'final') {
          socket.send(JSON.stringify({
            type: 'final',
            message: event.message,
            latencyMs: event.latencyMs,
            tokenUsage: event.tokenUsage,
          }));

          logger.info({
            event: 'websocket_stream_complete',
            threadId: chatRequest.threadId,
            tokenCount,
            latencyMs: event.latencyMs,
            tokenUsage: event.tokenUsage,
          }, 'WebSocket stream completed');
        }
      }

      // Normal closure
      socket.close(1000, 'Stream complete');

    } catch (err) {
      // Handle errors
      const isRetryable = !(err instanceof ZodError); // Validation errors not retryable
      const errorEvent = {
        type: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
        retryable: isRetryable,
      };

      logger.error({
        event: 'websocket_error',
        err,
        retryable: isRetryable,
      }, 'WebSocket error occurred');

      socket.send(JSON.stringify(errorEvent));
      socket.close(isRetryable ? 1011 : 1000, 'Error processing request');
    }
  });

  socket.on('close', (code, reason) => {
    logger.info({
      event: 'websocket_closed',
      closeCode: code,
      reason: reason.toString(),
    }, 'WebSocket connection closed');
  });

  socket.on('error', (err) => {
    logger.error({
      event: 'websocket_error',
      err,
    }, 'WebSocket connection error');
  });
});
```

**Key Points**:
- One message listener per connection (one-message-per-connection lifecycle)
- Reuses existing `streamChat()` from LangGraph agent
- Structured logging with correlation ID
- 1MB validation before processing
- Close codes: 1000 (normal), 1011 (server error), 1006 (abnormal - implicit)

---

### Step 4: Remove SSE Dependencies

**File**: `apps/server/package.json`

```bash
# Uninstall SSE plugin
pnpm remove fastify-sse-v2 --filter @cerebrobot/server
```

**Verify**: Check `package.json` has no references to `fastify-sse-v2`.

---

## Client Changes

### Step 1: Replace SSE Hook with WebSocket

**File**: `apps/client/src/hooks/useChatMessages.ts`

**Remove** (SSE implementation):
```typescript
// Delete these functions entirely
async function consumeSse(/* ... */) { /* ... */ }
function processSseChunk(/* ... */) { /* ... */ }

// Delete fetch() + ReadableStream logic in sendMessage()
```

**Add** (WebSocket implementation):
```typescript
const sendMessage = async (messageText: string) => {
  setIsStreaming(true);
  setStreamedResponse('');

  const ws = new WebSocket('ws://localhost:3030/api/chat/ws');
  const wsRef = useRef<WebSocket | null>(null);

  ws.onopen = () => {
    // Send chat request
    const request = {
      threadId: currentThreadId,
      userId: currentUserId,
      message: messageText,
      correlationId: crypto.randomUUID(),
    };
    ws.send(JSON.stringify(request));
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.type === 'token') {
        // Append token to streaming response
        setStreamedResponse((prev) => prev + data.value);

      } else if (data.type === 'final') {
        // Replace with authoritative final message
        setStreamedResponse(data.message);
        setIsStreaming(false);

        // Update local state with metadata
        setLastTokenUsage(data.tokenUsage);
        setLastLatencyMs(data.latencyMs);

      } else if (data.type === 'error') {
        // Display error and stop streaming
        setError(data.message);
        setIsStreaming(false);
        setStreamedResponse(''); // Discard partial message (per clarification Q2)
      }
    } catch (err) {
      console.error('Failed to parse WebSocket message:', err);
      setError('Failed to parse server response');
      setIsStreaming(false);
    }
  };

  ws.onerror = (event) => {
    console.error('WebSocket error:', event);
    setError('Connection error occurred');
    setIsStreaming(false);
    setStreamedResponse(''); // Discard partial message
  };

  ws.onclose = (event) => {
    if (event.code !== 1000 && !event.wasClean) {
      // Abnormal closure - discard partial message
      setStreamedResponse('');
      setError('Connection closed unexpectedly');
    }
    setIsStreaming(false);
  };

  // Cleanup on unmount
  wsRef.current = ws;
  return () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close(1000, 'Component unmounted');
    }
  };
};
```

**Key Points**:
- Browser native WebSocket API (no libraries needed)
- Discard `streamedResponse` on error or abnormal close (per clarification Q2)
- Replace accumulated text with `final.message` (authoritative)
- Connection auto-closes after server sends final event
- Cleanup handler for React unmount

---

### Step 2: Update Environment Variables

**File**: `apps/client/.env` (or `.env.local`)

```bash
# Change SSE endpoint to WebSocket endpoint
VITE_WS_URL=ws://localhost:3030/api/chat/ws

# For production (wss:// with TLS)
# VITE_WS_URL=wss://cerebrobot.example.com/api/chat/ws
```

**Usage in code**:
```typescript
const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3030/api/chat/ws';
const ws = new WebSocket(wsUrl);
```

---

## Testing Steps

### Unit Tests (Server)

**File**: `apps/server/src/chat/routes.test.ts`

**Add dependency**:
```bash
pnpm add -D vitest-websocket-mock --filter @cerebrobot/server
```

**Example test**:
```typescript
import { WS } from 'vitest-websocket-mock';

describe('WebSocket chat route', () => {
  let mockWs: WS;

  beforeEach(() => {
    mockWs = new WS('ws://localhost:3030/api/chat/ws');
  });

  afterEach(() => {
    WS.clean();
  });

  it('should stream token events and final event', async () => {
    const client = new WebSocket('ws://localhost:3030/api/chat/ws');
    await mockWs.connected;

    // Send request
    client.send(JSON.stringify({
      threadId: 'thread-123',
      userId: 'user-456',
      message: 'Hello',
    }));

    // Verify server responses
    await expect(mockWs).toReceiveMessage({ type: 'token', value: 'hello' });
    await expect(mockWs).toReceiveMessage({
      type: 'final',
      message: 'hello world',
      latencyMs: expect.any(Number),
    });

    expect(client.readyState).toBe(WebSocket.CLOSED);
  });

  it('should send error event on invalid threadId', async () => {
    const client = new WebSocket('ws://localhost:3030/api/chat/ws');
    await mockWs.connected;

    client.send(JSON.stringify({
      threadId: 'invalid-thread',
      userId: 'user-456',
      message: 'Hello',
    }));

    await expect(mockWs).toReceiveMessage({
      type: 'error',
      message: expect.stringContaining('Thread not found'),
      retryable: false,
    });
  });
});
```

**Run tests**:
```bash
pnpm test --filter @cerebrobot/server
```

---

### Unit Tests (Client)

**File**: `apps/client/src/hooks/useChatMessages.test.ts`

```typescript
import { renderHook, act } from '@testing-library/react';
import { WS } from 'vitest-websocket-mock';
import { useChatMessages } from './useChatMessages';

describe('useChatMessages WebSocket hook', () => {
  let mockWs: WS;

  beforeEach(() => {
    mockWs = new WS('ws://localhost:3030/api/chat/ws');
  });

  afterEach(() => {
    WS.clean();
  });

  it('should accumulate streamed tokens', async () => {
    const { result } = renderHook(() => useChatMessages());

    act(() => {
      result.current.sendMessage('Test message');
    });

    await mockWs.connected;

    // Simulate server streaming
    act(() => {
      mockWs.send(JSON.stringify({ type: 'token', value: 'hello' }));
      mockWs.send(JSON.stringify({ type: 'token', value: ' ' }));
      mockWs.send(JSON.stringify({ type: 'token', value: 'world' }));
    });

    expect(result.current.streamedResponse).toBe('hello world');
  });

  it('should replace accumulated text with final message', async () => {
    const { result } = renderHook(() => useChatMessages());

    act(() => {
      result.current.sendMessage('Test message');
    });

    await mockWs.connected;

    // Accumulate tokens
    act(() => {
      mockWs.send(JSON.stringify({ type: 'token', value: 'partial' }));
    });

    // Send final (may differ from accumulated)
    act(() => {
      mockWs.send(JSON.stringify({
        type: 'final',
        message: 'complete final response',
        latencyMs: 1234,
      }));
    });

    expect(result.current.streamedResponse).toBe('complete final response');
    expect(result.current.isStreaming).toBe(false);
  });

  it('should discard partial message on error', async () => {
    const { result } = renderHook(() => useChatMessages());

    act(() => {
      result.current.sendMessage('Test message');
    });

    await mockWs.connected;

    // Accumulate partial response
    act(() => {
      mockWs.send(JSON.stringify({ type: 'token', value: 'partial text' }));
    });

    // Send error
    act(() => {
      mockWs.send(JSON.stringify({
        type: 'error',
        message: 'LLM timeout',
        retryable: true,
      }));
    });

    expect(result.current.streamedResponse).toBe(''); // Discarded
    expect(result.current.error).toBe('LLM timeout');
  });
});
```

**Run tests**:
```bash
pnpm test --filter @cerebrobot/client
```

---

### Manual Smoke Tests

#### Test 1: Normal Streaming Flow
1. Start dev server: `pnpm dev`
2. Open browser: `http://localhost:3030`
3. Open DevTools → Network tab → WS filter
4. Send chat message: "Explain WebSockets in one sentence"
5. **Verify**:
   - WebSocket connection shows in Network tab
   - Frame-by-frame messages visible (token events)
   - Final message replaces streaming text
   - Connection closes with code 1000
   - Latency and token usage displayed

#### Test 2: Error Handling
1. Send message with invalid threadId (edit request in DevTools)
2. **Verify**:
   - Error event received
   - Error message displayed in UI
   - No retry button (retryable: false)
   - Partial text discarded (if any)

#### Test 3: Network Interruption
1. Send chat message
2. During streaming, disconnect network (DevTools → Network → Offline)
3. **Verify**:
   - Connection closes (code 1006 abnormal)
   - Partial message discarded
   - Error message displayed
   - Retry button available (if retryable error logic added)

#### Test 4: Concurrent Connections
1. Open 5 browser tabs to same chat UI
2. Send messages from each tab simultaneously
3. **Verify**:
   - All 5 streams complete successfully
   - No connection rejections
   - Server logs show 5 concurrent connections

#### Test 5: Large Message
1. Send message >1MB (paste large text block)
2. **Verify**:
   - Error event: "Message exceeds maximum size"
   - retryable: false
   - Connection closes gracefully

---

## Validation Checklist

### Pre-Migration
- [ ] All existing tests pass (`pnpm test`)
- [ ] Existing SSE flow works in browser
- [ ] Feature branch created (`005-switch-to-websocket`)

### Server Implementation
- [ ] `@fastify/websocket` installed and registered
- [ ] `fastify-sse-v2` uninstalled
- [ ] WebSocket route handler created (`/api/chat/ws`)
- [ ] SSE route handler removed (`/api/chat/sse`)
- [ ] SSE utility functions deleted (`handleSseResponse`, etc.)
- [ ] 1MB message validation implemented
- [ ] Structured logging added (correlationId, lifecycle events)
- [ ] Error handling covers validation, LLM failures, network issues

### Client Implementation
- [ ] WebSocket connection logic added to `useChatMessages` hook
- [ ] SSE consumption logic removed (`consumeSse`, `processSseChunk`)
- [ ] Token accumulation working
- [ ] Final message replacement working
- [ ] Partial message discard on error/disconnect
- [ ] Environment variable updated (`VITE_WS_URL`)

### Testing
- [ ] Server unit tests pass (vitest-websocket-mock)
- [ ] Client unit tests pass (vitest-websocket-mock)
- [ ] Manual smoke test 1: Normal streaming ✓
- [ ] Manual smoke test 2: Error handling ✓
- [ ] Manual smoke test 3: Network interruption ✓
- [ ] Manual smoke test 4: Concurrent connections ✓
- [ ] Manual smoke test 5: Large message rejection ✓

### Hygiene Loop
- [ ] `pnpm lint` passes (no warnings)
- [ ] `pnpm format:write` applied
- [ ] `pnpm test` passes (all workspaces)

### Documentation
- [ ] Update `docs/tech-stack.md` (add @fastify/websocket, remove fastify-sse-v2)
- [ ] Update `AGENTS.md` copilot instructions (if applicable)
- [ ] Add ADR documenting WebSocket migration decision

---

## Rollback Plan

### If Migration Fails

**Step 1: Revert Git Branch**
```bash
git checkout main
git branch -D 005-switch-to-websocket
```

**Step 2: Verify SSE Restoration**
- Start server: `pnpm dev`
- Test SSE endpoint manually
- Check all existing tests pass

**Step 3: Document Issues**
- Create incident report in `docs/decisions/incidents/`
- Capture error logs and failure scenarios
- Plan remediation before retry

### Partial Rollback (Server Only)
If client changes work but server fails:
```bash
# Revert server changes
git checkout main -- apps/server/src/chat/routes.ts
git checkout main -- apps/server/package.json
pnpm install
```

### Partial Rollback (Client Only)
If server changes work but client fails:
```bash
# Revert client changes
git checkout main -- apps/client/src/hooks/useChatMessages.ts
git checkout main -- apps/client/.env
```

---

## Troubleshooting

### Issue: WebSocket Connection Fails (Browser Console)

**Symptoms**:
```
WebSocket connection to 'ws://localhost:3030/api/chat/ws' failed
```

**Causes**:
1. Fastify WebSocket plugin not registered
2. Server not listening on expected port
3. CORS issues (if client on different origin)

**Solutions**:
```typescript
// Verify plugin registration in app.ts
await app.register(websocket, { /* options */ });

// Check server logs for plugin initialization
// Should see: "Plugin: @fastify/websocket registered"

// Verify CORS settings if cross-origin
await app.register(cors, {
  origin: true, // or specific origin
  credentials: true,
});
```

---

### Issue: Messages Not Streaming (Hanging)

**Symptoms**:
- Connection opens
- No token events received
- UI shows "Loading..." indefinitely

**Causes**:
1. Client not sending request message
2. Server not listening for `message` event
3. LangGraph stream not yielding events

**Debugging**:
```typescript
// Add server logging
socket.on('message', (data) => {
  console.log('Received message:', data.toString());
  // ... rest of handler
});

// Add client logging
ws.onopen = () => {
  console.log('WebSocket opened, sending request...');
  ws.send(JSON.stringify(request));
};

ws.onmessage = (event) => {
  console.log('Received message:', event.data);
  // ... rest of handler
};
```

---

### Issue: Partial Message Not Discarded on Error

**Symptoms**:
- Error occurs mid-stream
- UI still shows partial accumulated text

**Cause**: Client not resetting `streamedResponse` state

**Solution**:
```typescript
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'error') {
    setStreamedResponse(''); // ← Add this line
    setError(data.message);
    setIsStreaming(false);
  }
};

ws.onerror = () => {
  setStreamedResponse(''); // ← Add this line
  setError('Connection error');
};
```

---

### Issue: Unit Tests Fail with vitest-websocket-mock

**Symptoms**:
```
Error: WebSocket connection timed out
```

**Causes**:
1. Mock server not started before client connection
2. URL mismatch between mock and client

**Solution**:
```typescript
beforeEach(() => {
  // Ensure mock server created BEFORE tests run
  mockWs = new WS('ws://localhost:3030/api/chat/ws');
});

afterEach(() => {
  // Clean up all mock servers
  WS.clean();
});

it('should connect', async () => {
  const client = new WebSocket('ws://localhost:3030/api/chat/ws');
  await mockWs.connected; // Wait for connection before assertions
  // ...
});
```

---

### Issue: 1MB Message Limit Not Enforced

**Symptoms**:
- Large messages accepted without error

**Cause**: Validation logic not checking byte size

**Solution**:
```typescript
socket.on('message', async (data: Buffer) => {
  // Check BEFORE parsing JSON
  if (data.byteLength > 1048576) {
    const errorEvent = {
      type: 'error',
      message: 'Message exceeds maximum size of 1MB',
      retryable: false,
    };
    socket.send(JSON.stringify(errorEvent));
    socket.close(1000, 'Message too large');
    return; // ← Important: early return
  }

  // ... rest of handler
});
```

---

### Issue: New Message Sent While Previous Response Streaming

**Symptoms**:
- User sends new message before previous response completes
- Unclear whether previous stream should continue or be cancelled

**Expected Behavior** (per FR-013):
Client MUST close existing WebSocket connection before establishing new one (one-message-per-connection pattern).

**Solution**:
```typescript
const sendMessage = async (messageText: string) => {
  // Close existing connection if still open
  if (wsRef.current?.readyState === WebSocket.OPEN) {
    wsRef.current.close(1000, 'New message initiated');
  }

  setIsStreaming(true);
  setStreamedResponse(''); // Discard previous partial response

  // Establish new connection
  const ws = new WebSocket(wsUrl);
  wsRef.current = ws;
  
  // ... rest of handler
};
```

**Key Points**:
- Previous stream terminates immediately when new message sent
- Partial response from previous stream discarded
- Clean one-message-per-connection lifecycle maintained
- User sees new response replacing old partial response

---

## Next Steps After Successful Migration

1. **Update Documentation**:
   - [ ] Add WebSocket protocol to API documentation
   - [ ] Update architecture diagrams
   - [ ] Document new dependencies in tech stack

2. **Monitor in Production**:
   - [ ] Check Pino logs for WebSocket lifecycle events
   - [ ] Verify no SSE-related errors in logs
   - [ ] Monitor connection counts and durations

3. **Cleanup**:
   - [ ] Remove SSE-related code comments
   - [ ] Archive SSE tests (don't delete, for reference)
   - [ ] Remove SSE environment variables

4. **Future Enhancements** (out of scope for this migration):
   - [ ] Add automatic reconnection logic
   - [ ] Implement ping/pong heartbeat
   - [ ] Add connection pooling (if multi-message needed)
   - [ ] Add rate limiting (if multi-user needed)

---

## Additional Resources

- **WebSocket Protocol Contract**: `specs/005-switch-to-websocket/contracts/websocket-protocol.md`
- **Data Model**: `specs/005-switch-to-websocket/data-model.md`
- **Research Decisions**: `specs/005-switch-to-websocket/research.md`
- **Fastify WebSocket Docs**: https://github.com/fastify/fastify-websocket
- **MDN WebSocket API**: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- **RFC 6455 (WebSocket Protocol)**: https://datatracker.ietf.org/doc/html/rfc6455
- **vitest-websocket-mock Docs**: https://github.com/romgain/vitest-websocket-mock

---

**Questions?** Refer to feature spec or create discussion in `specs/005-switch-to-websocket/` directory.
