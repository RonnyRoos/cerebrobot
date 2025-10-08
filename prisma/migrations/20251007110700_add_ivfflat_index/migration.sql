-- CreateIndex: IVFFlat index for vector similarity search (cosine distance)
-- Parameters: 100 lists for ~10K rows scale, 10 probes for <200ms latency
CREATE INDEX IF NOT EXISTS "memories_embedding_idx" ON "memories" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
