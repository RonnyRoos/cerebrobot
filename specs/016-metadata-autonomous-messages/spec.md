# Feature Specification: Metadata-Based Autonomous Message Tagging

**Feature Branch**: `016-metadata-autonomous-messages`  
**Created**: 2025-11-10  
**Status**: Draft  
**Input**: Implement metadata-based tagging for autonomous messages to prevent system message leakage and enable clean filtering without content pollution

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Natural Autonomous Follow-ups (Priority: P1)

Users receive autonomous follow-up messages from their agent that feel natural and contextually appropriate, without any meta-commentary about system infrastructure or "incomplete messages."

**Why this priority**: This is the core value proposition - fixing the immediate user experience issue where agents respond to internal triggers with confused statements like "I see you mentioned an incomplete message."

**Independent Test**: Can be fully tested by triggering an autonomous check-in after 30 seconds of silence and verifying the agent's response is natural and on-topic, without any references to system messages, autonomous triggers, or incomplete content.

**Acceptance Scenarios**:

1. **Given** a conversation about pizza preferences has been idle for 30 seconds, **When** an autonomous check-in timer fires, **Then** the agent sends a natural follow-up like "By the way, did you have any other questions about pizza?" without mentioning system triggers
2. **Given** a user asked a question but hasn't responded for 60 seconds, **When** an autonomous follow-up fires, **Then** the agent naturally re-engages without saying "I see you sent a follow-up request"
3. **Given** multiple autonomous messages trigger in sequence, **When** the agent responds to each, **Then** each response is contextually natural without accumulated confusion about system state

---

### User Story 2 - Relevant Memory Retrieval During Autonomous Messages (Priority: P2)

When autonomous messages trigger, the system retrieves memories based on the actual conversation context rather than searching for semantically similar words to system trigger phrases like "autonomous followup" or "check in."

**Why this priority**: This ensures memory retrieval during autonomous interactions is as relevant as during user-initiated messages, preventing weird memory matches and improving response quality.

**Independent Test**: Can be tested by storing memories about specific topics (e.g., "user's work project"), triggering an autonomous message, and verifying retrieved memories are contextually relevant to the conversation rather than containing words like "followup," "check," or "incomplete."

**Acceptance Scenarios**:

1. **Given** previous conversation included "user has incomplete work project" stored as memory, **When** autonomous check-in triggers, **Then** memory search uses the last real user message as query context, retrieving work-related memories
2. **Given** no recent user messages exist (only autonomous triggers), **When** memory retrieval occurs, **Then** system uses conversation summary as query fallback instead of synthetic trigger text
3. **Given** user asked about vacation plans 2 minutes ago, **When** autonomous follow-up fires, **Then** retrieved memories relate to vacation/travel, not to system infrastructure terms

---

### User Story 3 - Clean Thread History (Priority: P3)

Users viewing their conversation history never see internal system triggers or synthetic messages - only their actual messages and the agent's natural responses.

**Why this priority**: Maintains conversation clarity and professionalism by hiding infrastructure details from end users while preserving the ability to debug and audit system behavior through metadata.

**Independent Test**: Can be tested by triggering autonomous messages, then fetching thread history via API and verifying no synthetic messages with `[AUTONOMOUS_FOLLOWUP]` markers appear, only natural conversation flow.

**Acceptance Scenarios**:

1. **Given** autonomous check-in has been sent, **When** user loads conversation history, **Then** history shows only user messages and agent responses, with no synthetic messages visible
2. **Given** multiple autonomous triggers occurred, **When** developer inspects message metadata in database, **Then** synthetic messages are tagged with `synthetic: true` flag in `additional_kwargs`
3. **Given** conversation includes both user-initiated and autonomous messages, **When** history is filtered for display, **Then** filtering uses ONLY metadata checks (`additional_kwargs.synthetic`), zero content pattern matching occurs
4. **Given** message has multimodal content (text + images), **When** filtering logic executes, **Then** only metadata flag is checked, content structure is completely ignored

---

### User Story 4 - Support All Existing Autonomous Trigger Types (Priority: P1)

All currently implemented autonomous message types (check-in, question-unanswered, task-incomplete, waiting-for-decision) continue to work with natural language prompts appropriate to each trigger context.

**Why this priority**: Migration must be backward-compatible with existing autonomous system design - we're changing implementation, not removing features.

**Independent Test**: Can be tested by triggering each autonomous message type and verifying each receives a contextually appropriate natural prompt that the agent can respond to naturally.

**Acceptance Scenarios**:

1. **Given** check-in timer fires, **When** message is created, **Then** content is natural prompt like "Continue our conversation naturally" with metadata `trigger_type: 'check_in'`
2. **Given** question-unanswered timer fires, **When** message is created, **Then** content prompts follow-up on unanswered question with metadata `trigger_type: 'question_unanswered'`
3. **Given** task-incomplete timer fires, **When** message is created, **Then** content prompts about incomplete task with metadata `trigger_type: 'task_incomplete'`
4. **Given** waiting-for-decision timer fires, **When** message is created, **Then** content prompts about pending decision with metadata `trigger_type: 'waiting_for_decision'`

