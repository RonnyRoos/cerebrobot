# Research: WebSocket Migration Technical Decisions

**Feature**: Switch to WebSocket Communication Protocol  
**Date**: October 11, 2025  
**Purpose**: Document technical decisions, best practices, and implementation patterns for replacing SSE with WebSocket

## Overview

This research document consolidates findings for migrating from Server-Sent Events (SSE) to WebSocket for chat streaming in Cerebrobot. The migration focuses on transport layer substitution while preserving existing LangGraph streaming logic and event schemas.

---

## Decision 1: WebSocket Library Selection

### Decision
Use `@fastify/websocket` (Fastify official plugin) with underlying `ws` library for server-side WebSocket support.

### Rationale
1. **Official Fastify Plugin**: Maintained by Fastify core team, ensuring compatibility with Fastify v5.6.1
2. **Mature Ecosystem**: `ws` is the most widely-used Node.js WebSocket library (10M+ weekly downloads)
3. **TypeScript Support**: First-class TypeScript definitions via `@types/ws`
4. **Zero Client Dependencies**: Browsers provide native WebSocket API; no client library needed
5. **Constitution Alignment**: Minimal dependency additions (2 packages: @fastify/websocket + ws)

### Alternatives Considered
- **socket.io**: Rejected due to heavier footprint, custom protocol, and unnecessary features (rooms, namespaces)
- **uWebSockets.js**: Rejected due to C++ bindings complexity and overkill for single-user deployment
- **Raw `ws` without Fastify plugin**: Rejected to maintain Fastify ecosystem integration

### Implementation Notes
```typescript
// Server registration
import websocket from '@fastify/websocket';
await app.register(websocket, {
  options: { maxPayload: 1048576 }, // 1MB from clarifications
  errorHandler: (error, socket, req, reply) => {
    logger.error({ err: error }, 'websocket error');
    socket.terminate();
  }
});

// Client usage (native browser API)
const ws = new WebSocket('ws://localhost:3030/api/chat/ws');
ws.onmessage = (event) => { /* handle */ };
```

**References**:
- @fastify/websocket docs: https://github.com/fastify/fastify-websocket
- ws library docs: https://github.com/websockets/ws

---

## Decision 2: Message Format & Framing

### Decision
Continue using JSON text frames with existing `AgentStreamEvent` schema (token/final/error event types).

### Rationale
1. **Schema Preservation**: Spec requirement (FR-013) mandates preserving current message event types
2. **Human-Readable**: JSON frames simplify debugging via browser DevTools Network tab
3. **Type Safety**: Zod schemas in `@cerebrobot/chat-shared` remain unchanged
4. **No Binary Needed**: 1MB text messages sufficient for chat use case; binary frames unnecessary

### Message Protocol
```typescript
// Token event
{ "type": "token", "value": "hello" }

// Final event  
{ "type": "final", "message": "complete response", "latencyMs": 1234, "tokenUsage": {...} }

// Error event
{ "type": "error", "message": "Connection failed", "retryable": true }
```

### Frame Size Management
- **Send**: `socket.send(JSON.stringify(event))` - ws library handles framing
- **Receive**: `JSON.parse(event.data)` - browser automatically reassembles frames
- **Size Limit**: 1MB enforced at application layer (FR-015), not protocol layer

**References**:
- WebSocket framing spec: RFC 6455 Section 5.2
- Existing schema: `packages/chat-shared/src/schemas/chat.ts`

---

## Decision 3: Connection Lifecycle Pattern

### Decision
Adopt one-message-per-connection pattern: establish connection → send request → stream response → close connection.

### Rationale
1. **Simplicity**: Avoids connection pooling complexity for single-user deployment
2. **Resource Cleanup**: Natural garbage collection after each conversation turn
3. **Error Isolation**: Connection failures don't affect subsequent requests
4. **Stateless Server**: No server-side connection state management needed
5. **Alignment with Clarifications**: "No automatic timeout" (Q5) naturally satisfied

### Lifecycle Sequence
```
Client                          Server
  |                               |
  |-- WS Upgrade Request -------->|
  |<---- 101 Switching Protocols -|
  |                               |
  |-- JSON: {threadId, message} ->|
  |                               | (start streaming)
  |<---- {"type":"token",...} ----|
  |<---- {"type":"token",...} ----|
  |<---- {"type":"final",...} ----|
  |<---- Close(1000) -------------|
  |                               |
```

### Alternative Rejected
**Persistent connection with multiple requests**: Would require request ID management, timeout handling, and connection pool limits—unnecessary for 1-5 concurrent connection target.

