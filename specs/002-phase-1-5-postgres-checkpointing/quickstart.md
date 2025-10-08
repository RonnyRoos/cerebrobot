# Manual Persistence Verification Checklist

1. Install dependencies once if needed: `pnpm install` (from the repo root).
2. Start the stack: `docker compose up` (this runs Prisma migrations via the `migrate` service, then launches the backend on port 3030 and the Vite client on port 5173).
3. Open `http://localhost:${CLIENT_PORT:-5173}` in your browser, send a chat message, and confirm the backend response renders.
4. Restart the backend container while keeping Postgres running: `docker compose restart backend`.
5. Refresh the client and query the same session; verify the prior assistant response is still available and logs confirm checkpoint replay.
6. Stop services and run a fallback check by unsetting `LANGGRAPH_PG_URL`; confirm backend logs warn and fall back to `MemorySaver`.
7. Record results in the PR checklist before merging.

_Optional:_ To run automated Postgres persistence tests, ensure Postgres is running and execute `LANGGRAPH_PG_TESTS=true pnpm --filter @cerebrobot/server test`.
