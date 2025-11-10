# Developer Quickstart: Metadata-Based Autonomous Messages

**Feature**: 016-metadata-autonomous-messages  
**Purpose**: Local development setup for testing metadata-driven synthetic message filtering

---

## Prerequisites

Standard Cerebrobot development environment:
- Node.js ≥20
- pnpm ≥9
- Docker Compose (PostgreSQL + pgvector)
- Dependencies installed: `pnpm install`

---

## 1. Local Development Setup

### Start PostgreSQL with LangGraph Checkpoint Tables

```bash
# Start test database
./scripts/start-test-db.sh

# Verify checkpoint tables exist
docker exec -it cerebrobot-db psql -U postgres -d cerebrobot_test -c "\dt"
# Should show: checkpoints, checkpoint_writes, checkpoint_blobs
```

### Run Prisma Migrations

```bash
# Ensure schema is up to date
pnpm prisma migrate dev

# Verify Agent and Thread tables exist
pnpm prisma studio # Browse at http://localhost:5555
```

### Start Server with DEBUG Logging

```bash
cd apps/server

# Enable DEBUG level for metadata lifecycle
LOG_LEVEL=debug pnpm dev

# Server starts at http://localhost:3000
# Watch for metadata-related logs:
# - [SessionProcessor] Creating synthetic message with metadata: { ... }
# - [MemoryRetrieval] Detected synthetic message, using last real user message
# - [ThreadService] Filtered X synthetic messages from thread history
```

---

## 2. Testing Metadata Creation

### Create Synthetic Message Manually

Use server REPL or test file:

```typescript
// apps/server/src/__tests__/manual-metadata-test.ts
import { HumanMessage } from '@langchain/core/messages';
import { LangGraphAgent } from '../agent/langgraph-agent.js';

async function testSyntheticMessage() {
  const agent = new LangGraphAgent(/* ... */);
  
  const syntheticMessage = new HumanMessage({
    content: 'Continue our conversation naturally.',
    additional_kwargs: {
      synthetic: true,
      trigger_type: 'check_in',
      trigger_reason: 'Manual test at ' + new Date().toISOString()
    }
  });
  
  console.log('Message metadata:', syntheticMessage.additional_kwargs);
  
  // Invoke graph
  await agent.invokeStreamAsync({
    message: syntheticMessage,
    threadId: 'test-thread-123',
    userId: 'test-user',
    agentId: 'test-agent',
    signal: new AbortController().signal,
    isUserMessage: false
  });
}

testSyntheticMessage();
```

Run:
```bash
cd apps/server
pnpm tsx src/__tests__/manual-metadata-test.ts
```

**Expected Logs**:
```
DEBUG [SessionProcessor] Creating synthetic message with metadata: { synthetic: true, trigger_type: 'check_in', ... }
DEBUG [MemoryRetrieval] Detected synthetic message (trigger: check_in), searching with last real user message
INFO  [ThreadService] Filtered 1 synthetic messages from thread history
```

---

## 3. Validating Checkpoint Persistence

### Run Checkpoint Metadata Validation Test

```bash
cd apps/server
pnpm test checkpoint-metadata-validation.test.ts
```

**Test Flow**:
1. Create HumanMessage with metadata
2. Save to LangGraph checkpoint (PostgresSaver)
3. Restore from checkpoint
4. Assert metadata integrity (strict equality checks)

**Pass Criteria**:
```
✓ preserves HumanMessage additional_kwargs through checkpoint save/restore
✓ preserves trigger_type enum values
✓ preserves trigger_reason string
✓ preserves synthetic boolean flag
```

**Fail Criteria** (indicates LangGraph incompatibility):
```
✗ Metadata lost after checkpoint restore
✗ additional_kwargs undefined
✗ Boolean coerced to string
```

**Recovery**:
- Check LangGraph version: `pnpm list @langchain/langgraph`
- Required: `^0.4.9` (from tech-stack.md)
- Verify PostgresSaver import: `@langchain/langgraph-checkpoint-postgres`

---

## 4. Testing Message Filtering

### Verify Thread History Filtering

```bash
# Create test thread with mixed messages
curl -X POST http://localhost:3000/api/threads \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "test-agent-id",
    "userId": "test-user-id",
    "title": "Metadata Filtering Test"
  }'

# Send real user message
# (via WebSocket or POST /api/chat)

# Trigger autonomous followup
# (SessionProcessor creates synthetic message)

# Fetch thread history
curl http://localhost:3000/api/threads/{threadId}/messages

# Verify: Synthetic message NOT in response
# Check logs: "Filtered 1 synthetic messages from thread history"
```

