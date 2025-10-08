# userId Validation Strategy

## Overview

**Cerebrobot requires `userId` for ALL chat operations.** This is a critical requirement for memory persistence and cross-session continuity. The system implements multi-layer validation to fail loudly when `userId` is missing.

## Validation Layers

### 1. Frontend Guard (First Line of Defense)

**File**: `apps/client/src/components/ChatView.tsx`

- **Initialization**: Component checks `localStorage` for existing `userId` on mount
- **UI Blocking**: If no `userId`, shows `UserSetup` component instead of chat interface
- **Runtime Guard**: Before sending any message, validates `userId` is present:
  ```typescript
  if (!userId) {
    setError({
      message: 'User ID is required. Please set up your user profile first.',
      retryable: false,
    });
    return;
  }
  ```
- **Result**: User cannot send messages until `userId` is available

### 2. Schema Validation (API Boundary)

**File**: `packages/chat-shared/src/schemas/chat.ts`

```typescript
export const ChatRequestSchema = z
  .object({
    sessionId: NonEmptyString,
    message: NonEmptyString,
    userId: z.string().uuid(), // REQUIRED: Must be valid UUID
  })
  .strict();
```

- **Enforcement**: Zod schema requires `userId` to be a valid UUID string
- **Result**: Invalid requests rejected with 400 status and clear error message
- **Example Error**:
  ```json
  {
    "error": "Invalid chat request payload",
    "details": [{
      "expected": "string",
      "code": "invalid_type",
      "path": ["userId"],
      "message": "Invalid input: expected string, received undefined"
    }]
  }
  ```

### 3. Route Handler Validation

**File**: `apps/server/src/chat/routes.ts`

```typescript
const parseResult = ChatRequestSchema.safeParse(request.body);
if (!parseResult.success) {
  return reply.status(400).send({
    error: 'Invalid chat request payload',
    details: parseResult.error.issues,
  });
}
```

- **Enforcement**: FastifyAPI route validates payload before processing
- **Logging**: Warns about invalid payloads with full error details
- **Result**: Request never reaches chat agent if `userId` is missing

### 4. Chat Agent Entry Points

**File**: `apps/server/src/agent/langgraph-agent.ts`

Both `streamChat()` and `completeChat()` validate at entry:

```typescript
public async *streamChat(context: ChatInvocationContext) {
  // CRITICAL: Validate userId is present
  if (!context.userId) {
    const error = new Error('userId is required for all chat operations but was not provided');
    this.logger?.error({ sessionId: context.sessionId }, error.message);
    throw error;
  }
  // ... proceed with chat
}
```

- **Enforcement**: Throws error immediately if `userId` is missing
- **Logging**: ERROR level log with context
- **Result**: Chat operation fails fast with clear error

### 5. Memory Node Validation

**File**: `apps/server/src/agent/memory/nodes.ts`

Both `retrieveMemories` and `storeMemory` nodes validate:

```typescript
if (!state.userId) {
  const error = new Error('userId is required for memory retrieval but was not found in state');
  logger.error(
    { sessionId: state.sessionId, error: error.message },
    'CRITICAL: No userId in state - memory operations impossible',
  );
  throw error;
}
```

- **Enforcement**: Throws error (not just warning) if `userId` missing from state
- **No Fallback**: Previously fell back to `sessionId` - this caused namespace mismatches
- **Result**: Memory operations fail loudly instead of silently creating wrong data

### 6. Memory Tool Validation

**File**: `apps/server/src/agent/memory/tools.ts`

```typescript
const userId = (runnableConfig as any)?.configurable?.userId;
if (!userId) {
  const errorMsg = 'CRITICAL: userId not found in config.configurable - memory operations require userId';
  logger.error({ config: runnableConfig }, errorMsg);
  return {
    success: false,
    memoryId: '',
    message: errorMsg,
  };
}
```

- **Enforcement**: Returns failure response (LLM sees tool failure)
- **Logging**: ERROR level with full config context
- **Result**: LLM-invoked memory operations fail gracefully with clear message