**References**:
- Fastify WebSocket lifecycle: https://github.com/fastify/fastify-websocket#usage
- WebSocket close codes: RFC 6455 Section 7.4.1

---

## Decision 4: Error Handling Strategy

### Decision
Use WebSocket close codes for transport errors; JSON error events for application errors.

### Error Categories

| Error Type | Mechanism | Close Code | Retryable |
|------------|-----------|------------|-----------|
| Connection failed | Close frame | 1006 (abnormal) | Yes |
| Invalid payload | Error event | N/A | No |
| Thread not found | Error event | N/A | No |
| LLM timeout | Error event + Close | 1011 (server error) | Yes |
| Message too large | Error event | N/A | No |
| Server shutdown | Close frame | 1001 (going away) | Yes |

### Implementation Pattern
```typescript
// Server: Application error
socket.send(JSON.stringify({ 
  type: 'error', 
  message: 'Thread not found', 
  retryable: false 
}));
socket.close(1000); // Normal closure after error event

// Server: Transport error
socket.close(1011, 'Internal server error');

// Client: Handle both
ws.onerror = (error) => { /* transport error */ };
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'error') { /* application error */ }
};
```

### Partial Message Handling
Per clarification (Q2): Discard partial messages on disconnect. Client implementation:
```typescript
ws.onclose = (event) => {
  if (event.code !== 1000) { // Not normal closure
    setMessages(prev => prev.filter(m => m.status !== 'streaming'));
    showError('Connection interrupted. Please retry.');
  }
};
```

**References**:
- Close codes: https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code
- Error event structure: `packages/chat-shared/src/schemas/chat.ts`

---

## Decision 5: Testing Strategy

### Decision
Three-tier approach: Unit tests (mocked WebSocket) + Manual smoke tests (real browser) + No Postgres changes.

### Test Breakdown

**Tier 1: Unit Tests (Primary Coverage)**
```typescript
// Using vitest-websocket-mock
import { WS } from 'vitest-websocket-mock';

test('streams tokens and closes on completion', async () => {
  const server = new WS('ws://localhost:3030/api/chat/ws');
  const client = new WebSocket('ws://localhost:3030/api/chat/ws');
  
  await server.connected;
  server.send(JSON.stringify({ type: 'token', value: 'hi' }));
  server.send(JSON.stringify({ type: 'final', message: 'hi' }));
  
  // Assert client received events
});
```

**Tier 2: Manual Smoke Tests**
Checklist in `specs/005-switch-to-websocket/checklists/smoke-tests.md`:
- [ ] Open browser DevTools → Network → WS filter
- [ ] Send message and verify token-by-token streaming visible
- [ ] Disconnect network mid-stream and verify error + retry UX
- [ ] Send 5 concurrent messages and verify all stream correctly
- [ ] Send message >1MB and verify rejection error

**Tier 3: Postgres**
No changes required (LangGraph checkpointing layer unchanged).

### Testing Library
**vitest-websocket-mock** chosen for:
- Vitest integration (existing test framework)
- Synchronous mock control (deterministic tests)
- Client and server simulation
- npm install: `pnpm add -D vitest-websocket-mock`

**References**:
- vitest-websocket-mock: https://github.com/romgain/vitest-websocket-mock
- Constitution testing principles: `.specify/memory/constitution.md` Section III

---

## Decision 6: Observability Implementation

### Decision
Implement structured logging for connection lifecycle and message counts using existing Pino logger.

### Logging Events (per clarification Q4)

```typescript
// Connection established
logger.info({
  event: 'websocket_connected',
  correlationId,
  threadId,
  userId,
}, 'WebSocket connection established');

// Message sent
logger.debug({
  event: 'websocket_message_sent',
  correlationId,
  eventType: 'token',
  messageSize: payload.length,
}, 'WebSocket message sent');

// Stream completed
logger.info({
  event: 'websocket_stream_complete',
  correlationId,
  threadId,
  tokenCount: accumulator.tokens.length,
  latencyMs,
  tokenUsage,
}, 'WebSocket stream completed');

// Connection closed
logger.info({
  event: 'websocket_closed',
  correlationId,
  closeCode,
  reason,
}, 'WebSocket connection closed');

// Error
logger.error({
  event: 'websocket_error',
  correlationId,
  err: error,
  retryable,
}, 'WebSocket error occurred');
```

### Correlation ID Flow
- Generated client-side: `crypto.randomUUID()`
- Sent in first message payload: `{ threadId, userId, message, correlationId }`
- Attached to all subsequent log entries for request tracing

