-- Migration: add_hnsw_index_on_documentchunk_embedding
--
-- Replaces the sequential exact scan for vector search with an approximate-nearest-
-- neighbor HNSW index (pgvector >= 0.5; DB is on 0.8). Uses `vector_l2_ops` to match
-- the `<->` (L2 distance) operator used by HybridRetriever.vectorSearch. OpenAI
-- embeddings are unit-normalized, so L2 ranking matches cosine ranking.
--
-- NOTE: `prisma migrate dev --create-only` scaffolded destructive drift here (dropping
-- the manual GIN indexes on `fts`/`metadata` and the `fts` generated-column default),
-- because those live outside Prisma's model (Unsupported column + raw indexes). That
-- was discarded — this migration only adds the HNSW index. No data change.
--
-- Rollback plan:
--   DROP INDEX "DocumentChunk_embedding_hnsw_idx";

CREATE INDEX "DocumentChunk_embedding_hnsw_idx"
  ON "DocumentChunk" USING hnsw (embedding vector_l2_ops)
  WITH (m = 16, ef_construction = 64);
