# Data Model: Link Conversations to Users

**Branch**: `001-link-user-conversations` | **Date**: 2026-03-01

## Schema Changes

### Conversation (updated)

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, cuid() | No change |
| title | String? | nullable | No change |
| **userId** | **String** | **NOT NULL, FK → User.id** | **New field** |
| createdAt | DateTime | default now() | No change |
| updatedAt | DateTime | @updatedAt | No change |
| messages | Message[] | relation | No change |
| **user** | **User** | **relation** | **New relation** |

**Cascade**: `onDelete: Cascade` — deleting a User deletes all their Conversations.

### User (updated — relation added)

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, cuid() | No change |
| username | String | unique | No change |
| password | String | VarChar(255) | No change |
| firstName | String | — | No change |
| lastName | String | — | No change |
| createdAt | DateTime | default now() | No change |
| **conversations** | **Conversation[]** | **relation** | **New back-relation** |

### Message (no change)

Messages are implicitly scoped through Conversation. No schema changes required.

---

## Prisma Schema (target state)

```prisma
model User {
  id            String         @id @default(cuid())
  username      String         @unique
  password      String         @db.VarChar(255)
  firstName     String
  lastName      String
  createdAt     DateTime       @default(now())
  conversations Conversation[]
}

model Conversation {
  id        String    @id @default(cuid())
  title     String?
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  messages  Message[]
}
```

---

## Migration Plan

### Forward migration

```sql
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
```

### Rollback

```sql
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_userId_fkey";
DROP INDEX "Conversation_userId_idx";
ALTER TABLE "Conversation" DROP COLUMN "userId";
```

### Backfill plan

None required. The forward migration purges all pre-existing rows. This is appropriate for a development application with no real user data (see research.md Decision 1).

---

## Entity Relationships (post-migration)

```
User ──< Conversation ──< Message
  1          *               *
```

- One `User` owns zero or more `Conversations`
- One `Conversation` belongs to exactly one `User`
- One `Conversation` contains zero or more `Messages`
- `Messages` are implicitly scoped to the owning `User` through `Conversation`
