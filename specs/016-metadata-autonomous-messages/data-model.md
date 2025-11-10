# Data Model: Metadata-Based Autonomous Message Tagging

**Feature**: 016-metadata-autonomous-messages  
**Date**: 2025-11-10

## Entity Definitions

### MessageMetadata

**Purpose**: Invisible metadata attached to HumanMessage objects to mark autonomous/synthetic messages

**Structure** (TypeScript):
```typescript
interface MessageMetadata {
  /**
   * Boolean flag indicating message is synthetic (autonomous trigger)
   * - `true`: Message created by system (timer-triggered autonomous response)
   * - `false` or `undefined`: Real user message
   */
  synthetic: boolean;
  
  /**
   * Type of autonomous trigger that created this message
   * Only present when synthetic === true
   */
  trigger_type?: 'check_in' | 'question_unanswered' | 'task_incomplete' | 'waiting_for_decision';
  
  /**
   * Optional reason/context for autonomous trigger
   * Provides additional context for debugging/logging
   */
  trigger_reason?: string;
}
```

**Storage**: Embedded in `HumanMessage.additional_kwargs` property (LangChain standard)

**Persistence**: Serialized with LangGraph checkpoints in PostgreSQL (standard BaseMessage behavior)

**Validation Rules**:
- `synthetic` MUST be boolean (strict `=== true` checks prevent false positives)
- `trigger_type` MUST be one of four valid enum values when present
- `trigger_reason` is optional, human-readable string

---

### AutonomousTriggerType

**Purpose**: Enumeration of valid autonomous message trigger contexts

**Values**:

| Value | Description | Natural Prompt Template |
|-------|-------------|------------------------|
| `check_in` | General conversation continuation after silence | "Continue our conversation naturally." |
| `question_unanswered` | Follow-up on unanswered user question | "The user asked a question but hasn't responded. Follow up on it." |
| `task_incomplete` | Reminder about incomplete task | "Check in about the incomplete task we discussed." |
| `waiting_for_decision` | Prompt about pending decision | "Follow up on the decision the user needs to make." |

**Implementation**:
```typescript
// Type-safe enum (prefer union type over JS enum)
type AutonomousTriggerType = 
  | 'check_in' 
  | 'question_unanswered' 
  | 'task_incomplete' 
  | 'waiting_for_decision';

// Mapping to natural prompts
const TRIGGER_PROMPTS: Record<AutonomousTriggerType, string> = {
  'check_in': 'Continue our conversation naturally.',
  'question_unanswered': 'The user asked a question but hasn\'t responded. Follow up on it.',
  'task_incomplete': 'Check in about the incomplete task we discussed.',
  'waiting_for_decision': 'Follow up on the decision the user needs to make.',
};
```

**Usage Context**: SessionProcessor maps timer event payload to trigger type, selects corresponding prompt

---

### HumanMessage with Metadata

**Purpose**: Extended HumanMessage construction pattern for synthetic messages

**Standard Message** (user-initiated):
```typescript
import { HumanMessage } from '@langchain/core/messages';

const message = new HumanMessage(userInput);
// No metadata - real user message
```

**Synthetic Message** (autonomous trigger):
```typescript
import { HumanMessage } from '@langchain/core/messages';

const message = new HumanMessage({
  content: TRIGGER_PROMPTS[triggerType],
  additional_kwargs: {
    synthetic: true,
    trigger_type: triggerType,
    trigger_reason: timerContext?.reason
  }
});
```

**Type Union** (LangGraphAgent input):
```typescript
// Agent must accept both forms
type MessageInput = string | HumanMessage;

// Convert to HumanMessage internally
const humanMessage = typeof input === 'string' 
  ? new HumanMessage(input)
  : input;
```

---

## State Transitions

### Autonomous Message Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AUTONOMOUS MESSAGE LIFECYCLE                      │
└─────────────────────────────────────────────────────────────────────┘

1. TIMER FIRES
   ↓
   [SessionProcessor receives timer event]
   ↓
2. MESSAGE CREATION
   ├─ Extract trigger type from timer payload
   ├─ Select natural prompt: TRIGGER_PROMPTS[triggerType]
   ├─ Create HumanMessage with metadata:
   │    { content: prompt, additional_kwargs: { synthetic: true, trigger_type, trigger_reason } }
   └─ LOG (DEBUG): "Created synthetic message with metadata"
   ↓
3. GRAPH INVOCATION
   ├─ LangGraphAgent receives HumanMessage object (not string)
   ├─ Passes to graph.stream() as part of state
   └─ Metadata preserved in state.messages array
   ↓
