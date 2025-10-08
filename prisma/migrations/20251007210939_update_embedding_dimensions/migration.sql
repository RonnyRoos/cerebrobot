-- Update embedding vector dimensions from 384 to 1536
-- This is required because Qwen/Qwen3-Embedding-8B with dimensions=1536 parameter
-- (1536 is under pgvector's 2000-dimension indexing limit)

-- First, drop existing data (test data only)
DELETE FROM memories WHERE embedding IS NOT NULL;

-- Drop the old IVFFlat index
DROP INDEX IF EXISTS memories_embedding_idx;

-- Update the column type
ALTER TABLE memories ALTER COLUMN embedding TYPE vector(1536);

-- Recreate HNSW index (better for semantic search, supports up to 2000 dimensions)
CREATE INDEX memories_embedding_idx ON memories USING hnsw (embedding vector_cosine_ops);