**Expected Response**:
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Real user message",
      "timestamp": "2025-01-10T12:00:00Z"
    },
    {
      "role": "assistant",
      "content": "Agent response",
      "timestamp": "2025-01-10T12:00:05Z"
    }
    // Synthetic message with metadata.synthetic=true ABSENT
  ]
}
```

---

## 5. Testing Memory Retrieval Logic

### Unit Test: Memory Query Detection

```bash
cd apps/server
pnpm test memory-nodes.test.ts --grep "synthetic message"
```

**Test Case**:
```typescript
describe('Memory Retrieval with Synthetic Messages', () => {
  it('uses last real user message when synthetic message is most recent', async () => {
    const state = {
      messages: [
        new HumanMessage('Real user question about X'),
        new AIMessage('Agent response about X'),
        new HumanMessage({
          content: 'Continue naturally',
          additional_kwargs: { synthetic: true, trigger_type: 'check_in' }
        })
      ]
    };
    
    const result = await retrieveMemoryNode(state, config);
    
    // Should search with "Real user question about X", not "Continue naturally"
    expect(mockMemoryStore.search).toHaveBeenCalledWith(
      'Real user question about X',
      expect.anything()
    );
  });
});
```

**Pass Criteria**:
- Memory search uses correct query (real user message)
- Synthetic message metadata detected
- No content-based parsing

---

## 6. Debugging Metadata in Logs

### Enable Structured Logging

```bash
# apps/server/.env.local
LOG_LEVEL=debug
LOG_PRETTY=true # Human-readable for development
```

### Key Log Patterns

**Message Creation** (SessionProcessor):
```json
{
  "level": "debug",
  "msg": "Creating synthetic message with metadata",
  "metadata": {
    "synthetic": true,
    "trigger_type": "check_in",
    "trigger_reason": "Timer fired after 5 minutes of inactivity"
  },
  "threadId": "abc123",
  "agentId": "xyz789"
}
```

**Memory Retrieval** (Memory Nodes):
```json
{
  "level": "debug",
  "msg": "Detected synthetic message, using last real user message",
  "trigger_type": "check_in",
  "real_message_index": 5,
  "fallback_to_summary": false
}
```

**Thread Filtering** (ThreadService):
```json
{
  "level": "info",
  "msg": "Filtered synthetic messages from thread history",
  "total_messages": 42,
  "filtered_count": 3,
  "threadId": "abc123"
}
```

**Edge Case** (Empty Thread):
```json
{
  "level": "error",
  "msg": "Synthetic message on empty thread - no real user message found",
  "threadId": "abc123",
  "fallback": "summary",
  "summary": "Previous conversation context..."
}
```

---

## 7. Running Full Test Suite

### Unit Tests

```bash
# Test message metadata creation
pnpm test SessionProcessor.test.ts --grep "metadata"

# Test memory retrieval logic
pnpm test memory-nodes.test.ts

# Test thread filtering
pnpm test thread-service.test.ts --grep "synthetic"
```

### Integration Tests

```bash
# Test end-to-end flow
pnpm test autonomous-followup.integration.test.ts

# Verify checkpoint persistence
pnpm test checkpoint-metadata-validation.test.ts
```

### Hygiene Loop (Before Commit)

```bash
pnpm lint          # ESLint + TypeScript checks
pnpm format:write  # Prettier formatting
pnpm test          # Full test suite
```

**Constitution Principle I**: All must pass before committing.

---

## 8. Common Issues & Fixes

### Issue: Metadata Lost After Checkpoint Restore

**Symptom**:
```
✗ additional_kwargs undefined after restore
```

**Cause**: LangGraph version mismatch

**Fix**:
```bash
# Check installed version
pnpm list @langchain/langgraph

# Required: ^0.4.9 (per tech-stack.md)
# If outdated:
pnpm update @langchain/langgraph@^0.4.9
pnpm install
```

---

### Issue: Synthetic Messages Appearing in Thread History

**Symptom**:
```json
{
  "content": "Continue our conversation naturally.",
  "role": "user" // Should be filtered!
}
```

**Cause**: ThreadService filter not checking metadata

**Fix**:
```typescript
// thread/service.ts
return rawMessages.filter((msg: BaseMessage) => {
  // Check metadata BEFORE content
  if (msg.additional_kwargs?.synthetic === true) return false;
  
  // Rest of filtering logic...
});
```

**Verify**:
```bash
pnpm test thread-service.test.ts --grep "filters synthetic"
```

---

### Issue: Memory Retrieval Using Synthetic Message Content

**Symptom**:
```
DEBUG Memory search query: "Continue our conversation naturally."
# Should be: "Real user question about X"
```

**Cause**: Memory node not detecting metadata

**Fix**:
```typescript
// memory/nodes.ts
const lastMessage = messages[messages.length - 1];

