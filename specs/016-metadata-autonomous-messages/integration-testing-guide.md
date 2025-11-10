# Integration Testing Guide: Metadata-Based Autonomous Messages

**Purpose**: Validate end-to-end functionality of all 4 autonomous trigger types with metadata-based architecture.

**Related Task**: T034 - Final integration test (manual)

---

## Prerequisites

1. **Backend running**: `docker compose up` or `pnpm dev`
2. **Test agent configured**: Use `autonomy-test-agent.json` with:
   - `autonomy.enabled: true`
   - Short delays for faster testing (e.g., `minDelayMs: 5000` = 5 seconds)
   - `maxFollowUpsPerSession: 3` to allow multiple triggers
3. **Browser console open**: Monitor for errors, check network requests
4. **Server logs visible**: Watch for metadata logging (DEBUG/INFO levels)

---

## Test Scenarios

### Scenario 1: `check_in` Trigger (Default)

**Goal**: Verify general conversation continuation after silence.

**Steps**:
1. Start a new thread with the autonomy-test-agent
2. Send a casual message: "Hey, how are you?"
3. Wait for agent response
4. **Stop responding** - wait for autonomy timer to fire (default: 30 seconds, or configured delay)
5. Observe autonomous follow-up message

**Expected Behavior**:
- ✅ Agent sends natural follow-up (e.g., "How's our conversation going?")
- ✅ Server logs show:
  ```json
  {
    "trigger_type": "check_in",
    "selected_prompt": "Continue our conversation naturally.",
    "detected_synthetic": true
  }
  ```
- ✅ Thread history API does NOT show the autonomous follow-up (filtered out)
- ✅ Agent response to follow-up is natural (no meta-commentary about timers)

**Validation**:
```bash
# Check server logs for metadata
docker compose logs -f backend | grep "trigger_type"

# Verify thread history filtering
curl http://localhost:3000/api/threads/{threadId} | jq '.messages'
# Should NOT contain synthetic messages
```

---

### Scenario 2: `question_unanswered` Trigger

**Goal**: Verify follow-up when agent asks a question but user doesn't answer.

**Steps**:
1. Start a new thread
2. Ask a question that prompts the agent to ask YOU a question:
   - User: "I'm thinking about learning a new programming language"
   - Agent: "That's great! Which languages are you considering?"
3. **Do not answer the agent's question** - wait for timer
4. Observe autonomous follow-up

**Expected Behavior**:
- ✅ Agent sends gentle follow-up about their unanswered question
  - Example: "Just checking in - did you get a chance to think about which languages you're considering?"
- ✅ Server logs show:
  ```json
  {
    "trigger_type": "question_unanswered",
    "selected_prompt": "You asked the user a question but they haven't answered. Follow up gently."
  }
  ```
- ✅ Follow-up is contextually relevant (references the original question)
- ✅ Memory retrieval uses last real user message ("I'm thinking about learning...") NOT the synthetic prompt

**Validation**:
```bash
# Check memory retrieval query source
docker compose logs -f backend | grep "querySource"
# Should show: "querySource": "last_real_user_message"

# Verify metadata detection
docker compose logs -f backend | grep "detected_synthetic"
```

---

### Scenario 3: `task_incomplete` Trigger

**Goal**: Verify reminder about incomplete tasks.

**Steps**:
1. Start a new thread
2. Mention a task you need to do:
   - User: "I need to write a project report by Friday"
   - Agent: "I can help with that! Would you like tips on structuring it?"
3. Continue conversation but **don't complete or mention completing the task**
4. Wait for timer to fire

**Expected Behavior**:
- ✅ Agent sends reminder/check-in about the incomplete task
  - Example: "How's the project report coming along? Need any help getting started?"
- ✅ Server logs show:
  ```json
  {
    "trigger_type": "task_incomplete",
    "selected_prompt": "Check in about the incomplete task we discussed."
  }
  ```
- ✅ Follow-up references the specific task (report writing)
- ✅ Tone is helpful, not pushy

**Validation**:
- Agent demonstrates memory of the task context
- Follow-up is natural, not meta ("I'm checking in because my timer fired")

