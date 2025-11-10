# Research: Metadata-Based Autonomous Message Tagging

**Feature**: 016-metadata-autonomous-messages  
**Date**: 2025-11-10  
**Status**: Complete

## Research Questions

### Q1: Does LangChain HumanMessage support additional_kwargs metadata?

**Decision**: ✅ YES - LangChain's `HumanMessage` class supports `additional_kwargs` parameter

**Evidence**:
- HumanMessage imported from `@langchain/core/messages`
- Constructor accepts object form: `new HumanMessage({ content: string, additional_kwargs?: Record<string, any> })`
- Current codebase already uses HumanMessage (apps/server/src/agent/langgraph-agent.ts, conversation-graph.ts)
- Example from Context7 docs shows metadata usage in structured output contexts

**Implementation Pattern**:
```typescript
import { HumanMessage } from '@langchain/core/messages';

// Current approach (string-based)
const message = new HumanMessage(context.message);

// New approach (metadata-based)
const message = new HumanMessage({
  content: "Continue our conversation naturally.",
  additional_kwargs: {
    synthetic: true,
    trigger_type: 'check_in',
    trigger_reason: timerContext?.reason
  }
});
```

**Type Safety**: TypeScript types from `@langchain/core` include `additional_kwargs: Record<string, any>`, ensuring compile-time safety.

**Alternatives Considered**:
- ❌ Custom message subclass: Unnecessary complexity, breaks LangChain conventions
- ❌ Separate metadata store: Requires synchronization, couples filtering to external state
- ✅ `additional_kwargs`: Native LangChain pattern, checkpoint-serialized, zero coupling

---

### Q2: Does LangGraph checkpoint serialization preserve message metadata?

**Decision**: ✅ YES - LangGraph checkpoints preserve `additional_kwargs` through PostgreSQL persistence

**Evidence**:
- LangGraph uses `@langchain/langgraph-checkpoint-postgres` for state persistence
- BaseMessage subclasses (HumanMessage, AIMessage, SystemMessage) are serialized via LangChain's standard serialization
- `additional_kwargs` is part of BaseMessage schema, included in checkpoint blobs
- Existing codebase uses checkpoint persistence (apps/server/src/agent/langgraph-agent.ts line 177)

**Validation Strategy** (from spec clarification Q2):
- Startup validation test: Create HumanMessage with metadata → save checkpoint → restore → verify metadata integrity
- Fail fast on server startup if metadata stripped (indicates LangGraph version incompatibility)
- Log ERROR and abort if checkpoint deserialization loses `additional_kwargs`

**Rationale**: Metadata persistence is critical infrastructure requirement. If checkpoints don't preserve `additional_kwargs`, the entire metadata approach fails. Startup validation ensures this assumption holds before processing real traffic.

**Alternatives Considered**:
- ❌ Store metadata in separate table: Synchronization complexity, denormalization
- ❌ Reconstruct metadata from content parsing: Defeats purpose of metadata approach
- ✅ Rely on checkpoint serialization + validation: Aligns with LangGraph architecture, zero overhead

---

### Q3: Best practices for metadata-driven filtering in message lists?

**Decision**: Use pure metadata checks (`msg.additional_kwargs?.synthetic === true`), eliminate content pattern matching

**Current Approach** (apps/server/src/thread/service.ts lines 331-343):
```typescript
// Content-based filtering (DEPRECATED)
const content = typeof msg.content === 'string' ? msg.content : '';
if (content.startsWith('[AUTONOMOUS_FOLLOWUP:')) return false;
```

**New Approach**:
```typescript
// Metadata-based filtering (RECOMMENDED)
if (msg.additional_kwargs?.synthetic === true) return false;
```

**Benefits**:
- **Type-safe**: Metadata field has explicit boolean type, not string parsing
- **Content-agnostic**: Works for string, multimodal (text+images), or array content
- **Performance**: Direct property access vs. string operations
- **Debuggable**: Metadata visible in logs without parsing message text

**Edge Cases Handled**:
1. **Multimodal content** (arrays): Metadata check works regardless of content structure
2. **Missing metadata**: `additional_kwargs?.synthetic` safely returns `undefined` (falsy) for real user messages
3. **Corrupted metadata**: Type coercion (`=== true`) prevents false positives from non-boolean values

**Alternatives Considered**:
- ❌ Hybrid (metadata + content): Redundant, couples filtering to content format
- ❌ Content-only with natural prompts: Still couples filtering to prompt text
- ✅ Pure metadata: Complete decoupling, future-proof for multimodal/multilingual

---

### Q4: Memory retrieval query source detection pattern?

**Decision**: Detect synthetic messages via metadata, use last real user message as query source, fallback to conversation summary

**Current Approach** (apps/server/src/agent/memory/nodes.ts lines 60-68):
```typescript
const lastMessage = messages[messages.length - 1];
if (!lastMessage || lastMessage._getType() !== 'human') {
  return { retrievedMemories: [] };
}
const query = typeof lastMessage.content === 'string' ? 
  lastMessage.content : String(lastMessage.content);
```

**New Approach**:
```typescript
const lastMessage = messages[messages.length - 1];

// Detect synthetic message via metadata
if (lastMessage.additional_kwargs?.synthetic === true) {
  // Find last REAL user message
  const realUserMessage = messages
    .slice()
    .reverse()
    .find(msg => msg._getType() === 'human' && !msg.additional_kwargs?.synthetic);
  
  if (realUserMessage) {
    query = typeof realUserMessage.content === 'string' ? 
      realUserMessage.content : String(realUserMessage.content);
  } else if (state.summary) {
    // Fallback to conversation summary
    query = state.summary;
  } else {
    // Empty thread edge case (misconfiguration)
    logger.error({ threadId: state.threadId }, 
      'Autonomous message triggered on empty thread - misconfiguration');
    return { retrievedMemories: [] };
  }
}
```

