# WebSocket Chat API

## Overview

Cerebrobot uses WebSockets for real-time bidirectional chat communication. The API supports streaming responses, cancellation, and autonomous agent messages.

## Connection

### Endpoint
```
ws://localhost:3000/api/chat/ws?threadId={threadId}
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `threadId` | string | Yes | Unique conversation thread identifier (UUID v4) |

### Connection Lifecycle

1. **Client connects** with `threadId` query parameter
2. **Server acknowledges** connection and registers it
3. **Server immediately polls** for pending effects (reconnection delivery)
4. **Bidirectional messaging** begins
5. **Client or server closes** connection when done

### Close Codes

| Code | Name | Description |
|------|------|-------------|
| `1000` | Normal | Normal closure |
| `1008` | Policy Violation | Missing or invalid `threadId` |
| `1011` | Internal Error | Server error during message processing |

## Message Protocol

All messages are JSON objects with a `type` field indicating the message kind.

### Client → Server Messages

#### `chat.request`
Send a user message and request an agent response.

```json
{
  "type": "chat.request",
  "threadId": "550e8400-e29b-41d4-a716-446655440000",
  "content": "Hello, how are you?",
  "agentId": "helpful-assistant"
}
```

**Fields:**
- `type`: Always `"chat.request"`
- `threadId`: Thread identifier (must match connection `threadId`)
- `content`: User message text
- `agentId`: (Optional) Agent to use. Defaults to first available agent.

#### `cancel`
Cancel an in-progress request.

```json
{
  "type": "cancel",
  "requestId": "req-abc123"
}
```

**Fields:**
- `type`: Always `"cancel"`
- `requestId`: ID of the request to cancel (from `chat.started` event)

### Server → Client Messages

#### `chat.started`
Agent has started processing the request.

```json
{
  "type": "chat.started",
  "requestId": "req-abc123",
  "threadId": "550e8400-e29b-41d4-a716-446655440000",
  "agentId": "helpful-assistant"
}
```

#### `content`
Streaming content chunk from agent response.

```json
{
  "type": "content",
  "requestId": "req-abc123",
  "content": "Hello! I'm doing well, thank you for asking."
}
```

#### `chat.completed`
Agent has finished the response successfully.

```json
{
  "type": "chat.completed",
  "requestId": "req-abc123",
  "threadId": "550e8400-e29b-41d4-a716-446655440000",
  "agentId": "helpful-assistant"
}
```

#### `error`
An error occurred during processing.

```json
{
  "type": "error",
  "requestId": "req-abc123",
  "error": "Failed to process message"
}
```

#### `cancelled`
Request was successfully cancelled.

```json
{
  "type": "cancelled",
  "requestId": "req-abc123"
}
```

## Autonomous Messages

When autonomy is enabled (`AUTONOMY_ENABLED=true` and agent `autonomy.enabled=true`), the agent may send unsolicited follow-up messages.

### Autonomous Message Flow

1. **Agent schedules timer** during conversation (via `AutonomyEvaluatorNode`)
2. **TimerWorker fires** when timer is due (background polling every 5s by default)
3. **Timer → Event** conversion creates `timer_fired` event
4. **SessionProcessor** processes event through LangGraph
5. **Agent generates response** and emits `send_message` effect
6. **EffectRunner delivers** via WebSocket (background polling every 500ms by default)
7. **Client receives** message with same streaming protocol as user-initiated messages

### Autonomous Message Identification

Autonomous messages have:
- `requestId` starting with `timer_` prefix (e.g., `timer_autonomous_1234567890`)
- No corresponding user `chat.request` message

### Example Autonomous Message Sequence

```json
// Agent schedules follow-up during normal conversation
// (internal - not visible to client)

// ... 30 seconds later ...

// Client receives autonomous message
{
  "type": "chat.started",
  "requestId": "timer_autonomous_1729700000",
  "threadId": "550e8400-e29b-41d4-a716-446655440000",
  "agentId": "helpful-assistant"
}

{
  "type": "content",
  "requestId": "timer_autonomous_1729700000",
  "content": "By the way, I wanted to follow up on your earlier question..."
}

