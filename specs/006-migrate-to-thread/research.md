# Research & Technical Decisions: Thread-Persistent WebSocket Connections

**Feature**: 006-migrate-to-thread  
**Date**: October 11, 2025  
**Phase**: 0 (Research)

## Overview

This document resolves all technical unknowns identified in the Technical Context section of `plan.md`. Each decision includes rationale, alternatives considered, and implications for implementation.

---

## Decision 1: UUID Generation for RequestId

**Context**: Client and server need to generate unique requestId values for message correlation (FR-004, FR-005). Single-user deployment with 1-5 concurrent connections creates low collision risk, but uniqueness is critical for correct request/response matching.

**Decision**: Use Node.js built-in `crypto.randomUUID()` for server-side generation, browser built-in `crypto.randomUUID()` for client-side generation

**Rationale**:
- Available in Node.js 14.17.0+ and all modern browsers (Chrome 92+, Firefox 95+, Safari 15.4+) without additional dependencies
- Generates RFC 4122 v4 UUIDs (128-bit random values with ~zero collision probability)
- No npm package overhead (eliminates `uuid` package dependency)
- Synchronous API simplifies request flow (no async overhead for ID generation)
- Aligns with Constitution Principle V (Stack Discipline) - prefer built-ins over external dependencies

**Alternatives Considered**:
- ❌ `uuid` npm package: Adds dependency for functionality already built into platform
- ❌ Custom timestamp + counter: More complex, requires state management, not RFC-compliant
- ❌ Server-generated only: Adds round-trip latency for client to get requestId before sending message

**Implementation Notes**:
- Client: `const requestId = crypto.randomUUID()`
- Server: `const requestId = crypto.randomUUID()` (only needed if server initiates requests, unlikely for this feature)
- Fallback not required (target browsers all support this API per spec assumptions)

---

## Decision 2: AbortController Integration with LangGraph

**Context**: Server must terminate in-progress LangGraph streams when receiving cancellation messages (FR-008). Need to verify @langchain/langgraph 0.4.9 supports AbortController/AbortSignal pattern.

**Decision**: Use standard AbortController pattern with LangGraph streaming methods; pass AbortSignal to `agent.stream()` call

**Rationale**:
- LangGraph (via @langchain/core) supports AbortSignal in streaming APIs following web standards
- Pattern: `const controller = new AbortController(); const stream = agent.stream(input, { signal: controller.signal }); controller.abort();`
- Calling `controller.abort()` triggers stream termination and raises AbortError in the generator
- Standard Node.js/browser API (AbortController available in Node.js 15+ and all modern browsers)
- Clean integration: no custom cancellation mechanism needed

**Alternatives Considered**:
- ❌ Custom cancellation tokens: Reinvents standard pattern, harder to test
- ❌ Promise.race() with timeout: Doesn't actually terminate LangGraph processing, just abandons stream
- ❌ Generator manual exit: Requires wrapping every LangGraph call, fragile

**Implementation Notes**:
- Store AbortController in per-connection state (Connection State entity per data model)
- On cancellation message: call `controller.abort()`, catch AbortError, send acknowledgment
- On natural completion: cleanup controller to prevent memory leaks
- Test with mock AbortSignal to verify cleanup paths