---

### Edge Cases

- **Brand new conversation with no context**: When autonomous message fires but no previous user messages exist in thread, system skips memory retrieval, logs ERROR (misconfiguration), proceeds with autonomous response using empty context
- **Empty conversation summary fallback**: System uses generic fallback query or skips memory retrieval when conversation summary is also empty
- **Metadata persistence failure**: If `additional_kwargs` metadata gets stripped during checkpoint serialization/deserialization, system fails fast on startup validation (create test message with metadata, save checkpoint, restore, verify integrity - abort server startup if test fails)
- **Multimodal content filtering**: System relies purely on metadata checking (`additional_kwargs.synthetic === true`) regardless of content structure (string, array, multimodal blocks)
- **Summary contains trigger descriptions**: Memory query uses last real user message as primary source; summary fallback only when no user messages exist

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST create autonomous messages using LangChain HumanMessage objects with natural language content and invisible metadata tags
- **FR-002**: System MUST tag all synthetic autonomous messages with `additional_kwargs.synthetic = true` metadata flag
- **FR-003**: System MUST include trigger type context in metadata field `additional_kwargs.trigger_type` (e.g., 'check_in', 'question_unanswered', 'task_incomplete', 'waiting_for_decision')
- **FR-004**: System MUST preserve metadata through LangGraph state serialization and checkpoint persistence
- **FR-005**: Memory retrieval node MUST detect synthetic messages via metadata check (`additional_kwargs.synthetic === true`) and use alternative query source (last real user message or conversation summary), never using synthetic message content as query
- **FR-006**: Thread history filtering MUST use ONLY metadata checks (`additional_kwargs.synthetic === true`), completely eliminating content pattern matching regardless of message content structure (string, multimodal, or array)
- **FR-007**: System MUST provide natural language prompts appropriate to each autonomous trigger type:
  - **check_in**: "Continue our conversation naturally."
  - **question_unanswered**: "The user asked a question but hasn't responded. Follow up on it."
  - **task_incomplete**: "Check in about the incomplete task we discussed."
  - **waiting_for_decision**: "Follow up on the decision the user needs to make."
- **FR-008**: LangGraphAgent MUST handle both string messages (user-initiated) and HumanMessage objects (autonomous triggers) when invoking graph
- **FR-009**: System MUST maintain backward compatibility with existing autonomous timer infrastructure (TimerWorker, PolicyGates, event queue)
- **FR-010**: System MUST emit structured log events at appropriate levels for observability:
  - **DEBUG level**: Synthetic message creation (with metadata fields), metadata detection during memory retrieval, metadata-based filtering during thread history assembly
  - **INFO level**: Summary statistics (e.g., "Filtered 3 synthetic messages from thread history", "Memory query used fallback strategy due to synthetic trigger")
  - **ERROR level**: Edge cases (e.g., "Autonomous message triggered on empty thread - misconfiguration detected")
  - Log events MUST include sufficient context (thread ID, agent ID, trigger type) for debugging without requiring verbose mode in production

### Key Entities

- **HumanMessage with Metadata**: LangChain message object containing:
  - `content`: Natural language prompt text (visible to LLM)
  - `additional_kwargs`: Metadata object containing:
    - `synthetic`: Boolean flag indicating synthetic message
    - `trigger_type`: String identifying autonomous trigger type
    - `trigger_reason`: Optional string with additional context
- **Autonomous Message Types**: Enumeration of trigger contexts:
  - `check_in`: General conversation continuation after silence
  - `question_unanswered`: Follow-up on unanswered user question
  - `task_incomplete`: Reminder about incomplete task
  - `waiting_for_decision`: Prompt about pending decision
- **Memory Query Context**: Source for semantic search during memory retrieval:
  - Primary: Last real (non-synthetic) user message
  - Fallback: Conversation summary
  - Never: Synthetic message content

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of autonomous follow-up messages result in natural agent responses with zero meta-commentary about system triggers, infrastructure, or incomplete messages (measured by manual review and keyword detection)
- **SC-002**: Memory retrieval during autonomous messages produces contextually relevant results with semantic similarity scores comparable to user-initiated messages (within 5% variance)
- **SC-003**: Thread history API responses contain zero synthetic messages with `[AUTONOMOUS_FOLLOWUP]` markers (100% filtering success rate)
- **SC-004**: All four existing autonomous trigger types (check-in, question-unanswered, task-incomplete, waiting-for-decision) continue to function with natural conversation flow post-migration
- **SC-005**: Message metadata persists through checkpoint save/restore cycles with 100% fidelity (no data loss in `additional_kwargs`)
- **SC-006**: Developer debugging efficiency improves - ability to identify synthetic messages via metadata check in logs without parsing content strings
- **SC-007**: Zero regression in autonomous message delivery rate or timing behavior compared to pre-migration baseline
- **SC-008**: Log output during autonomous conversation flow includes DEBUG-level creation/detection/filtering events and INFO-level summary statistics, with no ERROR-level noise in normal operation (ERROR only emitted for edge case: empty thread misconfiguration)

