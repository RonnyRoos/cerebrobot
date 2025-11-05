# Tech Stack Guardrails

## Purpose & Scope
This document constrains Cerebrobot's technology choices, especially for Phase 1. It is written for LLM assistants so they default to the approved stack, avoid premature optimization, and can justify additions against these baselines.

## Tech Stack & Versions
- **Runtime**: Node.js ≥ 20 (required for Fastify v5 and modern TypeScript tooling).
- **HTTP framework & plugins**:
  - `fastify@5.6.1` — current v5 LTS line.
  - `@fastify/websocket@10.0.1` — Fastify plugin for WebSocket routes (1 MB payload cap).
  - `ws@8.18.0` — underlying WebSocket implementation required by @fastify/websocket.
- **LangGraph ecosystem**:
  - `@langchain/langgraph@0.4.9` — LangGraph runtime (includes `MemorySaver` checkpointer re-export).
  - `langchain@0.3.34` — LangChain JS core package.
  - `@langchain/core@0.3.77` — required peer dependency.
  - Hot-path memory knobs are configured via `LANGMEM_HOTPATH_LIMIT` and `LANGMEM_HOTPATH_TOKEN_BUDGET` in the server `.env`.
- **Schema & OpenAPI**:
  - `zod@4.1.11` — runtime validation and shared schemas.
  - `zod-openapi@5.4.1` — OpenAPI v3 generation from Zod definitions.
- **Database & Migrations**:
  - `prisma@latest` — migration and schema tooling for Phase 1.5 Postgres checkpointing (use `prisma migrate` / `prisma generate`).
- **Logging**: `pino@9.11.0` (Fastify's default logger is Pino-compatible).
- **Design Library** (`@workspace/ui`):
  - `tailwindcss@3.4.15+` — utility-first CSS framework with custom design tokens.
  - `class-variance-authority@0.7.1` — CVA for component variant management.
  - `tailwind-merge@2.5.5` — utility for merging Tailwind classes without conflicts.
  - `tailwindcss-animate@1.0.7` — animation utilities for transitions and micro-interactions.
  - `clsx@2.1.1` — conditional className composition.
  - `storybook@10.0.2+` — interactive component documentation at `http://localhost:6006`.
  - **Theme**: Neon Flux (glassmorphism, purple-pink gradients, glow shadows) with dark/light/high-contrast modes.
  - **Primitives**: Box, Stack, Text, Button (polymorphic, token-driven, CVA variants).
  - **Foundation**: ShadCN UI patterns adapted to Neon Flux aesthetic.
