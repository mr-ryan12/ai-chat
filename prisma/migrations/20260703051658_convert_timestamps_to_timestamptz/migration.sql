-- Convert timestamp columns to TIMESTAMPTZ(3) so they store absolute instants,
-- immune to the DB session timezone. Fixes the skew where `@default(now())` on a
-- naive `timestamp` column wrote local wall-clock (e.g. America/Denver) that Prisma
-- then read back as UTC — surfacing as e.g. "6h ago" for a just-created row.
--
-- Rollback: ALTER each column back to `SET DATA TYPE TIMESTAMP(3)` (drops the zone;
-- values are retained as UTC wall-clock).
--
-- Prisma's --create-only diff also scaffolded destructive drift for objects that
-- live outside the datamodel; per .claude/rules/database.md these are removed here
-- and remain owned by their own raw migrations:
--   * DROP INDEX "DocumentChunk_embedding_hnsw_idx"  (manual HNSW index)
--   * ALTER TABLE "DocumentChunk" ALTER COLUMN "fts" DROP DEFAULT  (fts GENERATED column)

-- AlterTable
ALTER TABLE "Conversation" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "Document" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "DocumentChunk" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "Message" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3);
