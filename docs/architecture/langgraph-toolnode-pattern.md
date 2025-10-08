# LangGraph ToolNode Pattern for Memory Storage

## Decision

**Cerebrobot uses LangGraph's `ToolNode` for memory storage operations instead of implementing a custom `storeMemory` node.** The `upsertMemory` tool is executed automatically by `ToolNode` when the LLM invokes it, following the idiomatic LangGraph pattern for tool execution.

## Status

**Accepted** (2025-10-08)

## Context

During implementation of the long-term memory system (feature `001-build-cerebrobot-s`), we needed to decide how to handle memory storage triggered by the LLM. The original spec (FR-005) mentioned "two new graph nodes: `retrieveMemories` and `storeMemory`", suggesting a custom node for storage operations.

However, LangGraph provides a standard pattern for tool execution:

1. **LLM generates tool calls** → The model decides to use the `upsertMemory` tool
2. **ToolNode executes tools** → A built-in `ToolNode` intercepts and runs the tool function
3. **Results return to LLM** → Tool outputs feed back into the conversation flow

This pattern is documented in the official LangGraph guides:
- [LangGraph JS How-to: Use Tools](https://langchain-ai.github.io/langgraphjs/how-tos/tool-calling/)
- [LangGraph Conceptual Guide: Tool Calling](https://langchain-ai.github.io/langgraphjs/concepts/agentic_concepts/#tool-calling)

### Alternative Considered: Custom `storeMemory` Node

A custom node approach would:
- Create a dedicated graph node that runs after the LLM
- Parse tool calls from AIMessage and manually execute `upsertMemory`
- Add conditional routing logic to determine when to invoke the node

**Drawbacks**:
- Duplicates LangGraph's built-in tool execution logic
- Requires manual parsing of tool calls from messages
- Breaks convention (other tools would use ToolNode, only memory storage would be custom)
- More code to maintain and test
- Potential inconsistencies with how LangGraph evolves tool handling

## Decision Rationale

We chose `ToolNode` for the following reasons:

### 1. Idiomatic LangGraph Pattern

LangGraph JS documentation explicitly recommends `ToolNode` for tool execution:

> "When you want to let the agent use tools, the typical pattern is to: bind tools to the LLM, add a ToolNode to your graph, and use conditional edges to route between the agent and the ToolNode based on whether the LLM made a tool call." — [LangGraph How-to Guides](https://langchain-ai.github.io/langgraphjs/how-tos/tool-calling/)

Following framework conventions ensures:
- Compatibility with future LangGraph updates
- Easier onboarding for developers familiar with LangGraph
- Access to framework optimizations and bug fixes

### 2. Less Code, Less Complexity

**With ToolNode** (actual implementation):
```typescript
// Define the tool
const memoryTools = [upsertMemoryTool];

// Bind to LLM
const modelWithTools = model.bindTools(memoryTools);

// Add ToolNode to graph
builder.addNode('tools', new ToolNode(memoryTools));

// Route: LLM → ToolNode → LLM
builder.addConditionalEdges('agent', shouldContinue, {
  tools: 'tools',
  end: END,
});
builder.addEdge('tools', 'agent');
```

**With Custom Node** (avoided):
```typescript
// Would require manual tool call parsing
async function storeMemoryNode(state: GraphState) {
  const lastMessage = state.messages[state.messages.length - 1];
  if (lastMessage._getType() !== 'ai') return {};
  
  const aiMessage = lastMessage as AIMessage;
  if (!aiMessage.tool_calls?.length) return {};
  
  // Manually find and execute upsertMemory calls
  for (const toolCall of aiMessage.tool_calls) {
    if (toolCall.name === 'upsertMemory') {
      await executeUpsertMemory(toolCall.args, state.configurable);
      // Add tool message to state...
    }
  }
  return { messages: [/* tool results */] };
}
```

The custom approach requires ~50+ lines of boilerplate that `ToolNode` handles automatically.

### 3. Consistent Tool Execution

All tools in Cerebrobot (current and future) should follow the same execution pattern:
- **Memory tools**: `upsertMemory` (via ToolNode)
- **Future tools**: Web search, calculations, API calls (via ToolNode)

Using a custom node only for memory would create an inconsistency and set a poor precedent.

### 4. Automatic Error Handling

`ToolNode` provides built-in error handling:
- Catches exceptions during tool execution
- Returns error messages to the LLM
- Maintains conversation flow even when tools fail

Our custom node would need to reimplement all this logic.

## Implementation Details

### Graph Architecture

```
┌─────────────────┐
│ retrieveMemories│  ← Custom node (semantic search before LLM)
└────────┬────────┘
         │
         ▼
    ┌────────┐
    │ agent  │  ← LLM with bound tools
    └────┬───┘
         │
         ▼
    shouldContinue?
         │
    ┌────┴─────┐
    │          │
    ▼          ▼
┌───────┐   ┌─────┐
│ tools │   │ END │  ← ToolNode executes upsertMemory
└───┬───┘   └─────┘
    │
    └──────► agent  (loop back)
```

### Why `retrieveMemories` IS a Custom Node

We still implement `retrieveMemories` as a custom node because:
1. **Runs BEFORE the LLM** — needs to inject context into the prompt
2. **Not a tool** — the LLM doesn't decide when to retrieve; we always retrieve
3. **Semantic search logic** — requires specialized query embedding and similarity scoring
4. **No LangGraph equivalent** — there's no built-in node for pre-LLM context injection

This is consistent with LangGraph patterns: custom nodes for preprocessing, `ToolNode` for tool execution.

## Consequences

### Positive

- ✅ **Reduced code complexity**: ~150 lines of dead code removed (custom `storeMemory` node)
- ✅ **Framework alignment**: Implementation follows official LangGraph documentation
- ✅ **Maintainability**: Future LangGraph improvements automatically apply to our tool execution
- ✅ **Testability**: Mocking `ToolNode` is simpler than testing custom tool dispatch logic
- ✅ **Extensibility**: Adding new tools requires no changes to graph structure

### Negative

- ⚠️ **Spec mismatch**: FR-005 mentioned "two new nodes" but implementation only adds one custom node (`retrieveMemories`)
  - **Mitigation**: Update spec to reflect actual architecture (see docs/architecture/langgraph-toolnode-pattern.md)
- ⚠️ **Initial confusion**: Original implementation included dead `createStoreMemoryNode` function (151 lines) that was never used
  - **Resolution**: Removed in constitution compliance refactoring (2025-10-08)

### Neutral

- 🔄 **Learning curve**: Developers new to LangGraph must understand ToolNode pattern
  - **Mitigation**: This ADR documents the decision; onboarding materials reference LangGraph guides

## References

### LangGraph Documentation

- [Tool Calling in LangGraph](https://langchain-ai.github.io/langgraphjs/how-tos/tool-calling/) — Official how-to guide
- [Agentic Concepts: Tools](https://langchain-ai.github.io/langgraphjs/concepts/agentic_concepts/#tool-calling) — Conceptual overview
- [ToolNode API Reference](https://langchain-ai.github.io/langgraphjs/reference/prebuilt/#toolnode) — Class documentation

### Python Reference Implementation

The [LangGraph Memory Article (Python)](https://blog.langchain.dev/adding-long-term-memory-to-langgraph/) demonstrates the same pattern:
- Custom node for retrieval (`retrieve_memories`)
- ToolNode for storage (via `store_memory` tool)

Our implementation mirrors this architecture, adapted to LangGraph JS conventions.

### Related Decisions

- [userId Validation Strategy](./userid-validation.md) — Ensures memory operations have valid user namespaces
- [Feature Spec 001](../../specs/001-build-cerebrobot-s/spec.md) — Original memory system requirements

## Review History

- **2025-10-08**: Initial ADR created after removing dead `createStoreMemoryNode` code
- **Authors**: Constitution compliance refactoring
- **Reviewers**: N/A (documentation-only change)

---

**Summary**: Use `ToolNode` for all tool execution (including memory storage). Reserve custom nodes for specialized preprocessing logic like semantic memory retrieval. Follow LangGraph conventions unless there's a compelling reason to deviate.
