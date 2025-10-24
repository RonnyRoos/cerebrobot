# Testing Server-Side Autonomy

This guide explains how to test the autonomous follow-up messaging feature end-to-end.

## Prerequisites

1. **Enable Autonomy** - Set environment variables in `.env`:
   ```bash
   AUTONOMY_ENABLED=true
   AUTONOMY_MAX_CONSECUTIVE=3           # Hard cap (default: 3)
   AUTONOMY_COOLDOWN_MS=15000           # Cooldown period (default: 15s)
   TIMER_POLL_INTERVAL_MS=5000          # Timer polling (default: 5s)
   EFFECT_POLL_INTERVAL_MS=500          # Effect polling (default: 500ms)
   ```

2. **Configure Agent** - Edit agent config in `config/agents/your-agent.json`:
   ```json
   {
     "name": "Autonomous Assistant",
     "autonomy": {
       "enabled": true,
       "evaluator": {
         "model": "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
         "temperature": 0.7,
         "systemPrompt": "You are an autonomy evaluator. Decide if a follow-up message is needed. Schedule follow-ups when the user might benefit from a check-in, but don't schedule if the conversation feels complete."
       },
       "limits": {
         "maxFollowUpsPerSession": 5
       }
     }
   }
   ```

3. **Start Services**:
   ```bash
   # Terminal 1: Start PostgreSQL
   docker-compose up -d postgres
   
   # Terminal 2: Start backend
   pnpm dev
   
   # Terminal 3: Start frontend
   cd apps/client && pnpm dev
   ```

## Test Scenarios

### User Story 1: Agent Sends Scheduled Follow-up ✅

**Goal**: Verify agent can autonomously send a follow-up message after a delay.

**Steps**:
1. Open the chat UI (http://localhost:5173)
2. Create a new thread
3. Send a message: "What's the weather like?"
4. Agent responds with weather info
5. **Stop typing** - don't send another message
6. **Wait 30-60 seconds** (the delay specified by the evaluator)
7. **Expected**: Agent autonomously sends a follow-up (e.g., "Did that answer your question?")

**Verification**:
- Check browser console: Look for WebSocket message with `type: "token"` or `type: "final"`
- Check backend logs: Look for `"Timer promoted to event"` and `"Effect delivered successfully"`
- Message should appear in chat UI automatically without user input

**Backend Logs to Monitor**:
```bash
docker logs cerebrobot-backend-1 -f --tail 100 | grep -E "(Timer|autonomous|schedule)"
```

---

### User Story 2: User Message Cancels Pending Follow-ups ✅

**Goal**: Verify pending timers are cancelled when user sends a new message.

**Steps**:
1. Open the chat UI
2. Send message: "Tell me about space"
3. Agent responds
4. **Wait 10 seconds** (less than the scheduled follow-up delay)
5. **Send another message**: "Actually, tell me about the ocean"
6. **Expected**: Original follow-up is cancelled, agent responds to ocean question

**Verification**:
- Check backend logs: Look for `"Cancelled pending timers on user message"`
- The follow-up about space should **never arrive**
- Only the ocean response should appear

**Backend Logs**:
```bash
docker logs cerebrobot-backend-1 -f --tail 100 | grep -E "(Cancel|clear)"
```

---

### User Story 3: Autonomy Hard Limits Prevent Message Storms ✅

**Goal**: Verify hard cap (3 consecutive messages) and cooldown (15s) are enforced.

**Steps**:
1. Open the chat UI
2. Create a scenario where agent wants to send multiple follow-ups:
   - Send: "Tell me a story"
   - Agent responds
   - **Wait for 1st follow-up** (should arrive)
   - **Wait for 2nd follow-up** (should arrive)
   - **Wait for 3rd follow-up** (should arrive)
   - **Wait for 4th follow-up** (should be **blocked**)

**Verification**:
- Check backend logs: Look for `"Autonomous message blocked by PolicyGates"`
- After 3 consecutive autonomous messages, the 4th should fail
- Send a user message to reset the counter

**Backend Logs**:
```bash
docker logs cerebrobot-backend-1 -f --tail 100 | grep -E "(PolicyGates|blocked|hard_cap)"
```

---

## Database Inspection

Check the database state directly:

```bash
# View timers
docker exec cerebrobot-postgres-1 psql -U cerebrobot -d cerebrobot -c "SELECT session_key, timer_id, fire_at_ms, status FROM timers ORDER BY created_at DESC LIMIT 10;"

# View effects
docker exec cerebrobot-postgres-1 psql -U cerebrobot -d cerebrobot -c "SELECT session_key, type, status, created_at FROM effects ORDER BY created_at DESC LIMIT 10;"

# View events
docker exec cerebrobot-postgres-1 psql -U cerebrobot -d cerebrobot -c "SELECT session_key, type, seq, created_at FROM events ORDER BY created_at DESC LIMIT 10;"
```

## Troubleshooting

### No autonomous messages appear

**Check**:
1. `AUTONOMY_ENABLED=true` in `.env`?
2. Agent config has `autonomy.enabled: true`?
3. TimerWorker started? Look for `"TimerWorker starting"` in logs
4. EffectRunner started? Look for `"EffectRunner started"` in logs

**Fix**:
```bash
# Rebuild backend
docker-compose build backend
docker-compose up -d backend

# Check logs
docker logs cerebrobot-backend-1 --tail 50
```

### Timers not firing

**Check**:
1. Timer exists in DB? (See database inspection above)
2. Timer status is `pending`?
3. `fire_at_ms` is in the past?

**Fix**:
```bash
# Manually promote stuck timer (replace values)
docker exec cerebrobot-postgres-1 psql -U cerebrobot -d cerebrobot -c "UPDATE timers SET fire_at_ms = extract(epoch from now()) * 1000 WHERE timer_id = 'YOUR_TIMER_ID';"
```

### Effects stuck in pending

**Check**:
1. WebSocket connected? Look for connection in browser DevTools > Network > WS
2. Effect has `dedupe_key`?

**Fix**:
```bash
# Mark stuck effects as failed
docker exec cerebrobot-postgres-1 psql -U cerebrobot -d cerebrobot -c "UPDATE effects SET status = 'failed' WHERE status = 'pending' AND created_at < now() - interval '1 hour';"
```

## Success Criteria

✅ **User Story 1**: Agent sends autonomous follow-ups after configured delay  
✅ **User Story 2**: Pending follow-ups are cancelled when user sends new message  
✅ **User Story 3**: Hard cap (3 messages) and cooldown (15s) are enforced  

All features are working if you can:
1. See autonomous messages appear in the UI without user input
2. Cancel them by sending a user message
3. Observe blocking after 3 consecutive autonomous messages

## Next Steps

Once basic autonomy is working, consider:
- **Tune evaluator prompt**: Adjust when/why follow-ups are scheduled
- **Adjust delays**: Experiment with shorter/longer follow-up delays
- **Test edge cases**: Multiple tabs, WebSocket disconnects, server restarts
- **Monitor production**: Set up alerts for PolicyGates blocks or stuck effects

---

**Questions?** Check the [spec](./spec.md) for detailed requirements or [tasks](./tasks.md) for implementation details.