## Scope

### In Scope

- Updating SessionProcessor to create HumanMessage objects with metadata for autonomous triggers
- Modifying LangGraphAgent to accept both string and HumanMessage inputs
- Enhancing memory retrieval logic to detect synthetic messages and use alternative query sources
- Converting thread history filter from content-based to metadata-based
- Creating natural language prompts for all four autonomous trigger types
- Adding structured logging for synthetic message creation and handling
- Testing metadata persistence through checkpoint serialization

### Out of Scope

- Changing autonomous timer logic, scheduling, or policy gates
- Modifying LangGraph checkpoint schema or database tables
- Altering conversation summarization logic
- Changing LLM system prompts or persona instructions
- Adding new autonomous trigger types (maintain existing four)
- Refactoring event queue or effect runner architecture
- UI changes to display autonomous message indicators

## Assumptions

- LangChain's `HumanMessage` class supports `additional_kwargs` parameter and preserves it through LangGraph state management
- LangGraph checkpoint serialization includes message metadata fields (standard behavior for BaseMessage subclasses)
- Current memory retrieval semantic search accepts any string query (last user message, summary, or fallback)
- Thread history filter receives complete BaseMessage objects with accessible `additional_kwargs` property
- Conversation summaries do not contain synthetic message content (only real user/AI messages are summarized)
- Natural language prompts are sufficient to trigger appropriate agent responses without explicit trigger type in content

## Dependencies

- **LangChain Core** (`@langchain/core/messages`): HumanMessage class with metadata support
- **LangGraph Checkpointer**: Must preserve `additional_kwargs` during state persistence
- **Existing Autonomous System**: TimerWorker, event queue, SessionProcessor infrastructure
- **Memory Store**: Semantic search capability accepting variable query sources
- **Thread Service**: Message filtering and history API

## Non-Functional Requirements

- **Performance**: Message creation and metadata checks add negligible latency (<5ms overhead per message)
- **Reliability**: Metadata-based filtering has 100% accuracy (code-enforced, not LLM-dependent)
- **Maintainability**: Single metadata check pattern (`msg.additional_kwargs?.synthetic`) used consistently across codebase
- **Debuggability**: Structured logs include metadata fields for tracing synthetic message flow (see FR-010 for log level strategy)
- **Observability**: Operators can trace autonomous message lifecycle through logs without enabling verbose logging that creates production noise (DEBUG for trace, INFO for summaries, ERROR for edge cases)
- **Backward Compatibility**: Existing autonomous timers continue to trigger; migration is internal to message representation

## Security & Privacy

- Metadata fields do not contain user PII (only trigger type and synthetic flag)
- Synthetic messages filtered from user-facing history maintain conversation privacy
- Logging of metadata respects existing data retention and privacy policies

## Clarifications

### Session 2025-11-10

- Q: When an autonomous message fires in a brand new conversation with no prior user messages and no conversation summary, what should happen? → A: Skip memory retrieval entirely, log an ERROR (indicating misconfiguration since timers should not fire on empty threads), proceed with autonomous response using empty context, and allow conversation to continue (fail operational approach)
- Q: If `additional_kwargs` metadata gets stripped during checkpoint serialization (violating the assumption), what should the system do? → A: Fail fast on startup validation
- Q: When filtering thread history, if a message has multimodal content (array of text/image blocks), should the system check each text block for synthetic markers, or rely purely on metadata? → A: Rely purely on metadata checking (`additional_kwargs.synthetic`), ignore content structure entirely
- Q: Which log events should be emitted for synthetic message observability (creation, detection, filtering)? → A: Comprehensive logging at all decision points (Option D) with log level differentiation - DEBUG for trace events, INFO for summaries, ERROR for edge cases - to provide complete audit trail without production noise
- Q: Should natural language prompts be generic or context-aware for different trigger types? → A: Use context-aware prompts per FR-007 (Option B) - each trigger type gets a specific prompt that guides appropriate agent behavior while maintaining natural conversation flow

## Future Considerations

- Extensibility: Metadata pattern enables future synthetic message types (multi-agent communication, tool-triggered messages) without changing filtering logic
- Configuration: Per-agent customizable natural language prompts for autonomous triggers
- Analytics: Metadata enables tracking autonomous message effectiveness (response rate, engagement quality) without content parsing
- Multi-Agent: Metadata could tag message source agent for inter-agent communication filtering