---

### Scenario 4: `waiting_for_decision` Trigger

**Goal**: Verify follow-up when user has a pending decision.

**Steps**:
1. Start a new thread
2. Present a decision you need to make:
   - User: "Should I use React or Vue for my new project? I can't decide."
   - Agent: "Both are great choices! What's most important to you - ecosystem size, learning curve, or performance?"
3. Engage briefly but **don't make a decision**
4. Wait for timer

**Expected Behavior**:
- ✅ Agent follows up about the pending decision
  - Example: "Have you had a chance to think more about React vs Vue? I'm happy to help you weigh the options."
- ✅ Server logs show:
  ```json
  {
    "trigger_type": "waiting_for_decision",
    "selected_prompt": "Follow up on the decision the user needs to make."
  }
  ```
- ✅ Follow-up is supportive and re-engages the decision-making process

---

## Cross-Cutting Validations

### 1. Metadata Persistence (All Scenarios)

**Verify checkpoint storage**:
```sql
-- Connect to PostgreSQL
psql -h localhost -U postgres -d cerebrobot

-- Check checkpoint metadata
SELECT 
  checkpoint_id,
  thread_id,
  channel_values::jsonb -> 'messages' -> -1 -> 'additional_kwargs' as last_message_metadata
FROM checkpoints
WHERE thread_id = '<your-thread-id>'
ORDER BY checkpoint_id DESC
LIMIT 1;

-- Should show:
-- {
--   "synthetic": true,
--   "trigger_type": "<trigger-type>",
--   "trigger_reason": "..."
-- }
```

### 2. Thread History Filtering (All Scenarios)

**Verify synthetic messages are hidden**:
```bash
# Get thread history via API
curl http://localhost:3000/api/threads/{threadId} | jq '.messages[] | select(.content | contains("Continue our conversation"))'

# Should return EMPTY (synthetic messages filtered out)
```

**Check UI**:
- Open Thread History view in client app
- Autonomous follow-up prompts should NOT appear
- Only real user messages and agent responses visible

### 3. Memory Retrieval Context (Scenarios with synthetic messages)

**Verify backward iteration**:
```bash
# Check server logs when autonomous message triggers memory retrieval
docker compose logs -f backend | grep "Using last real user message"

# Should find last NON-synthetic HumanMessage for query
```

**Fallback to summary**:
- Start new thread with ONLY an autonomous check-in (edge case)
- Verify logs show: `"querySource": "conversation_summary"`

### 4. Logging Observability (All Scenarios)

**DEBUG logs** (per synthetic message):
```json
{
  "level": 20,
  "trigger_type": "check_in",
  "selected_prompt": "Continue our conversation naturally.",
  "msg": "Trigger prompt selection"
}
```

**INFO logs** (statistics):
```json
{
  "level": 30,
  "totalMessages": 12,
  "filteredCount": 2,
  "visibleMessages": 10,
  "msg": "Extracted messages from thread checkpoint"
}
```

---

## Performance Validation (T036)

While testing each scenario, measure metadata operation overhead:

**What to measure**:
1. **Creation overhead**: Time to create HumanMessage with metadata
2. **Detection overhead**: Time for `isHumanMessage()` + metadata extraction
3. **Filtering overhead**: Time to filter synthetic messages from thread history

**Target**: <5ms total overhead per message operation

**How to measure**:
```typescript
// Add instrumentation in SessionProcessor.ts
const startCreate = performance.now();
const message = new HumanMessage({ content: naturalPrompt, additional_kwargs: metadata });
const createMs = performance.now() - startCreate;
logger.debug({ createMs }, 'Metadata creation timing');

// Add instrumentation in memory/nodes.ts
const startDetect = performance.now();
const metadata = lastMessage.additional_kwargs as MessageMetadata | undefined;
const isSynthetic = metadata?.synthetic === true;
const detectMs = performance.now() - startDetect;
logger.debug({ detectMs }, 'Metadata detection timing');
```

**Expected results**:
- Creation: <1ms (object spread operation)
- Detection: <0.5ms (property access + equality check)
- Filtering: <2ms (array filter with type guard)
- **Total**: <5ms per message

