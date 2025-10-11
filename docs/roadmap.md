# TODO
## Switch to websocket communication protocol

## Decide to send the user follow up messages without them interacting

## Show the user summarizations

## Show the users the content of the brain

# DONE
## ✅ Phase 2 – Memory Store Foundations
Introduce a MemoryStore abstraction (namespaces, put/get/search) and an in-process implementation.
Add LangGraph nodes for retrieveMemories/storeMemory (mirroring the Python article).

## ✅ Phase 3 – Tool-based Memory Inserts
Bind an upsertMemory tool to the LLM, route tool calls through storeMemory, and persist facts via the new store.
Gate the feature behind config so we can ship incrementally.

## ✅ Phase 4 – Memory Retrieval & Injection
Implement retrieval (keyword search to start) in retrieveMemories, set state.memoryContext, and adjust prompts to include it.
Add unit tests (with mocked LLM) and manual smoke tests to ensure retrieved memories are surfaced without bloating the hot-path summary.