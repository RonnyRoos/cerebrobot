-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memories" (
    "id" TEXT NOT NULL,
    "namespace" TEXT[],
    "key" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "embedding" vector(384),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "memories_namespace_key_key" ON "memories"("namespace", "key");

-- CreateIndex: IVFFlat index for vector similarity search (cosine distance)
-- Parameters: 100 lists for ~10K rows scale, 10 probes for <200ms latency
CREATE INDEX "memories_embedding_idx" ON "memories" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