{
  "type": "chat.completed",
  "requestId": "timer_autonomous_1729700000",
  "threadId": "550e8400-e29b-41d4-a716-446655440000",
  "agentId": "helpful-assistant"
}
```

### Autonomy Limits

Autonomous messages are subject to safety limits:

1. **Hard Cap**: Maximum consecutive autonomous messages per session (default: 3)
   - Enforced by `AUTONOMY_MAX_CONSECUTIVE` environment variable
   - Resets when user sends a message
   - Violations logged and message delivery blocked

2. **Cooldown**: Minimum time between autonomous messages (default: 15s)
   - Enforced by `AUTONOMY_COOLDOWN_MS` environment variable
   - Prevents message spam
   - Session-specific (one session's cooldown doesn't affect others)

3. **Cancellation on User Message**: All pending timers/effects are cancelled when user sends a message
   - Ensures agent remains responsive to user
   - Prevents out-of-date autonomous messages

See [Configuration Guide](../configuration.md#autonomy-configuration) for tuning these limits.

## Error Handling

### Client-Side Best Practices

1. **Handle `error` events**: Display user-friendly error messages
2. **Implement reconnection logic**: WebSocket connections may drop, especially on mobile
3. **Track request IDs**: Match streaming events to their originating request
4. **Graceful degradation**: If WebSocket fails, notify user and offer retry

### Server-Side Guarantees

1. **Effect durability**: Messages are persisted in outbox before delivery (transactional outbox pattern)
2. **Reconnection delivery**: On reconnect, server immediately polls for pending effects
3. **Idempotency**: Duplicate effects (same `dedupe_key`) are automatically skipped
4. **TTL enforcement**: Effects older than 24 hours are automatically marked as failed

## Rate Limiting

Currently no rate limiting is implemented. For production deployments, use a reverse proxy (nginx, Caddy) with rate limiting.

Recommended limits:
- **Connections**: 10 per IP per minute
- **Messages**: 60 per connection per minute
- **Reconnections**: 5 per IP per minute

## Security Considerations

### Authentication

Current implementation has **no authentication**. Suitable for single-operator deployments behind a reverse proxy.

For multi-user deployments, add:
1. JWT-based authentication in WebSocket upgrade handshake
2. Thread ownership validation (user can only access their threads)
3. Agent permission model (which users can use which agents)

### Input Validation

All client messages are validated using Zod schemas (`@cerebrobot/chat-shared`):
- `threadId` must be valid UUID v4
- `content` must be non-empty string
- Message size limited to 1MB

### Content Security

- User messages are sanitized before storage
- LLM outputs are not sanitized (assumed to be safe from trusted models)
- For user-generated agent prompts, add content filtering

## Example Client Implementation

```typescript
import { WebSocket } from 'ws';

const threadId = crypto.randomUUID();
const ws = new WebSocket(`ws://localhost:3000/api/chat/ws?threadId=${threadId}`);

ws.on('open', () => {
  console.log('Connected');
  
  // Send chat request
  ws.send(JSON.stringify({
    type: 'chat.request',
    threadId,
    content: 'Hello!',
    agentId: 'helpful-assistant'
  }));
});

ws.on('message', (data) => {
  const event = JSON.parse(data.toString());
  
  switch (event.type) {
    case 'chat.started':
      console.log('Agent started:', event.requestId);
      break;
    case 'content':
      process.stdout.write(event.content);
      break;
    case 'chat.completed':
      console.log('\nAgent finished');
      break;
    case 'error':
      console.error('Error:', event.error);
      break;
  }
});

ws.on('close', (code, reason) => {
  console.log(`Connection closed: ${code} - ${reason}`);
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});
```

## Performance Characteristics

### Latency

- **User message → Agent starts**: <100ms (typical)
- **First token**: 500ms - 2s (depends on LLM provider)
- **Streaming chunks**: Real-time (LLM-limited)
- **Autonomous message delivery**: 500ms - 1s after effect created (polling-based)

### Throughput

- **Concurrent connections**: Limited by Node.js (default: unlimited, recommend max 1000)
- **Messages per connection**: Unlimited (WebSocket is full-duplex)
- **Effect processing**: ~200 effects/second (batch size: 100, poll interval: 500ms)

### Resource Usage

- **Memory per connection**: ~1-2MB (includes LangGraph checkpoint state)
- **Database connections**: Shared pool (default: 10 connections via Prisma)
- **CPU**: Minimal (I/O bound, main load is LLM inference)

## Debugging

### Enable Debug Logging

Set `LOG_LEVEL=debug` in `.env` to see detailed message flow:

```
websocket_connection_established_persistent
event_published: { type: "user_message", sessionKey: "..." }
event_processing_started
graph_invocation_started
content_chunk_streaming
effect_created: { type: "send_message", dedupeKey: "..." }
effect_delivered
chat_response_completed
```

### Inspect Pending Effects

```sql
-- View pending effects
SELECT * FROM effects WHERE status = 'pending' ORDER BY created_at;

-- View effects for specific session
SELECT * FROM effects WHERE session_key = 'your-thread-id' ORDER BY created_at;

-- View failed effects
SELECT * FROM effects WHERE status = 'failed' ORDER BY created_at DESC LIMIT 10;
```

See [Testing Guide](../../specs/009-server-side-autonomy/TESTING.md) for comprehensive debugging workflows.
