# ADR 010: Metadata-Based Autonomous Message Architecture

## Status
Accepted

## Context

- Autonomous timer infrastructure (spec `009-server-side-autonomy`) triggers follow-up messages to maintain conversation continuity.
- Initial implementation used content-based tagging with synthetic message text like `[AUTONOMOUS_FOLLOWUP: check_in]`.
- Content-based approach had three critical issues:
  1. **Thread history pollution**: Synthetic prompts visible in user-facing APIs (`GET /api/threads/:id/history`)
  2. **Memory retrieval irrelevance**: Memory search used synthetic trigger text instead of real user context
  3. **Fragile pattern matching**: String parsing (`content.startsWith('[AUTONOMOUS_FOLLOWUP:')`) coupled to prompt format
- Spec `016-metadata-autonomous-messages` mandates migrating to LangChain-native metadata storage via `HumanMessage.additional_kwargs`.
- LangGraph checkpoint persistence already serializes `additional_kwargs` through PostgreSQL, enabling metadata to survive across sessions.

## Decision

Adopt a **metadata-first architecture** for autonomous message detection and filtering, leveraging LangChain's `additional_kwargs` field for metadata storage and LangGraph's checkpoint persistence for durability.

### Core Components

#### 1. Metadata Type System (`@cerebrobot/chat-shared`)
```typescript
export interface MessageMetadata {
  synthetic?: boolean;              // Flag marking autonomous messages
  trigger_type?: AutonomousTriggerType; // 'check_in' | 'question_unanswered' | ...
  trigger_reason?: string;          // Optional context for debugging
}
```

#### 2. Natural Language Prompts
Replace meta-commentary with contextually appropriate prompts:
```typescript
export const TRIGGER_PROMPTS: Record<AutonomousTriggerType, string> = {
  check_in: 'Continue our conversation naturally.',
  question_unanswered: "The user asked a question but hasn't responded. Follow up on it.",
  task_incomplete: 'Check in about the incomplete task we discussed.',
  waiting_for_decision: 'Follow up on the decision the user needs to make.',
};
```

#### 3. Message Creation with Metadata
```typescript
// SessionProcessor (apps/server/src/session-processor/SessionProcessor.ts)
const syntheticMessage = new HumanMessage({
  content: TRIGGER_PROMPTS[triggerType],
  additional_kwargs: {
    synthetic: true,
    trigger_type: triggerType,
    trigger_reason: reason,
  } as MessageMetadata,
});
```

#### 4. Memory Retrieval Query Detection
```typescript
// Memory node (apps/server/src/agent/memory/nodes.ts)
const metadata = lastMessage.additional_kwargs as MessageMetadata | undefined;
if (metadata?.synthetic === true) {
  // Iterate backward to find last real user message
  for (let i = messages.length - 2; i >= 0; i--) {
    if (isHumanMessage(msg) && !msgMetadata?.synthetic) {
      query = msg.content; // Use real user context
      break;
    }
  }
  // Fallback to conversation summary if no real messages
  if (!query && state.summary) {
    query = state.summary;
  }
}
```

#### 5. Thread History Filtering
```typescript
// Thread service (apps/server/src/thread/service.ts)
if (isHumanMessage(msg)) {
  const metadata = msg.additional_kwargs as MessageMetadata | undefined;
  if (metadata?.synthetic === true) {
    // Filter out synthetic messages from user-facing APIs
    return false;
  }
}
```

### Implementation Phases

- **Phase 1-2**: Type definitions, logging infrastructure, checkpoint validation
- **Phase 3**: US1 - Natural autonomous follow-ups (SessionProcessor creates HumanMessage with metadata)
- **Phase 4**: US4 - All 4 trigger types with context-aware prompts
- **Phase 5**: US2 - Memory retrieval query detection with backward iteration
- **Phase 6**: US3 - Thread history filtering using metadata checks

## Consequences

### Positive

- ✅ **Type-safe metadata**: Strict TypeScript interfaces prevent runtime errors
- ✅ **LangGraph checkpoint persistence**: Metadata survives across sessions via PostgreSQL
- ✅ **Clean thread history**: User-facing APIs show only real user/agent messages
- ✅ **Relevant memory retrieval**: Memory search uses actual user context, not synthetic prompts
- ✅ **Natural conversation flow**: LLM receives contextual prompts without meta-commentary
- ✅ **Observability**: Comprehensive DEBUG/INFO/ERROR logging for metadata lifecycle
- ✅ **Decoupled architecture**: Metadata detection independent of prompt format changes

### Negative

- ⚠️ **Backward compatibility**: Existing checkpoints without metadata require migration (graceful degradation implemented via fallback checks)
- ⚠️ **Performance overhead**: Metadata extraction and type checking on every message (measured <1ms per message, well under 5ms target)
- ⚠️ **Testing complexity**: Unit tests require `additional_kwargs` fixtures and type guards

### Mitigations

- **Backward compatibility**: `metadata?.synthetic === true` strict check treats missing/undefined as false (real user message)
- **Performance**: Type guards (`isHumanMessage`) compiled to efficient `instanceof` checks
- **Testing**: Comprehensive test coverage (14 memory node tests, 9 thread service tests) validates all edge cases

## Implementation Notes

### Modified Files
1. `packages/chat-shared/src/types/metadata.ts` - Type definitions and trigger prompts
2. `apps/server/src/session-processor/SessionProcessor.ts` - HumanMessage creation with metadata
3. `apps/server/src/agent/LangGraphAgent.ts` - Accept HumanMessage or string
4. `apps/server/src/agent/memory/nodes.ts` - Query detection with backward iteration
5. `apps/server/src/thread/service.ts` - Metadata-based filtering
6. `apps/server/src/utils/logging/` - Dedicated logging functions for metadata operations

### Key Patterns
- **Type Guard Pattern**: Use `isHumanMessage()` before accessing HumanMessage properties
- **Metadata Detection**: Strict equality check `metadata?.synthetic === true`
- **Backward Iteration**: Start at `length - 2` (skip current synthetic), iterate to 0
- **Fallback Chain**: current_message → last_real_user_message → conversation_summary → error
- **Logging Discipline**: DEBUG for individual operations, INFO for statistics, ERROR for edge cases

## Testing

- ✅ **Checkpoint persistence**: Metadata survives round-trip through PostgreSQL (validated via `checkpoint-metadata-validation.test.ts`)
- ✅ **Memory retrieval**: 14 unit tests validate query source selection (4 US2-specific tests)
- ✅ **Thread filtering**: 9 unit tests validate metadata-based message filtering
- ✅ **Full test suite**: 270 server tests, 699 total tests passing
- ✅ **Hygiene loop**: 0 lint errors, all files formatted

## Natural Prompt Design Rationale

The shift to natural prompts eliminates meta-commentary that could leak into LLM responses. Previous approach:
```
[AUTONOMOUS_FOLLOWUP: check_in] → "I notice you said [AUTONOMOUS_FOLLOWUP: check_in]..."
```

New approach:
```
"Continue our conversation naturally." → "How's your day going? Earlier you mentioned..."
```

This ensures:
1. **No prompt injection**: LLM cannot reflect internal system commands
2. **Contextual coherence**: Prompts guide conversation style without explicit instructions
3. **Token efficiency**: Shorter prompts reduce input token cost
4. **User transparency**: System behavior visible only through timing, not content

## References

- Spec: `specs/016-metadata-autonomous-messages/`
- LangChain Documentation: `additional_kwargs` field on `BaseMessage`
- LangGraph Documentation: Checkpoint persistence and state serialization
- Related: ADR 008 (WebSocket migration), spec 009 (server-side autonomy)
