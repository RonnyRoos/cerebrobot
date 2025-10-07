CREATE TABLE IF NOT EXISTS "LangGraphCheckpoint" (
  "id" TEXT PRIMARY KEY,
  "thread_id" TEXT NOT NULL,
  "checkpoint_ns" TEXT NOT NULL,
  "checkpoint_id" TEXT NOT NULL,
  "parent_checkpoint_id" TEXT,
  "checkpoint" TEXT NOT NULL,
  "metadata" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "checkpoint_lookup"
  ON "LangGraphCheckpoint" ("thread_id", "checkpoint_ns", "checkpoint_id");

CREATE TABLE IF NOT EXISTS "LangGraphCheckpointWrite" (
  "id" TEXT PRIMARY KEY,
  "thread_id" TEXT NOT NULL,
  "checkpoint_ns" TEXT NOT NULL,
  "checkpoint_id" TEXT NOT NULL,
  "task_id" TEXT NOT NULL,
  "write_index" INTEGER NOT NULL,
  "channel" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LangGraphCheckpointWrite_checkpoint_fkey"
    FOREIGN KEY ("thread_id", "checkpoint_ns", "checkpoint_id")
    REFERENCES "LangGraphCheckpoint"("thread_id", "checkpoint_ns", "checkpoint_id")
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "write_lookup"
  ON "LangGraphCheckpointWrite" ("thread_id", "checkpoint_ns", "checkpoint_id", "task_id", "write_index");

CREATE INDEX IF NOT EXISTS "write_checkpoint_lookup"
  ON "LangGraphCheckpointWrite" ("thread_id", "checkpoint_ns", "checkpoint_id");
