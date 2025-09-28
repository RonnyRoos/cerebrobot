# LangGraph Chat Agent Sequence

```mermaid
sequenceDiagram
  participant Client as HTTP Client
  participant CRoutes as Chat Routes
  participant Agent as Chat Agent
  participant Memory as LangMem Store
  participant LLM as OpenAI-Compatible API

  Client->>CRoutes: POST /api/chat (sessionId, message)
  CRoutes->>Agent: invoke streamChat/completeChat
  Agent->>Memory: read(sessionId)
  Agent->>LLM: invoke(model, prompt, temperature)
  LLM-->>Agent: assistant message stream
  Agent->>Memory: append(user + assistant messages)
  Agent-->>CRoutes: tokens/final response (SSE or JSON)
  CRoutes-->>Client: streamed tokens or buffered JSON response
```

- Request validation uses shared Zod schemas ([`packages/chat-shared/src`](../../packages/chat-shared/src)).
- Session IDs and resets go through [`createSessionManager`](../../apps/server/src/session/session-manager.ts).
- Logging and invocation flow lives inside [`LangGraphChatAgent`](../../apps/server/src/agent/langgraph-agent.ts) and the Fastify bootstrap.
