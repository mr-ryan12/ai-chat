-- Migration: add_fts_generated_column_and_gin_indexes
--
-- Enables hybrid retrieval (pgvector similarity + Postgres full-text search, fused
-- with RRF). Makes DocumentChunk.fts a STORED generated column derived from content
-- (so ingestion never has to populate it), and adds the GIN indexes the schema
-- documents: `fts` for full-text search and `metadata` for jsonb filters.
--
-- Backfill: none needed — a STORED generated column is computed for all existing rows
-- when the column is added.
--
-- Rollback plan:
--   DROP INDEX "DocumentChunk_metadata_idx";
--   DROP INDEX "DocumentChunk_fts_idx";
--   ALTER TABLE "DocumentChunk" DROP COLUMN "fts";
--   ALTER TABLE "DocumentChunk" ADD COLUMN "fts" tsvector;

-- fts was previously an unpopulated nullable column; replace it with a generated one.
ALTER TABLE "DocumentChunk" DROP COLUMN IF EXISTS "fts";
ALTER TABLE "DocumentChunk"
  ADD COLUMN "fts" tsvector
  GENERATED ALWAYS AS (to_tsvector('english', "content")) STORED;

-- GIN indexes (Prisma can't express these on Unsupported columns).
CREATE INDEX "DocumentChunk_fts_idx" ON "DocumentChunk" USING GIN ("fts");
CREATE INDEX "DocumentChunk_metadata_idx" ON "DocumentChunk" USING GIN ("metadata");
