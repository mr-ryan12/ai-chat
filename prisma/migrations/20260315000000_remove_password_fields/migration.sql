-- Migration: remove_password_fields
-- Removes password, firstName, lastName columns from the User table.
-- Backfill plan: none required — these columns are being intentionally dropped
-- as part of the move to username-only authentication.
-- Rollback: add back the columns as nullable, then backfill or drop the table data.

ALTER TABLE "User" DROP COLUMN IF EXISTS "password";
ALTER TABLE "User" DROP COLUMN IF EXISTS "firstName";
ALTER TABLE "User" DROP COLUMN IF EXISTS "lastName";
