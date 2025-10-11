-- DropIndex
DROP INDEX "memories_embedding_idx";

-- CreateTable
CREATE TABLE "threads" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "threads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "threads_agent_id_idx" ON "threads"("agent_id");

-- CreateIndex
CREATE INDEX "threads_user_id_idx" ON "threads"("user_id");

-- CreateIndex
CREATE INDEX "memories_namespace_created_at_idx" ON "memories"("namespace", "created_at" DESC);