### Metrics (Not Implemented - Out of Scope)
Per clarification Q4, chose option B (structured logging) not C (metrics). Prometheus/StatsD integration deferred to future work if needed.

**References**:
- Pino structured logging: https://github.com/pinojs/pino#usage
- Correlation ID pattern: existing `apps/server/src/chat/routes.ts` implementation

---

## Decision 7: Migration Execution Strategy

### Decision
Feature-flag-free cutover: Remove SSE code completely in single PR without parallel support.

### Rationale
1. **Spec Requirement**: "REMOVE the old protocol. I don't want them running in parallell."
2. **Low Risk**: Single-user deployment allows comprehensive manual testing pre-merge
3. **Simplified Testing**: No need to test two code paths or feature flag logic
4. **Clean Diff**: Easy to review and revert if issues found

### Removal Checklist
**Server:**
- [ ] Remove `handleSseResponse()` function
- [ ] Remove `writeSseEvent()` and `createSsePayload()` helpers
- [ ] Remove `reply.hijack()` and SSE header logic
- [ ] Remove `Accept: text/event-stream` header check
- [ ] Update route from POST `/api/chat` to GET `/api/chat/ws` with `{ websocket: true }`

**Client:**
- [ ] Remove `consumeSse()` function
- [ ] Remove `processSseChunk()` SSE parsing
- [ ] Remove `ReadableStream` reader and buffer logic
- [ ] Remove `Accept: text/event-stream` header from fetch
- [ ] Replace `fetch()` with `new WebSocket()`

**Dependencies:**
- [ ] Remove `fastify-sse-v2` from `apps/server/package.json` (if present)
- [ ] Add `@fastify/websocket` and `ws`
- [ ] Add `@types/ws` to devDependencies

### Rollback Plan
If critical issues found post-merge:
1. `git revert <commit-sha>` immediately
2. Investigate issue in separate branch
3. Fix and re-attempt migration with additional tests

**References**:
- Migration validation: Grep for `text/event-stream`, `consumeSse`, `handleSseResponse` = 0 matches

---

## Best Practices Summary

### Do's ✅
1. **Use correlation IDs** for all WebSocket log entries
2. **Close connections explicitly** with appropriate codes (1000 normal, 1011 error)
3. **Validate payloads** before processing (Zod schemas)
4. **Log at appropriate levels** (debug for tokens, info for lifecycle, error for failures)
5. **Test with real browser DevTools** during manual smoke tests
6. **Keep message size under 1MB** (enforced via validation)
7. **Discard partial messages** on disconnect (per Q2 clarification)

### Don'ts ❌
1. **Don't implement auto-reconnect** (out of scope per spec)
2. **Don't add connection timeouts** (per Q5: no automatic timeout)
3. **Don't create connection pools** (unnecessary for 5-connection target)
4. **Don't use binary frames** (JSON text sufficient)
5. **Don't mock WebSocket in pseudo-integration tests** (use vitest-websocket-mock for unit, real browser for smoke)
6. **Don't preserve partial messages** on disconnect (discard per Q2)
7. **Don't add metrics/Prometheus** (structured logging sufficient per Q4)

---

## Open Questions / Future Work

**None identified during research.** All technical decisions align with specification requirements and clarifications (Q1-Q5).

Future enhancements explicitly out of scope (per spec):
- Server-initiated messages (bidirectional communication)
- Automatic reconnection with backoff
- Message compression
- Binary frame support
- Connection-level rate limiting
- Ping/pong health monitoring

---

## References

### External Documentation
- **RFC 6455**: WebSocket Protocol Specification
- **@fastify/websocket**: https://github.com/fastify/fastify-websocket
- **ws library**: https://github.com/websockets/ws
- **MDN WebSocket API**: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- **vitest-websocket-mock**: https://github.com/romgain/vitest-websocket-mock

### Internal Documentation
- **Feature Spec**: `specs/005-switch-to-websocket/spec.md`
- **Clarifications**: `specs/005-switch-to-websocket/spec.md#clarifications` (Q1-Q5)
- **Constitution**: `.specify/memory/constitution.md`
- **Tech Stack**: `docs/tech-stack.md`
- **Current SSE Implementation**: `apps/server/src/chat/routes.ts` (handleSseResponse)
- **Current Client Hook**: `apps/client/src/hooks/useChatMessages.ts` (consumeSse)
- **Event Schemas**: `packages/chat-shared/src/schemas/chat.ts`

---

**Research Status**: ✅ **COMPLETE**  
**Blockers**: None  
**Ready for Phase 1**: Yes