// MUST check metadata first
if (lastMessage.additional_kwargs?.synthetic === true) {
  // Find real user message...
}
```

**Verify**:
```bash
pnpm test memory-nodes.test.ts --grep "synthetic"
```

---

### Issue: Boolean Coercion in Metadata

**Symptom**:
```javascript
msg.additional_kwargs.synthetic === 'true' // String, not boolean!
```

**Cause**: JSON serialization issue

**Fix**: Use strict equality checks
```typescript
// WRONG
if (msg.additional_kwargs?.synthetic) { ... }

// RIGHT
if (msg.additional_kwargs?.synthetic === true) { ... }
```

**Validation**: Startup test catches this (checkpoint-metadata-validation.test.ts)

---

## 9. Manual Testing Workflow

### Step-by-Step Verification

1. **Start Services**
   ```bash
   ./scripts/start-test-db.sh
   cd apps/server && LOG_LEVEL=debug pnpm dev
   ```

2. **Create Test Agent**
   ```bash
   # Copy config/agents/template.json
   cp config/agents/template.json config/agents/metadata-test-agent.json
   
   # Set autonomy: { "enabled": true, "check_in_interval": 30 }
   ```

3. **Start Conversation**
   - Open client: http://localhost:5173
   - Select "Metadata Test Agent"
   - Send: "Tell me about metadata filtering"

4. **Wait for Autonomous Followup** (30 seconds)
   - Watch logs: `Creating synthetic message with metadata: { synthetic: true, trigger_type: 'check_in', ... }`
   - Agent responds naturally (no meta-commentary)

5. **Verify Thread History**
   ```bash
   curl http://localhost:3000/api/threads/{threadId}/messages | jq '.messages[] | select(.content | contains("Continue"))'
   # Should return empty (synthetic message filtered)
   ```

6. **Check Checkpoint Database**
   ```bash
   docker exec -it cerebrobot-db psql -U postgres -d cerebrobot_test
   
   SELECT 
     thread_id, 
     jsonb_pretty(checkpoint->'messages'->-1->'kwargs'->'additional_kwargs') 
   FROM checkpoints 
   WHERE thread_id = '{threadId}';
   
   # Should show: { "synthetic": true, "trigger_type": "check_in", ... }
   ```

---

## 10. Development Environment Variables

```bash
# apps/server/.env.local

# Logging
LOG_LEVEL=debug                    # Show metadata lifecycle logs
LOG_PRETTY=true                    # Human-readable format

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/cerebrobot_test

# LangChain/LangGraph
LANGCHAIN_TRACING_V2=false         # Disable in local dev
LANGCHAIN_API_KEY=                 # Not needed locally

# LangMem (Memory)
LANGMEM_HOTPATH_LIMIT=20           # Max memories in context
LANGMEM_HOTPATH_TOKEN_BUDGET=16000 # Token limit
```

---

## 11. Next Steps After Local Validation

1. **Run Full Hygiene Loop**
   ```bash
   pnpm lint && pnpm format:write && pnpm test
   ```

2. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: implement metadata-based synthetic message filtering"
   ```

3. **Create Pull Request**
   - Title: "Implement Metadata-Based Autonomous Message Tagging"
   - Reference: spec 016-metadata-autonomous-messages
   - Include: Before/after logs showing metadata in action

4. **Deployment Validation**
   - Verify checkpoint metadata in staging database
   - Run startup validation test in production environment
   - Monitor for "Metadata lost" errors (fail-fast on corruption)

---

## 12. Useful Commands Reference

```bash
# Start fresh database
./scripts/stop-test-db.sh && ./scripts/start-test-db.sh

# Reset Prisma schema
pnpm prisma migrate reset --skip-seed

# Watch test suite
pnpm test --watch memory-nodes.test.ts

# Inspect checkpoint blobs
docker exec -it cerebrobot-db psql -U postgres -d cerebrobot_test \
  -c "SELECT thread_id, created_at FROM checkpoints ORDER BY created_at DESC LIMIT 5;"

# Tail server logs
cd apps/server && LOG_LEVEL=debug pnpm dev | grep -i metadata

# Run single test file
pnpm test SessionProcessor.test.ts --reporter=verbose
```

---

## Summary

**Critical Validation Points**:
1. ✅ Checkpoint metadata persistence (startup test)
2. ✅ Thread history filtering (no synthetic messages in API)
3. ✅ Memory retrieval (uses real user message, not synthetic)
4. ✅ Structured logging (DEBUG/INFO/ERROR lifecycle)

**Development Loop**:
1. Make code change
2. Run affected unit tests
3. Test manually via WebSocket
4. Check logs for metadata lifecycle
5. Run full hygiene loop before commit

**Debugging Tools**:
- Pino DEBUG logs (metadata lifecycle)
- PostgreSQL introspection (checkpoint blobs)
- Vitest unit tests (deterministic fixtures)
- Manual WebSocket testing (real-world flow)

For implementation details, see:
- `data-model.md` - Entity definitions
- `research.md` - Technical decisions
- `plan.md` - Implementation plan
