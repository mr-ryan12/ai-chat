-- Step 1: Purge all existing messages and conversations (dev app, no real user data)
DELETE FROM "Message";
DELETE FROM "Conversation";

-- Step 2: Add userId column (NOT NULL — safe because table is now empty)
ALTER TABLE "Conversation" ADD COLUMN "userId" TEXT NOT NULL;

-- Step 3: Add foreign key constraint with cascade delete
ALTER TABLE "Conversation"
  ADD CONSTRAINT "Conversation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 4: Add index for efficient per-user queries
CREATE INDEX "Conversation_userId_idx" ON "Conversation"("userId");
