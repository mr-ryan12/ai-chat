-- Migration: add_conversation_and_created_at_to_document
--
-- Adds Document.conversationId (nullable — an upload may happen before a conversation
-- exists) and Document.createdAt (needed to resolve "the document I just uploaded" by
-- recency). Retrieval now targets the current conversation's uploads first, then the
-- user's most recent upload, before falling back to corpus-wide semantic search.
--
-- Backfill plan: existing rows get createdAt = the earliest createdAt of their chunks
-- (a good proxy for ingestion time); rows with no chunks keep the CURRENT_TIMESTAMP
-- default. conversationId stays NULL for pre-existing uploads (recency covers them).
--
-- Rollback plan:
--   ALTER TABLE "Document" DROP CONSTRAINT "Document_conversationId_fkey";
--   DROP INDEX "Document_conversationId_idx";
--   DROP INDEX "Document_userId_createdAt_idx";
--   ALTER TABLE "Document" DROP COLUMN "conversationId";
--   ALTER TABLE "Document" DROP COLUMN "createdAt";

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "conversationId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill createdAt from each document's earliest chunk where available.
UPDATE "Document" d
SET "createdAt" = c.min_created
FROM (
  SELECT "documentId", MIN("createdAt") AS min_created
  FROM "DocumentChunk"
  GROUP BY "documentId"
) c
WHERE c."documentId" = d.id;

-- CreateIndex
CREATE INDEX "Document_userId_createdAt_idx" ON "Document"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Document_conversationId_idx" ON "Document"("conversationId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
