# Tech Stack Guardrails

## Purpose & Scope
This document constrains Cerebrobot's technology choices, especially for Phase 1. It is written for LLM assistants so they default to the approved stack, avoid premature optimization, and can justify additions against these baselines.

## Tech Stack & Versions
- **Runtime**: Node.js ≥ 20 (required for Fastify v5 and modern TypeScript tooling).
- **HTTP framework & plugins**:
  - `fastify@5.6.1` — current v5 LTS line.
  - `fastify-sse-v2@4.2.1` — helper to expose Server-Sent Events.
- **LangGraph ecosystem**:
  - `@langchain/langgraph@0.4.9` — LangGraph runtime (includes `MemorySaver` checkpointer re-export).
  - `langchain@0.3.34` — LangChain JS core package.
  - `@langchain/core@0.3.77` — required peer dependency.
  - Hot-path memory knobs are configured via `LANGMEM_HOTPATH_LIMIT` and `LANGMEM_HOTPATH_TOKEN_BUDGET` in the server `.env`.
- **Schema & OpenAPI**:
  - `zod@4.1.11` — runtime validation and shared schemas.
  - `zod-openapi@5.4.1` — OpenAPI v3 generation from Zod definitions.
- **Logging**: `pino@9.11.0` (Fastify's default logger is Pino-compatible).
