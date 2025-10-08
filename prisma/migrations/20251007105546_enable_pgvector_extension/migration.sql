-- DropForeignKey
ALTER TABLE "LangGraphCheckpointWrite" DROP CONSTRAINT "LangGraphCheckpointWrite_checkpoint_fkey";

-- AlterTable
ALTER TABLE "LangGraphCheckpoint" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "LangGraphCheckpointWrite" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "LangGraphCheckpointWrite" ADD CONSTRAINT "LangGraphCheckpointWrite_thread_id_checkpoint_ns_checkpoin_fkey" FOREIGN KEY ("thread_id", "checkpoint_ns", "checkpoint_id") REFERENCES "LangGraphCheckpoint"("thread_id", "checkpoint_ns", "checkpoint_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "checkpoint_lookup" RENAME TO "LangGraphCheckpoint_thread_id_checkpoint_ns_checkpoint_id_key";

-- RenameIndex
ALTER INDEX "write_lookup" RENAME TO "LangGraphCheckpointWrite_thread_id_checkpoint_ns_checkpoint_key";

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;
