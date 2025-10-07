# Research Notes – Phase 1.5 Postgres Checkpointing

## AsyncPostgresSaver Schema
- Tables required: `LangGraphCheckpoint` and `LangGraphCheckpointWrite`; key columns include `thread_id`, `checkpoint_id`, optional `parent_checkpoint_id`, serialized checkpoint payloads, and timestamps.
- Index expectations: unique constraint on `(thread_id, checkpoint_ns, checkpoint_id)` plus supporting indexes on `parent_checkpoint_id` for traversal.
- Serialized values are stored as `BYTEA` (`Bytes` in Prisma) to match LangGraph's binary payloads.

## Migration Strategy
- Use `pnpm prisma migrate dev` locally to evolve schema; `pnpm prisma migrate deploy` in the one-shot Compose service.
- Migration container waits for Postgres health (`pg_isready`) before invoking Prisma.
- Migrations live under `prisma/migrations/` (e.g., `0001_init`, `0002_bytes_columns`).

## Verification Notes
- Manual persistence check: after interacting with the client, run
  ```sql
  SELECT thread_id, checkpoint_id, octet_length(checkpoint) AS checkpoint_bytes, updated_at
  FROM "LangGraphCheckpoint"
  ORDER BY updated_at DESC
  LIMIT 5;
  ```
  to confirm checkpoints are written.
- Running `LANGGRAPH_PG_TESTS=true pnpm --filter @cerebrobot/server test` executes the optional integration suite when Postgres is available.

## Configuration References
- Env vars: `LANGGRAPH_PG_URL`, `LANGGRAPH_PG_SCHEMA` (optional), `LANGGRAPH_PG_SSL` (future-proof), Prisma uses `DATABASE_URL` (mirror `LANGGRAPH_PG_URL`).
- `.env.example` should include defaults pointing to Compose service (`postgres://cerebrobot:cerebrobot@postgres:5432/cerebrobot`).

## References
- docs/mission.md – Phase 2 persistence goals.
- docs/tech-stack.md – Guardrails on approved stack.
- docs/best-practices.md – Hygiene loop and testing expectations.
- docs/references/langgraph-memory-in-python-article.md – Store and checkpointer guidance.