**Query Source Priority**:
1. **Primary**: Last real user message (most contextually relevant)
2. **Fallback**: Conversation summary (when no user messages exist)
3. **Emergency**: Empty context (log ERROR, skip retrieval)

**Benefits**:
- Eliminates memory matches on trigger phrases like "autonomous followup" or "check in"
- Preserves semantic relevance (queries actual conversation content)
- Handles edge cases gracefully (empty threads, summary-only state)

**Alternatives Considered**:
- ❌ Always use conversation summary: Less precise than last user message
- ❌ Parse synthetic content for context hints: Couples query to prompt structure
- ✅ Metadata detection + real message query: Clean separation, optimal relevance

---

### Q5: Logging patterns for metadata lifecycle events with Pino?

**Decision**: Use DEBUG/INFO/ERROR levels with structured metadata fields for comprehensive observability without production noise

**Log Level Strategy** (from spec clarification Q4):

**DEBUG Level** (trace events, development/troubleshooting):
```typescript
logger.debug({
  threadId: context.threadId,
  agentId: this.agentId,
  triggerType: metadata.trigger_type,
  syntheticFlag: metadata.synthetic
}, 'Created synthetic message with metadata');

logger.debug({
  threadId: state.threadId,
  detectedSynthetic: true,
  querySource: 'last_real_user_message'
}, 'Metadata detected during memory retrieval');

logger.debug({
  threadId: context.threadId,
  filteredCount: syntheticMessages.length
}, 'Metadata-based filtering applied to thread history');
```

**INFO Level** (summary statistics, production monitoring):
```typescript
logger.info({
  threadId: context.threadId,
  filteredSyntheticCount: 3,
  totalMessages: 15
}, 'Filtered 3 synthetic messages from thread history');

logger.info({
  threadId: state.threadId,
  fallbackUsed: 'conversation_summary'
}, 'Memory query used fallback strategy due to synthetic trigger');
```

**ERROR Level** (edge cases, misconfigurations):
```typescript
logger.error({
  threadId: state.threadId,
  agentId: state.agentId,
  triggerType: timerContext.followUpType
}, 'Autonomous message triggered on empty thread - misconfiguration detected');
```

**Structured Fields**:
- `threadId`: Always included for correlation
- `agentId`: Included when available
- `triggerType`: Autonomous trigger context
- `syntheticFlag`: Metadata field value
- `querySource`: Memory retrieval strategy used
- `filteredCount`: Number of messages filtered

**Benefits**:
- **Production-friendly**: INFO level shows summaries without flooding logs
- **Debug-ready**: DEBUG level provides complete audit trail when needed
- **Alertable**: ERROR level only for genuine issues (misconfiguration)
- **Correlatable**: Structured fields enable log aggregation and filtering

**Alternatives Considered**:
- ❌ Single log level (INFO): Too noisy with trace events
- ❌ Verbose logging always: Production performance impact
- ✅ Three-tier strategy: Balances observability with operational practicality

---

## Summary of Research Findings

### Confirmed Assumptions
1. ✅ `HumanMessage.additional_kwargs` supported by LangChain Core 0.3.77
2. ✅ LangGraph PostgreSQL checkpointer preserves metadata through serialization
3. ✅ Metadata-based filtering more robust than content pattern matching
4. ✅ Memory retrieval can detect synthetic messages via metadata
5. ✅ Pino structured logging supports metadata observability

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Use `additional_kwargs` for metadata | Native LangChain pattern, checkpoint-serialized, type-safe |
| Pure metadata filtering (no content checks) | Future-proof for multimodal, eliminates coupling |
| Last real user message as query source | Optimal semantic relevance for memory retrieval |
| Context-aware natural prompts per trigger | Balances agent guidance with natural conversation flow |
| DEBUG/INFO/ERROR log levels | Production-friendly observability without noise |
| Startup validation for metadata persistence | Fail fast on infrastructure failure, prevent silent data loss |

### Implementation Complexity Assessment

**Low Complexity** (straightforward changes):
- SessionProcessor: Create HumanMessage with metadata instead of plain string
- Thread filtering: Replace `content.startsWith()` with `additional_kwargs?.synthetic` check
- Logging: Add structured fields to existing Pino logger calls

**Medium Complexity** (logic changes):
- Memory nodes: Detect synthetic via metadata, iterate backwards to find real user message, handle fallback cases
- LangGraphAgent: Accept both string and HumanMessage inputs (type union)

**Testing Complexity**:
- Deterministic fixtures with metadata (easy)
- Checkpoint serialization validation (requires test database)
- Edge case coverage (empty threads, multimodal content)

### No Blockers Identified
- All dependencies available in current stack (LangChain Core 0.3.77, LangGraph 0.4.9)
- No database schema changes required
- No new libraries needed
- Backward compatible with existing autonomous timer infrastructure

---

## Next Steps

Proceed to **Phase 1: Design & Contracts**
- Data model: Message metadata structure, trigger type enum
- API contracts: No external API changes (internal refactoring only)
- Quickstart: Update local development setup if needed
- Agent context update: Document new metadata patterns
