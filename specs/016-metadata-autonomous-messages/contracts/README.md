# API Contracts: Metadata-Based Autonomous Message Tagging

**Feature**: 016-metadata-autonomous-messages  
**Date**: 2025-11-10

## Overview

**This feature has NO external API contracts.**

All changes are internal refactoring:
- Message creation (SessionProcessor)
- Message filtering (ThreadService)
- Memory retrieval (Memory nodes)
- Graph invocation (LangGraphAgent)

**External API behavior unchanged**:
- Thread history endpoints return same JSON structure
- WebSocket message format unchanged
- No new endpoints added
- No request/response schema changes

---

## Internal Interfaces (for reference)

### SessionProcessor → LangGraphAgent

**Before** (string-based):
```typescript
await agent.invokeStreamAsync({
  message: '[AUTONOMOUS_FOLLOWUP: check_in]', // Plain string
  threadId: session.threadId,
  userId: session.userId,
  agentId: session.agentId,
  signal: abortController.signal,
  isUserMessage: false
});
```

**After** (HumanMessage-based):
```typescript
import { HumanMessage } from '@langchain/core/messages';

const syntheticMessage = new HumanMessage({
  content: 'Continue our conversation naturally.',
  additional_kwargs: {
    synthetic: true,
    trigger_type: 'check_in',
    trigger_reason: timerContext?.reason
  }
});

await agent.invokeStreamAsync({
  message: syntheticMessage, // HumanMessage object
  threadId: session.threadId,
  userId: session.userId,
  agentId: session.agentId,
  signal: abortController.signal,
  isUserMessage: false
});
```

**Type Change**:
```typescript
// Before
interface InvokeContext {
  message: string;
  // ...
}

// After
interface InvokeContext {
  message: string | HumanMessage; // Union type
  // ...
}
```

---

### LangGraphAgent → Graph.stream()

**Before**:
```typescript
await this.graphContext.graph.stream({
  messages: [new HumanMessage(context.message)], // Always construct from string
  // ...
});
```

**After**:
```typescript
const humanMessage = typeof context.message === 'string'
  ? new HumanMessage(context.message)
  : context.message; // Already a HumanMessage

await this.graphContext.graph.stream({
  messages: [humanMessage],
  // ...
});
```

---

### Memory Node Internal Logic

**Before**:
```typescript
const lastMessage = state.messages[state.messages.length - 1];
const query = typeof lastMessage.content === 'string' 
  ? lastMessage.content 
  : String(lastMessage.content);
```

**After**:
```typescript
const lastMessage = state.messages[state.messages.length - 1];

// Detect synthetic message
if (lastMessage.additional_kwargs?.synthetic === true) {
  // Find last real user message
  const realUserMessage = state.messages
    .slice()
    .reverse()
    .find(msg => msg._getType() === 'human' && !msg.additional_kwargs?.synthetic);
  
  query = realUserMessage 
    ? (typeof realUserMessage.content === 'string' ? realUserMessage.content : String(realUserMessage.content))
    : state.summary || ''; // Fallback to summary
} else {
  query = typeof lastMessage.content === 'string' 
    ? lastMessage.content 
    : String(lastMessage.content);
}
```

---

### Thread Service Filtering

**Before**:
```typescript
return rawMessages
  .filter((msg: BaseMessage) => {
    const messageType = msg._getType();
    if (messageType !== 'human' && messageType !== 'ai') return false;
    
    // Content-based filter
    const content = typeof msg.content === 'string' ? msg.content : '';
    if (content.startsWith('[AUTONOMOUS_FOLLOWUP:')) return false;
    
    return true;
  });
```

**After**:
```typescript
return rawMessages
  .filter((msg: BaseMessage) => {
    const messageType = msg._getType();
    if (messageType !== 'human' && messageType !== 'ai') return false;
    
    // Metadata-based filter
    if (msg.additional_kwargs?.synthetic === true) return false;
    
    return true;
  });
```

---

## No Schema Changes

**Database**:
- No Prisma schema changes
- Metadata stored in LangGraph checkpoints (existing `checkpoint_blobs` table)
- No migrations required

**WebSocket Protocol**:
- Client receives same message format
- No protocol version bump needed
- Backward compatible

**Type Definitions** (`@cerebrobot/chat-shared`):
- No changes to exported types
- Internal type changes only

---

## Validation

### Startup Validation Test

**Purpose**: Ensure LangGraph checkpoint preserves message metadata

**Location**: `apps/server/src/agent/__tests__/checkpoint-metadata-validation.test.ts`

```typescript
describe('Checkpoint Metadata Validation', () => {
  it('preserves HumanMessage additional_kwargs through checkpoint save/restore', async () => {
    const testMessage = new HumanMessage({
      content: 'Test autonomous message',
      additional_kwargs: {
        synthetic: true,
        trigger_type: 'check_in',
        trigger_reason: 'Validation test'
      }
    });
    
    // Save via checkpoint saver
    const checkpointer = new PostgresSaver(connectionString);
    await checkpointer.put(
      { messages: [testMessage] },
      { configurable: { thread_id: 'validation-test' } }
    );
    
    // Restore from checkpoint
    const restored = await checkpointer.get({
      configurable: { thread_id: 'validation-test' }
    });
    
    const restoredMessage = restored.messages[0];
    
    // Verify metadata integrity
    expect(restoredMessage.additional_kwargs).toBeDefined();
    expect(restoredMessage.additional_kwargs.synthetic).toBe(true);
    expect(restoredMessage.additional_kwargs.trigger_type).toBe('check_in');
    expect(restoredMessage.additional_kwargs.trigger_reason).toBe('Validation test');
  });
});
```

**Failure Handling**:
- If test fails → log ERROR and abort server startup
- Indicates LangGraph version incompatibility or configuration issue
- Prevents silent data loss in production

---

## This directory intentionally minimal

External API contracts not applicable for internal refactoring features.
See data-model.md for internal data structures.