**Verification Required**: Confirm AbortSignal support in actual LangGraph streaming during implementation (assumption #5 in spec)

---

## Decision 3: React Hook Patterns for Persistent WebSocket Connections

**Context**: Client must maintain WebSocket connection reference across React renders (FR-012), properly cleanup on unmount (FR-018), and avoid memory leaks. Need patterns for useRef + useEffect with WebSocket lifecycle.

**Decision**: Implement custom `useThreadConnection` hook using useRef for WebSocket instance and useEffect for mount/unmount lifecycle

**Pattern**:
```typescript
function useThreadConnection(threadId: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  
  useEffect(() => {
    // Mount: establish connection
    const ws = new WebSocket(`${WS_URL}?threadId=${threadId}`);
    wsRef.current = ws;
    
    ws.onopen = () => setConnectionState('connected');
    ws.onclose = () => setConnectionState('disconnected');
    ws.onerror = (error) => handleError(error);
    ws.onmessage = (event) => handleMessage(event);
    
    // Unmount: cleanup
    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(1000, 'Component unmounted');
      }
      wsRef.current = null;
    };
  }, [threadId]); // Re-establish on threadId change
  
  return { ws: wsRef.current, connectionState };
}
```

**Rationale**:
- useRef persists WebSocket across renders without triggering re-renders
- useEffect cleanup function ensures connection closed on unmount (satisfies FR-018)
- Dependency array `[threadId]` handles thread switching (close old, open new)
- State management via useState for UI rendering (reconnecting indicator, disabled input during disconnection)
- Standard React patterns (no external WebSocket wrapper libraries needed)

**Alternatives Considered**:
- ❌ useState for WebSocket: Triggers re-renders on assignment, doesn't persist across renders correctly
- ❌ External library (e.g., react-use-websocket): Adds dependency, may not support thread-specific lifecycle needs
- ❌ Class component: Adds complexity, React hooks preferred pattern

**Implementation Notes**:
- Separate hook for reconnection logic (`useReconnection`) to maintain single responsibility
- Message handling delegated to `useChatMessages` hook (already exists, modify for requestId correlation)
- Test useEffect cleanup with React Testing Library: unmount component, verify WebSocket.close() called

---

## Decision 4: Exponential Backoff Reconnection Implementation

**Context**: Client must implement exponential backoff for automatic reconnection (clarification Q2: 3 attempts at [1s, 2s, 4s]). Need pattern for timing, attempt tracking, and manual retry fallback.

**Decision**: Implement `useReconnection` hook with state machine pattern tracking attempt count, delays, and transition to manual-only mode

**Pattern**:
```typescript
function useReconnection(onReconnect: () => void) {
  const [attempts, setAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const delays = [1000, 2000, 4000]; // ms
  
  const attemptReconnect = useCallback(() => {
    if (attempts >= delays.length) {
      setIsReconnecting(false); // Exhausted auto-retry
      return;
    }
    
    setIsReconnecting(true);
    const delay = delays[attempts];
    
    setTimeout(() => {
      onReconnect();
      setAttempts(prev => prev + 1);
    }, delay);
  }, [attempts, onReconnect]);
  
  const resetAttempts = () => setAttempts(0);
  const manualRetry = () => {
    resetAttempts();
    onReconnect();
  };
  
  return { attemptReconnect, resetAttempts, manualRetry, isReconnecting, attempts, maxAttempts: delays.length };
}
```

**Rationale**:
- Fixed delay array `[1000, 2000, 4000]` matches clarification Q2 specification exactly
- State machine prevents overlapping reconnection attempts
- Clear separation: auto-retry (attempts < 3) vs manual-only (attempts >= 3)
- `resetAttempts()` called on successful connection to restart backoff for future failures
- Testable: setTimeout can be mocked for deterministic unit tests

**Alternatives Considered**:
- ❌ Recursive setTimeout: Harder to test, unclear state transitions
- ❌ setInterval: Doesn't support varying delays for exponential backoff
- ❌ External retry library: Adds dependency for simple fixed-delay pattern

**Implementation Notes**:
- Integrate with `useThreadConnection`: call `attemptReconnect()` on `ws.onclose` event (if not intentional unmount)
- UI displays attempt count during reconnection: "Reconnecting... (attempt 2/3)"
- Manual retry button appears only after attempts exhausted (attempts >= 3)
- Success criteria SC-009: 95% success within 5 seconds for transient failures (7 seconds total auto-retry window validates this)

---

## Decision 5: WebSocket Message Correlation Best Practices

**Context**: System must correlate responses to requests over multiplexed connection using requestId echo (FR-005). Need pattern for client-side tracking of in-flight requests and matching incoming events.

**Decision**: Client maintains `Map<requestId, RequestHandler>` tracking in-flight requests; server echoes requestId in every response event

**Client Pattern**:
```typescript
interface RequestHandler {
  onToken: (token: string) => void;
  onFinal: (response: FinalResponse) => void;
  onError: (error: ErrorEvent) => void;
  onCancelled: () => void;
}

const inflightRequests = useRef<Map<string, RequestHandler>>(new Map());

function sendMessage(content: string) {
  const requestId = crypto.randomUUID();
  
  inflightRequests.current.set(requestId, {
    onToken: (token) => appendToMessage(requestId, token),
    onFinal: (response) => finalizeMessage(requestId, response),
    onError: (error) => handleError(requestId, error),
    onCancelled: () => handleCancellation(requestId),
  });
  
  ws.send(JSON.stringify({ type: 'message', requestId, content }));
}

function handleIncomingEvent(event: WebSocketEvent) {
  const { requestId, type, ...payload } = JSON.parse(event.data);
  const handler = inflightRequests.current.get(requestId);
  
  if (!handler) {
    console.error(`Orphaned response for requestId: ${requestId}`);
    return; // Edge case: unrecognized requestId
  }
  
  switch (type) {
    case 'token': handler.onToken(payload.token); break;
    case 'final': handler.onFinal(payload); inflightRequests.current.delete(requestId); break;
    case 'error': handler.onError(payload); inflightRequests.current.delete(requestId); break;
    case 'cancelled': handler.onCancelled(); inflightRequests.current.delete(requestId); break;
  }
}
```

**Server Pattern**:
```typescript
// Extract requestId from incoming message
const { requestId, content } = JSON.parse(message);

// Echo requestId in every response event
for await (const chunk of agent.stream(content, { signal: abortSignal })) {
  ws.send(JSON.stringify({ type: 'token', requestId, token: chunk }));
}
ws.send(JSON.stringify({ type: 'final', requestId, response: finalData }));
```

**Rationale**:
- Map structure provides O(1) lookup for requestId correlation
- useRef prevents Map recreation on re-renders
- Server echo pattern is simple: destructure requestId from input, include in every output event
- Cleanup on final/error/cancelled prevents memory leaks
- Orphaned response handling prevents crashes (edge case per spec)

**Alternatives Considered**:
- ❌ Global request queue: Doesn't support concurrent requests (User Story 3)
- ❌ Correlation by timestamp: Fragile, race conditions, not guaranteed unique
- ❌ Server-assigned requestId: Adds round-trip latency, client can't pre-generate

**Implementation Notes**:
- Cancellation clears in-flight request before sending new message (prevents orphaned response)
- Test edge case: server sends response for unknown requestId → client logs error, doesn't crash
- Backward compatibility (FR-006): existing event types unchanged, only add requestId field

---

## Decision 6: Server-Side Per-Connection State Management

**Context**: Server must track per-connection state including connectionId, active requestId, abort controller, and metrics (FR-011, FR-020, FR-021). Need pattern for lifecycle management and cleanup.

**Decision**: Implement `ConnectionManager` class maintaining `Map<connectionId, ConnectionState>` with lifecycle hooks for connection events

**Pattern**:
```typescript
interface ConnectionState {
  connectionId: string;
  threadId: string;
  userId: string | null; // Null until authentication implemented
  activeRequestId: string | null;
  abortController: AbortController | null;
  messageCount: number;
  connectedAt: Date;
}

class ConnectionManager {
  private connections = new Map<string, ConnectionState>();
  
  onCreate(ws: WebSocket, threadId: string): string {
    const connectionId = crypto.randomUUID();
    this.connections.set(connectionId, {
      connectionId,
      threadId,
      userId: null, // Deferred per clarification Q4
      activeRequestId: null,
      abortController: null,
      messageCount: 0,
      connectedAt: new Date(),
    });
    logger.info({ connectionId, threadId }, 'Connection established');
    return connectionId;
  }
  
  onMessage(connectionId: string, requestId: string): AbortController {
    const state = this.connections.get(connectionId);
    if (!state) throw new Error(`Unknown connection: ${connectionId}`);
    
    // Cancel previous request if still active
    if (state.abortController) {
      state.abortController.abort();
      logger.info({ connectionId, cancelledRequestId: state.activeRequestId }, 'Request cancelled');
    }
    
    const controller = new AbortController();
    state.activeRequestId = requestId;
    state.abortController = controller;
    state.messageCount++;
    
    return controller;
  }
  
  onComplete(connectionId: string, requestId: string) {
    const state = this.connections.get(connectionId);
    if (state?.activeRequestId === requestId) {
      state.activeRequestId = null;
      state.abortController = null;
    }
  }
  
  onClose(connectionId: string) {
    const state = this.connections.get(connectionId);
    if (state) {
      const duration = Date.now() - state.connectedAt.getTime();
      logger.info({ connectionId, messageCount: state.messageCount, durationMs: duration }, 'Connection closed');
      this.connections.delete(connectionId);
    }
  }
}
```

**Rationale**:
- Centralized state management prevents scattered state across route handlers
- Map provides O(1) access by connectionId
- Lifecycle methods (onCreate, onMessage, onComplete, onClose) match WebSocket events
- Auto-cancellation on new message implements FR-007 (cancel previous request before processing new one)
- Metrics collection (messageCount, duration) satisfies FR-021
- Dual-ID logging (connectionId + requestId) satisfies FR-020

**Alternatives Considered**:
- ❌ WeakMap keyed by WebSocket instance: Doesn't survive WebSocket replacement on reconnection
- ❌ Per-request state only: Loses connection-level metrics and lifecycle tracking
- ❌ Database persistence: Overkill for in-memory ephemeral state (single-user deployment)

**Implementation Notes**:
- Inject ConnectionManager into route handler via Fastify plugin/decorator pattern
- Test cleanup: verify onClose removes connection from Map (no memory leaks)
- Test cancellation: verify new message aborts previous controller
- Log structured JSON (Pino) with connectionId, threadId, requestId in every log entry

---

## Decision 7: Client-Side RequestId Generation and In-Flight Request Management

**Context**: Client must generate unique requestIds (FR-004), track in-flight requests to prevent double-submission (FR-013), and handle cancellation when sending new message during active response.

**Decision**: Extend `useChatMessages` hook to generate requestId per message, track isStreaming flag, and implement cancellation-before-send pattern

**Pattern** (building on Decision 5):
```typescript
function useChatMessages(ws: WebSocket | null) {
  const inflightRequests = useRef<Map<string, RequestHandler>>(new Map());
  const [isStreaming, setIsStreaming] = useState(false);
  const currentRequestId = useRef<string | null>(null);
  
  const sendMessage = useCallback((content: string) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error('Connection not ready');
    }
    
    // Cancel previous request if still streaming
    if (isStreaming && currentRequestId.current) {
      ws.send(JSON.stringify({ type: 'cancel', requestId: currentRequestId.current }));
      inflightRequests.current.delete(currentRequestId.current);
    }
    
    const requestId = crypto.randomUUID();
    currentRequestId.current = requestId;
    setIsStreaming(true);
    
    inflightRequests.current.set(requestId, {
      onToken: (token) => { /* append token */ },
      onFinal: (response) => { setIsStreaming(false); currentRequestId.current = null; /* cleanup */ },
      onError: (error) => { setIsStreaming(false); currentRequestId.current = null; /* cleanup */ },
      onCancelled: () => { setIsStreaming(false); currentRequestId.current = null; /* cleanup */ },
    });
    
    ws.send(JSON.stringify({ type: 'message', requestId, content }));
  }, [ws, isStreaming]);
  
  const handleMessage = useCallback((event: MessageEvent) => {
    const { requestId, type, ...payload } = JSON.parse(event.data);
    const handler = inflightRequests.current.get(requestId);
    
    if (!handler) {
      console.error(`Orphaned response for requestId: ${requestId}`);
      return;
    }
    
    // Delegate to handler based on event type...
  }, []);
  
  return { sendMessage, isStreaming };
}
```

**Rationale**:
- Single source of truth for isStreaming flag (prevents double-submission per FR-013)
- currentRequestId ref tracks active request for cancellation
- Cancellation-before-send pattern (FR-007): send cancel message, cleanup handler, then send new message
- RequestId generation embedded in send flow (crypto.randomUUID() per Decision 1)
- Cleanup on final/error/cancelled sets isStreaming = false, enabling next message

**Alternatives Considered**:
- ❌ Separate cancellation function: Adds API surface, send already knows when to cancel
- ❌ Queue messages during streaming: Complex state management, not required by spec
- ❌ Disable input during streaming: UX handled by isStreaming flag passed to UI components

**Implementation Notes**:
- UI components read isStreaming to disable send button during active response
- Test cancellation flow: send message, immediately send second message, verify cancel event sent first
- Test double-submission prevention: verify sendMessage throws/noops when isStreaming=true and user bypasses UI disable
- Edge case (spec): cancellation after natural completion handled gracefully (server checks if request still active per FR-010)

---

## Research Complete ✅

All technical unknowns resolved. Implementation patterns documented with rationale, alternatives considered, and implementation notes.

**Ready for Phase 1**: Design (data-model.md, contracts/, quickstart.md)

**Key Decisions Summary**:
1. Built-in crypto.randomUUID() for requestId generation (no external dependencies)
2. Standard AbortController pattern for LangGraph cancellation
3. React useThreadConnection hook with useRef + useEffect lifecycle
4. useReconnection hook with fixed [1s, 2s, 4s] delay array
5. Map-based request correlation (client tracks in-flight requests)
6. ConnectionManager class for server-side per-connection state
7. useChatMessages extended with requestId generation, isStreaming flag, cancellation-before-send