4. MEMORY RETRIEVAL NODE
   ├─ Check last message: msg.additional_kwargs?.synthetic === true
   ├─ IF synthetic:
   │    ├─ Find last REAL user message (backwards iteration)
   │    ├─ Fallback to conversation summary if no user messages
   │    └─ LOG (DEBUG): "Metadata detected, using alternative query source"
   └─ IF not synthetic: use message content as query
   ↓
5. AGENT PROCESSING
   ├─ LLM sees natural prompt (e.g., "Continue our conversation naturally")
   ├─ Responds without meta-commentary
   └─ Metadata invisible to LLM context
   ↓
6. CHECKPOINT PERSISTENCE
   ├─ LangGraph saves state to PostgreSQL checkpoint
   ├─ HumanMessage serialized with additional_kwargs intact
   └─ Startup validation ensures metadata preserved
   ↓
7. THREAD HISTORY FILTERING
   ├─ Thread service extracts messages from checkpoints
   ├─ Filter out synthetic: msg.additional_kwargs?.synthetic === true
   ├─ LOG (INFO): "Filtered 3 synthetic messages from thread history"
   └─ Return only real user/AI messages to client
```

### Edge Case State Transitions

#### Empty Thread Misconfiguration

```
TIMER FIRES on empty thread (no prior user messages)
   ↓
[Memory retrieval node detects synthetic + no real user messages + no summary]
   ↓
LOG (ERROR): "Autonomous message triggered on empty thread - misconfiguration"
   ↓
SKIP memory retrieval (return empty array)
   ↓
PROCEED with agent invocation using empty context (fail operational)
```

#### Metadata Persistence Failure

```
SERVER STARTUP
   ↓
RUN validation test:
   ├─ Create test HumanMessage with metadata
   ├─ Save to checkpoint via graph.stream()
   ├─ Restore from checkpoint
   └─ Verify additional_kwargs.synthetic === true
   ↓
IF metadata lost:
   ├─ LOG (ERROR): "Checkpoint metadata integrity test failed"
   └─ ABORT server startup (fail fast)
ELSE:
   └─ CONTINUE normal startup
