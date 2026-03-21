-- Migration: add_user_id_to_document
--
-- Backfill plan: Document rows with no userId are orphaned dev data with no owning user.
-- All existing DocumentChunk and Document rows are deleted so the NOT NULL column can be
-- added cleanly.
--
-- Rollback notes: Restore Document/DocumentChunk rows from backup or re-run ingest.
-- The Conversation_userId_idx index is retained (@@index added to schema to resolve drift).

-- Remove orphaned document chunks and documents before adding the required column.
DELETE FROM "DocumentChunk";
DELETE FROM "Document";

-- Add the userId column (safe: table is now empty).
ALTER TABLE "Document" ADD COLUMN "userId" TEXT NOT NULL;

-- Add foreign key constraint with cascade delete.
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
