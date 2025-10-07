ALTER TABLE "LangGraphCheckpoint"
  ALTER COLUMN "checkpoint" TYPE BYTEA USING "checkpoint"::BYTEA,
  ALTER COLUMN "metadata" TYPE BYTEA USING "metadata"::BYTEA;

ALTER TABLE "LangGraphCheckpointWrite"
  ALTER COLUMN "value" TYPE BYTEA USING "value"::BYTEA;
