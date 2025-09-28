# Cerebrobot

## Mission Snapshot
- Self-hostable LangGraph chatbot with transparent, operator-controlled memory.
- Prioritizes Phase 1 loop: single agent, inspectable hotpath memory, Fastify API, lightweight UI.
- Keeps seams open for future persistence, multi-agent orchestration, and operator tooling.

## Development Setup
1. Install prerequisites: Node.js 20.11+, pnpm 9.
2. Clone the repo and install deps:
   ```bash
   pnpm install
   ```
3. Copy `.env.example` to `.env` (adjust LangGraph agent settings as desired).

## Workspace Commands
- Run lint/format/tests (hygiene loop):
  ```bash
  pnpm lint
  pnpm format:write
  pnpm test
  ```
- Start the server (Fastify SSE API):
  ```bash
  pnpm --filter @cerebrobot/server dev
  ```
- Start the client (Vite + React UI):
  ```bash
  pnpm --filter @cerebrobot/client dev
  ```

The server reads configuration from environment variables (see `.env.example`). Restart the process after changing agent parameters.