## Type Safety

**Interface**: `apps/server/src/chat/chat-agent.ts`

```typescript
export interface ChatInvocationContext {
  readonly sessionId: string;
  readonly userId: string; // REQUIRED: All chats must be tied to a user
  readonly message: string;
  readonly correlationId: string;
  readonly config: ServerConfig;
}
```

- **Type Level**: `userId` is non-optional string (not `string | undefined`)
- **Compile Time**: TypeScript enforces `userId` must be provided
- **Runtime**: Combined with runtime checks for defense in depth

## Error Messages

All validation layers provide clear, actionable error messages:

- **Frontend**: "User ID is required. Please set up your user profile first."
- **Schema**: "Invalid input: expected string, received undefined"
- **Agent**: "userId is required for all chat operations but was not provided"
- **Memory Node**: "userId is required for memory retrieval but was not found in state"
- **Memory Tool**: "CRITICAL: userId not found in config.configurable - memory operations require userId"

## Why This Matters

### 1. Memory Namespace Integrity

Memories are stored in namespaces: `['memories', userId]`

- **Without userId**: System would create inconsistent namespaces
- **With fallback to sessionId**: Storage and retrieval use different namespaces
- **Result**: Memories lost, data corruption, privacy leaks

### 2. Cross-Session Continuity

- **User switches devices**: Same `userId` → memories follow them
- **User starts new session**: Same `userId` → context maintained
- **Multiple users**: Different `userId` → data isolation

### 3. Data Privacy

- **Separation**: Each user's memories isolated by `userId`
- **No Leakage**: Cannot accidentally access another user's data
- **Compliance**: Clear user data boundaries

## Testing

**Test Files**:
- `apps/server/src/agent/__tests__/langgraph-agent.test.ts`
- `apps/server/src/agent/__tests__/langgraph-persistence.test.ts`
- `apps/server/src/agent/memory/__tests__/nodes.test.ts`

All tests updated to:
1. Provide valid `userId` in all contexts
2. Test error cases when `userId` is missing
3. Verify no fallback to `sessionId`

**Example Test**:
```typescript
it('uses userId from state and throws if missing', async () => {
  const retrieveMemories = createRetrieveMemoriesNode(mockStore, config, logger);

  // Should work with userId
  await retrieveMemories({
    messages: [new HumanMessage('test')],
    sessionId: 'session-123',
    userId: 'user-456',
  });
  expect(mockStore.search).toHaveBeenCalledWith(['memories', 'user-456'], ...);

  // Should throw without userId
  await expect(
    retrieveMemories({
      messages: [new HumanMessage('test')],
      sessionId: 'session-789',
    }),
  ).rejects.toThrow('userId is required for memory retrieval');
});
```

## Migration from Optional to Required

**Previous State**: `userId` was optional with fallbacks
**Current State**: `userId` is mandatory at all layers
**Breaking Change**: Yes - but intentional for data integrity

**Changed Files**:
1. Schema: `userId.optional()` → `userId: z.string().uuid()`
2. Nodes: `userId ?? sessionId` → throws if no `userId`
3. Agent: Added entry-point validation
4. Frontend: Added user setup flow before chat

## Best Practices

1. **Never fallback to alternative identifiers** - Fail loud instead
2. **Validate at boundaries** - Frontend, API, Agent, Memory
3. **Log errors clearly** - Include context, use ERROR level
4. **Type safety first** - Make `userId` non-optional in types
5. **Test error paths** - Ensure validation actually works
6. **Clear error messages** - Tell users/developers exactly what's wrong

## Future Considerations

- **Session-to-User Linking**: Allow converting anonymous sessions to user accounts
- **Guest Mode**: Explicit guest userId (still mandatory, but marked as temporary)
- **Multi-User Sessions**: Support multiple userIds in group contexts
- **User Deletion**: Cascade delete memories when user is deleted
