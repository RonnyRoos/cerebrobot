# ADR-008: Single Effect Per Message Architecture

**Status**: Accepted  
**Date**: 2025-10-15  
**Context**: Spec 008 Events & Effects Migration  
**Deciders**: Development team  

## Context and Problem Statement

During implementation of spec 008 (Events & Effects migration), we discovered a fundamental architectural issue with the implied design of creating one effect per streaming token. This would result in ~95 database INSERT operations for a single message, creating performance overhead and violating the abstraction principle that effects represent state transitions, not streaming data.

## Decision Drivers

- **Performance**: Database INSERT operations on every token add significant latency
- **Abstraction**: Effects should represent state transitions (message delivery), not streaming data (tokens)
- **Storage efficiency**: 95 rows per message is wasteful
- **Transactional outbox pattern**: Effects are for durable delivery, not real-time streaming
- **User experience**: Real-time streaming must remain fast and responsive

## Considered Options

### Option 1: Effect Per Token (Spec-Implied Design)
Create a `send_message` effect for every token streamed from the LLM.

**Pros**:
- Literal interpretation of "preserve token streaming" requirement
- Each token individually persisted for replay

**Cons**:
- ~95 database INSERTs per message (significant overhead)
- Wrong abstraction (effects are state transitions, not streaming data)
- Complicates deduplication (need sequence numbers for uniqueness)
- Degrades performance (INSERT latency on critical path)
- Violates transactional outbox pattern intent

### Option 2: Single Effect Per Message (Our Implementation) ✅

Stream tokens directly from SessionProcessor to WebSocket (real-time), then create ONE effect with the complete message after streaming completes (for persistence/reconnection).

**Pros**:
- Correct abstraction (effects = state transitions)
- Minimal database overhead (1 INSERT per message)
- Better performance (streaming not blocked by DB writes)
- Simpler deduplication (one dedupe_key per message)
- Aligns with transactional outbox pattern intent
- Effects serve their purpose: durable delivery on reconnection

**Cons**:
- Deviates from spec's literal interpretation
- Requires architectural clarification in documentation

## Decision Outcome

**Chosen option**: **Option 2 - Single Effect Per Message**

### Implementation Details

1. **SessionProcessor** streams tokens directly to active WebSocket connection:
   ```typescript
   for await (const chunk of stream) {
     if (chunk.type === 'token') {
       accumulated += chunk.value;
       if (activeSocket) {
         activeSocket.send(JSON.stringify({
           type: 'token',
           requestId: event.payload.requestId,
           value: chunk.value,
         }));
       }
     }
   }
   ```

2. **After streaming completes**, create ONE effect with complete message:
   ```typescript
   const effect = createSendMessageEffect(
     event.session_key,
     checkpointId,
     accumulated,      // Complete accumulated message
     event.payload.requestId,
     0,                // Single effect, no sequence
     true              // isFinal flag
   );
   await this.outboxStore.create({ ...effect });
   ```

3. **EffectRunner** delivers complete messages (no streaming) when reconnecting:
   ```typescript
   // On reconnection, deliver the full message at once
   socket.send(JSON.stringify({
     type: 'final',
     requestId: effect.payload.requestId,
     message: effect.payload.content,
   }));
   ```

### Rationale

- **Real-time path**: SessionProcessor → WebSocket (fast, direct)
- **Persistence path**: SessionProcessor → Effect → Database (durable, reconnectable)
- **Effects serve their purpose**: Enable message delivery when WebSocket wasn't active
- **Abstraction correctness**: Effects represent "message delivered" state transition, not token-level streaming data

## Consequences

### Positive

- ✅ Better performance (1 INSERT vs 95 INSERTs per message)
- ✅ Correct abstraction (effects for state transitions, not streaming)
- ✅ Simpler deduplication logic
- ✅ Database storage efficiency
- ✅ Aligns with transactional outbox pattern principles

### Negative

- ⚠️ Deviates from spec's literal interpretation (documented here)
- ⚠️ Reconnection scenario delivers full message at once (acceptable trade-off)

### Neutral

- Effects table contains complete messages (easier debugging, larger payloads)
- Token-by-token replay not supported (not a requirement)

## Validation

- ✅ Manual testing confirmed streaming works identically to pre-migration
- ✅ Database queries show 1 effect per message (not 95)
- ✅ All 156 unit tests passing
- ✅ Latency within user expectations (SC-006)
- ✅ No user-visible behavioral changes (SC-001)

## Related Decisions

- Spec 008: Events & Effects Architecture Migration
- FR-023: Preserve token streaming behavior (met via SessionProcessor direct streaming)
- FR-014: Generate send_message effect (updated interpretation: single effect with complete message)

## Notes

This decision was discovered through runtime testing when we found:
1. Bug #1: Dedupe key collisions (all effects identical)
2. Bug #2: Dedupe key regeneration issues
3. Bug #3-4: RequestId and handler cleanup complexity
4. Bug #5: **Architectural realization** - creating effects per token was fundamentally wrong

The bugs revealed that the per-token approach violated the abstraction principle and led to unnecessary complexity. The single-effect-per-message architecture emerged as the correct solution.

## References

- [Events & Effects Architecture Overview](../../architecture/events-and-effects.md)
- [Database Schema Documentation](../../architecture/database.md)
- [Spec 008: Migrate to Events & Effects](../../specs/008-migrate-to-events-effects/spec.md)
- [Transactional Outbox Pattern](https://microservices.io/patterns/data/transactional-outbox.html)
- [Implementation: SessionProcessor.ts](../../apps/server/src/events/session/SessionProcessor.ts)
- [Implementation: EffectRunner.ts](../../apps/server/src/events/effects/EffectRunner.ts)