---

## Timer Backward Compatibility (T035)

**Goal**: Verify autonomous timer infrastructure (spec 009) works correctly with new metadata system.

**Test all 4 trigger types**:
1. Run all 4 scenarios above
2. Verify timers fire on schedule (check `delaySeconds` from autonomy evaluator)
3. Confirm trigger types are correctly passed through:
   - Evaluator LLM → `followUpType` field
   - Timer event payload → SessionProcessor
   - SessionProcessor → `trigger_type` in metadata

**Validation**:
```bash
# Check timer scheduling
docker compose logs -f backend | grep "schedule_timer"

# Verify timer firing
docker compose logs -f backend | grep "Processing timer event"

# Confirm trigger type mapping
docker compose logs -f backend | grep "followUpType"
```

**Edge cases**:
- ✅ Multiple timers in same session (up to `maxFollowUpsPerSession`)
- ✅ Timer cancellation if user responds before firing
- ✅ Timer respects `minDelayMs` and `maxDelayMs` limits

---

## Success Criteria

### T034: Integration Testing ✅

- [ ] All 4 trigger types tested in real conversations
- [ ] Natural language prompts elicit appropriate agent responses
- [ ] No meta-commentary about system infrastructure in agent responses
- [ ] Memory retrieval uses real user context (not synthetic prompts)
- [ ] Thread history filtering works (synthetic messages hidden from UI)
- [ ] Metadata persists through PostgreSQL checkpoints
- [ ] Logs show correct trigger types and metadata detection

### T035: Timer Backward Compatibility ✅

- [ ] All 4 trigger types fire on schedule
- [ ] Timing aligns with evaluator decisions (`delaySeconds`)
- [ ] Trigger type mapping works end-to-end (evaluator → timer → SessionProcessor → metadata)
- [ ] Multiple timers in same session work correctly
- [ ] No regressions in existing autonomy infrastructure

### T036: Performance Validation ✅

- [ ] Metadata creation: <1ms
- [ ] Metadata detection: <0.5ms
- [ ] Thread filtering: <2ms per message
- [ ] Total overhead: <5ms per message
- [ ] No observable latency impact on user experience

---

## Troubleshooting

### Issue: Autonomous messages appear in thread history

**Cause**: Filtering logic not working
**Debug**:
```bash
# Check if metadata is present
docker compose logs backend | grep "additional_kwargs"

# Verify filtering logic
docker compose logs backend | grep "Filtered synthetic message"
```
**Fix**: Ensure `isHumanMessage()` type guard and strict equality check (`=== true`)

---

### Issue: Memory queries use synthetic prompt instead of real message

**Cause**: Backward iteration not finding real user message
**Debug**:
```bash
# Check query source selection
docker compose logs backend | grep "querySource"

# Verify metadata detection
docker compose logs backend | grep "detected_synthetic"
```
**Fix**: Ensure backward iteration loop checks `metadata?.synthetic !== true`

---

### Issue: Trigger types not working as expected

**Cause**: Autonomy evaluator not selecting correct type
**Debug**:
```bash
# Check evaluator response
docker compose logs backend | grep "Autonomy evaluator raw response"

# Verify followUpType mapping
docker compose logs backend | grep "followUpType"
```
**Fix**: Update evaluator system prompt in agent config

---

## Manual Testing Checklist

- [ ] Test Scenario 1 (check_in)
- [ ] Test Scenario 2 (question_unanswered)
- [ ] Test Scenario 3 (task_incomplete)
- [ ] Test Scenario 4 (waiting_for_decision)
- [ ] Verify metadata persistence in PostgreSQL
- [ ] Verify thread history filtering in UI
- [ ] Verify memory retrieval backward iteration
- [ ] Check DEBUG/INFO logging structure
- [ ] Measure performance (<5ms overhead)
- [ ] Validate timer scheduling and firing
- [ ] Test multiple autonomous follow-ups per session
- [ ] Test edge cases (empty threads, summary fallback)

---

**Sign-off**: Once all scenarios pass and success criteria are met, mark T034, T035, and T036 as complete in `tasks.md`.