```

---

## Relationships

### Message → Metadata (1:1)

- Each HumanMessage optionally has metadata in `additional_kwargs`
- Metadata lifecycle bound to message lifecycle (checkpoint persistence)
- No separate metadata store required

### Message → TriggerType (N:1)

- Multiple messages can have same trigger type
- Trigger type determines natural prompt content
- No database foreign key (enum value embedded in metadata)

### Thread → Messages (1:N)

- Thread history contains mix of real and synthetic messages
- Filtering logic separates based on metadata
- Synthetic messages never surfaced to clients

---

## Validation Rules

### Metadata Structure

1. **Synthetic flag validation**:
   ```typescript
   if (msg.additional_kwargs?.synthetic === true) {
     // Treat as synthetic
   }
   ```
   - Strict equality (`===`) prevents type coercion bugs
   - Falsy values (undefined, false, null) treated as real user messages

2. **Trigger type validation**:
   ```typescript
   const VALID_TRIGGERS: AutonomousTriggerType[] = [
     'check_in', 'question_unanswered', 
     'task_incomplete', 'waiting_for_decision'
   ];
   
   if (metadata.synthetic && !VALID_TRIGGERS.includes(metadata.trigger_type!)) {
     logger.warn({ triggerType: metadata.trigger_type }, 'Invalid trigger type');
   }
   ```

3. **Content structure invariance**:
   - Filtering logic MUST NOT inspect message content
   - Metadata is single source of truth for synthetic detection
   - Works for string, multimodal (text+images), array content

### Checkpoint Integrity

**Startup validation test** (fail fast strategy):
```typescript
async function validateCheckpointMetadata() {
  const testMessage = new HumanMessage({
    content: 'Test message for metadata validation',
    additional_kwargs: { synthetic: true, trigger_type: 'check_in' }
  });
  
  // Save to checkpoint
  const checkpointSaver = new PostgresSaver(connectionString);
  await checkpointSaver.put({ messages: [testMessage] }, { thread_id: 'test' });
  
  // Restore from checkpoint
  const restored = await checkpointSaver.get({ thread_id: 'test' });
  const restoredMessage = restored.messages[0];
  
  // Verify metadata preserved
  if (restoredMessage.additional_kwargs?.synthetic !== true) {
    throw new Error('Checkpoint metadata integrity test failed - metadata not preserved');
  }
}
```

---

## Performance Considerations

### Metadata Overhead

- **Creation**: Negligible (<1ms) - object property assignment
- **Serialization**: Included in standard checkpoint blob (no additional I/O)
- **Filtering**: Direct property access O(1) vs. string parsing O(n)
- **Memory**: ~50 bytes per synthetic message (boolean + string enum)

### Comparison: Content-Based vs. Metadata-Based

| Operation | Content-Based | Metadata-Based | Improvement |
|-----------|---------------|----------------|-------------|
| Filter check | `content.startsWith('[AUTONOMOUS_FOLLOWUP:')` | `msg.additional_kwargs?.synthetic === true` | 10x faster |
| Multimodal support | Requires type checking + iteration | Single property check | Simplified |
| Log verbosity | Must log content snippet | Log metadata fields only | Cleaner |

---

## Migration Strategy

### Backward Compatibility

**Old synthetic messages** (created before this feature):
- Content: `"[AUTONOMOUS_FOLLOWUP: check_in]"`
- Metadata: None

**Handling**:
- Thread filtering: Keep content-based filter temporarily as fallback
- Memory retrieval: Treat absence of metadata as "potentially synthetic" and inspect content
- Cleanup: Synthetic messages age out of checkpoints naturally (retention policy)

**Transition Period**:
1. Deploy metadata-based creation (SessionProcessor updated)
2. Add metadata checks alongside content checks (dual filtering)
3. Monitor logs for content-based matches (should decrease to zero)
4. Remove content-based filters in follow-up release

---

## Testing Strategy

### Unit Tests

**Metadata Creation**:
```typescript
test('creates synthetic message with metadata', () => {
  const message = new HumanMessage({
    content: TRIGGER_PROMPTS['check_in'],
    additional_kwargs: {
      synthetic: true,
      trigger_type: 'check_in',
      trigger_reason: 'No activity for 30s'
    }
  });
  
  expect(message.additional_kwargs.synthetic).toBe(true);
  expect(message.additional_kwargs.trigger_type).toBe('check_in');
});
```

**Metadata Detection**:
```typescript
test('detects synthetic message in memory retrieval', () => {
  const state = {
    messages: [
      new HumanMessage({ content: 'Real message' }), // No metadata
      new HumanMessage({ 
        content: 'Synthetic prompt',
        additional_kwargs: { synthetic: true, trigger_type: 'check_in' }
      })
    ],
    threadId: 'test',
    agentId: 'agent1',
    userId: 'user1'
  };
  
  const lastMessage = state.messages[state.messages.length - 1];
  expect(lastMessage.additional_kwargs?.synthetic).toBe(true);
});
```

**Thread Filtering**:
```typescript
test('filters synthetic messages from thread history', () => {
  const messages = [
    new HumanMessage('User: Hello'),
    new HumanMessage({ 
      content: 'Continue naturally',
      additional_kwargs: { synthetic: true, trigger_type: 'check_in' }
    }),
    new AIMessage('Agent: Hi there!')
  ];
  
  const filtered = messages.filter(msg => 
    !msg.additional_kwargs?.synthetic
  );
  
  expect(filtered).toHaveLength(2); // User + AI only
});
```

### Integration Tests

**Checkpoint Persistence** (uses test database):
```typescript
test('preserves metadata through checkpoint save/restore', async () => {
  const message = new HumanMessage({
    content: 'Test',
    additional_kwargs: { synthetic: true, trigger_type: 'check_in' }
  });
  
  // Save via graph
  await graph.stream({ messages: [message] }, config);
  
  // Restore from checkpoint
  const state = await checkpointer.get(config);
  const restored = state.messages.find(m => m.content === 'Test');
  
  expect(restored.additional_kwargs?.synthetic).toBe(true);
  expect(restored.additional_kwargs?.trigger_type).toBe('check_in');
});
```

---

## Future Extensibility

### Potential Metadata Fields

```typescript
interface ExtendedMessageMetadata {
  synthetic: boolean;
  trigger_type?: AutonomousTriggerType;
  trigger_reason?: string;
  
  // Future additions:
  source_agent_id?: string;        // Multi-agent: which agent created this
  tool_triggered?: boolean;        // Tool-generated synthetic messages
  retry_count?: number;            // Autonomous retry attempts
  priority?: 'low' | 'medium' | 'high'; // Scheduling priority
}
```

### Metadata-Based Analytics

- Track autonomous message effectiveness (response rate by trigger type)
- Measure memory retrieval fallback frequency
- Monitor metadata persistence failures
- A/B test natural prompt variations
