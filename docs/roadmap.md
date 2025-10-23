# TODO
## Memory deduplication
We are storing memories even thoug hthey are exactly/very similar to previous ones. We should not do this. We need a dedupe feature. 
Also implement a cap for memory load, we onload load the x most relevant memories

## Decide to send the user follow up messages without them interacting

## Show the user summarizations

## Show the users the content of the brain

# DONE
## Switch to websocket communication protocol

## ✅ Phase 2 – Memory Store Foundations
Introduce a MemoryStore abstraction (namespaces, put/get/search) and an in-process implementation.
Add LangGraph nodes for retrieveMemories/storeMemory (mirroring the Python article).

## ✅ Phase 3 – Tool-based Memory Inserts
Bind an upsertMemory tool to the LLM, route tool calls through storeMemory, and persist facts via the new store.
Gate the feature behind config so we can ship incrementally.

**Known Issue:** LLM stores too many trivial memories (e.g., test interactions, acknowledgments). This is expected behavior - the tool description guides usage but doesn't enforce it. **Solution for future phase:** Add memory deduplication, consolidation, and importance scoring to filter low-value memories automatically.

## ✅ Phase 4 – Memory Retrieval & Injection
Implement retrieval (keyword search to start) in retrieveMemories, set state.memoryContext, and adjust prompts to include it.
Add unit tests (with mocked LLM) and manual smoke tests to ensure retrieved memories are surfaced without bloating the hot-path summary.