# ADR 011: Agent-Level Summarizer Configuration

## Status
Accepted

## Context

- LangGraph conversation memory uses hot-path/summary pattern: recent messages stored verbatim, older messages summarized to save tokens.
- Original implementation hardcoded summarizer configuration in `LangGraphChatAgent` constructor:
  ```typescript
  const summarizerModel = new ChatOpenAI({
    model,  // Same as agent's main LLM model
    temperature: 0,  // Hardcoded
    apiKey,
    configuration: { baseURL: apiBase }
  });
  ```
- Problems with hardcoded approach:
  1. **Cost inefficiency**: Expensive models (e.g., GPT-4, Llama-3.1-70B) used for summarization when cheaper alternatives exist
  2. **No specialization**: Cannot use models optimized for summarization tasks (e.g., DeepSeek-R1-Distill)
  3. **Token budget fixed**: No per-agent control over summarization overflow handling
  4. **Inconsistent with autonomy pattern**: Autonomy evaluator already supports separate model config
- Spec `017-ux-fixes` Phase 6 mandates lifting summarizer to per-agent configuration with cost optimization as primary goal.

## Decision

Extend agent configuration schema with optional `summarizer` field, allowing independent model/temperature/token budget for conversation summarization.

### Configuration Schema

Add `summarizer` as optional field in `Agent` model (stored in existing `config` JSONB column):

```typescript
export interface SummarizerConfig {
  model?: string;        // Summarizer model (defaults to agent.llm.model)
  temperature?: number;  // Summarizer temperature (defaults to 0)
  tokenBudget?: number;  // Max overflow tokens (defaults to 8000)
  apiKey?: string;       // Optional override (defaults to agent.llm.apiKey)
  apiBase?: string;      // Optional override (defaults to agent.llm.apiBase)
}

export interface AgentConfig {
  llm: LLMConfig;
  memory: MemoryConfig;
  summarizer?: SummarizerConfig;  // NEW: Optional cost-optimization field
  autonomy?: AutonomyConfig;
}
```

### Fallback Behavior

When `summarizer` field is absent or partial, fall back to main LLM configuration:

```typescript
const summarizerModel = new ChatOpenAI({
  model: agent.summarizer?.model ?? agent.llm.model,
  temperature: agent.summarizer?.temperature ?? 0,
  apiKey: agent.summarizer?.apiKey ?? agent.llm.apiKey,
  configuration: { 
    baseURL: agent.summarizer?.apiBase ?? agent.llm.apiBase 
  }
});
```

### Token Budget Handling

Use `agent.summarizer.tokenBudget` in conversation-graph.ts when trimming messages:

```typescript
const tokenBudget = agent.summarizer?.tokenBudget ?? 8000;
const trimmedMessages = await trimMessages(
  state.messages,
  tokenBudget,
  getTokenCounter(),
  summarizerModel
);
```

### Logging Transparency

Update log messages to show actual model used (not hardcoded name):

```typescript
logger.info({
  summarizer: {
    model: summarizerModel.modelName,  // Actual model, not agent.llm.model
    tokenBudget,
    messageCount: trimmedMessages.length
  }
}, 'LANGMEM hotpath overflow: summarizing conversation');
```

## Consequences

### Positive

- **Cost savings**: Operators can use `deepseek-ai/DeepSeek-R1-Distill-Llama-70B` (~$0.14/1M tokens) for summarization while using premium models for conversation
- **Specialization**: Enables using models optimized for summarization tasks (deterministic summaries, concise output)
- **Per-agent control**: Different agents can have different summarization strategies (e.g., verbose agents get higher token budgets)
- **Consistent pattern**: Matches existing autonomy evaluator pattern (separate model config with fallback)
- **Backward compatible**: Existing agents without `summarizer` field continue using main LLM

### Negative

- **Configuration complexity**: Adds ~5 optional fields to agent config (mitigated by tooltips in UI)
- **Testing burden**: Need to verify fallback logic for all permutations (model/temperature/tokenBudget/apiKey/apiBase)
- **Log verbosity**: Separate model names appear in logs, potentially confusing (mitigated by clear labeling)

### Neutral

- **No schema migration needed**: Summarizer config stored in existing `config` JSONB field (Prisma handles serialization)
- **UI tooltips required**: Added descriptive tooltips to agent config form fields (Phase 7)

## Implementation

### Files Modified

- `packages/chat-shared/src/schemas/agent.ts`: Added `SummarizerConfigSchema` and extended `AgentConfigSchema`
- `apps/server/src/agent/langgraph-agent.ts`: Updated `LangGraphChatAgent` constructor to use `agent.summarizer` with fallback
- `apps/server/src/agent/graph/conversation-graph.ts`: 
  - Use `agent.summarizer.tokenBudget` for trimming
  - Fixed misleading log message to show actual summarizer model
- `config/agents/template.json`: Added example `summarizer` configuration
- `docs/configuration.md`: Documented all summarizer fields with examples

### Testing Strategy

- **Unit tests**: Verify fallback logic in `LangGraphChatAgent` (summarizer.model → llm.model)
- **Integration test**: Create agent with custom summarizer, verify separate LLM used (check logs)
- **Manual smoke test**: Load `helpful-assistant.json` with DeepSeek summarizer, trigger summarization, verify logs show DeepSeek model

## Alternatives Considered

### 1. Global Summarizer Config (Rejected)

**Approach**: Single summarizer configuration for all agents (environment variable or global settings).

**Pros**:
- Simpler configuration (one place)
- No per-agent testing burden

**Cons**:
- **Inflexible**: Cannot optimize per-agent (some agents may need verbose summaries)
- **No specialization**: All agents forced to use same summarizer model
- **Inconsistent**: Autonomy uses per-agent config, summarizer would use global config

**Verdict**: Rejected - per-agent flexibility more valuable than simplicity

### 2. Hardcoded Model Mapping (Rejected)

**Approach**: Hardcode mapping of expensive models → cheap summarizers (e.g., GPT-4 → DeepSeek).

**Pros**:
- Zero configuration for operators
- Automatic cost optimization

**Cons**:
- **Brittle**: Hardcoded mappings break when new models added
- **No control**: Operators cannot override mapping
- **Hidden behavior**: Summarizer model change not visible in config

**Verdict**: Rejected - explicit configuration preferred over magic behavior

### 3. Summarizer Pool (Rejected)

**Approach**: Pre-define pool of summarizer configs (e.g., "cheap", "balanced", "premium"), agents reference by name.

**Pros**:
- DRY for multiple agents sharing summarizer
- Validated configs (prevent typos)

**Cons**:
- **Over-engineering**: Current use case (~3-5 agents per deployment) doesn't warrant abstraction
- **Migration burden**: Need pool schema, UI, validation
- **Delayed flexibility**: Still need per-agent overrides eventually

**Verdict**: Rejected - YAGNI, inline config sufficient for Phase 1

## References

- **Spec**: `specs/017-ux-fixes/spec.md` (Phase 6: Summarizer Configuration)
- **Related ADR**: ADR 010 (Metadata-Based Autonomous Messages) - similar per-agent config pattern
- **LangGraph Docs**: [Memory Management](https://langchain-ai.github.io/langgraph/how-tos/memory/manage-conversation-history/)
- **Cost Reference**: [DeepInfra Pricing](https://deepinfra.com/pricing) - DeepSeek R1 Distill vs. Llama 3.1 70B

## Revision History

- **2025-11-12**: Initial version (spec 017-ux-fixes Phase 6)
