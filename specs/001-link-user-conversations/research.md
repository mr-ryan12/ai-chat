# Research: Link Conversations to Users

**Branch**: `001-link-user-conversations` | **Date**: 2026-03-01

## Decision 1: Migration Strategy for Adding a Non-Null Foreign Key

**Decision**: Two-step migration — (1) purge all existing conversations and their messages, (2) add `userId` as a non-null column with a foreign key constraint referencing `User`.

**Rationale**: Adding a `NOT NULL` column to a table with existing rows requires either a default value or prior data cleanup. Because this is a development/learning app with no real user data, the spec explicitly calls for purging orphaned conversations rather than backfilling. Purging first means we can add the column as `NOT NULL` immediately without a nullable intermediate state, keeping the schema clean and avoiding a multi-step alter.

**Rollback**: `ALTER TABLE "Conversation" DROP COLUMN "userId"` — straightforward column drop. Messages are unaffected since their FK is to `Conversation`, not `User`.

**Alternatives considered**:
- *Add as nullable first, backfill, then alter to NOT NULL*: Standard production approach for live data, but unnecessary here — adds migration complexity for zero benefit.
- *Add with a dummy default userId*: Would leave invalid foreign keys; rejected.

---

## Decision 2: Cascade Delete Behaviour

**Decision**: `onDelete: Cascade` on the `Conversation → User` foreign key. When a user is deleted, all their conversations (and by extension, messages) are deleted.

**Rationale**: Aligns with the constitution's requirement that "deleting a document must also delete or mark unreachable its associated chunks." The same principle applies here — deleting a user's account must not leave orphaned conversation and message rows. Messages already have an implicit cascade through `Conversation` (Prisma deletes cascade from Conversation to Message).

**Alternatives considered**:
- *Restrict*: Would prevent user deletion if conversations exist — poor UX, not appropriate for this app.
- *Set null*: Would leave ownerless conversations — exactly the problem we're solving.

---

## Decision 3: Ownership Enforcement in Service Layer

**Decision**: Add `userId` as a required parameter to all conversation service helpers (`getConversation`, `getConversations`, `deleteConversation`, `createNewConversation`). Scoping is applied inside the helper, not in the route.

**Rationale**: The constitution requires tenant scoping to be enforced in "a shared access layer (repository/service helpers and/or ORM middleware), not hand-rolled per route." The existing service helpers in `app/server/utils/apiCalls/` are the correct enforcement point.

**Alternatives considered**:
- *Scope in each route directly*: Violates the constitution's access-layer rule; also leads to duplication.
- *Prisma middleware*: More complex setup; the project doesn't currently use middleware and adding it for a single field is over-engineering.

---

## Decision 4: userId Flow Through chat.ts

**Decision**: `createChatCompletion` in `app/utils/chat.ts` accepts a new required `userId: string` parameter and passes it to `createNewConversation` and `getConversation`.

**Rationale**: `chat.ts` is the only path through which new conversations are created outside of a direct service call. Without threading `userId` through it, `createNewConversation()` would have no user to link to. The route action already calls `requireAuth(request)` — it just discards the return value today. Capturing and passing it is a one-line change per route.

**Alternatives considered**:
- *Read userId from session inside chat.ts*: Would require passing `request` into a utility that currently has no knowledge of the HTTP layer — wrong direction for a shared utility.

---

## Decision 5: Message Model — No Direct userId

**Decision**: Do not add `userId` to the `Message` model. Messages are implicitly scoped through their parent `Conversation`.

**Rationale**: Every message lookup in the codebase goes through `conversation.messages` or `prisma.message.findMany({ where: { conversationId } })`. Since conversation access is now gated by `userId`, any message query that goes through a scoped conversation is automatically tenant-isolated. Adding `userId` to `Message` would be redundant normalisation and would require additional migration work for no security or query benefit.

**Alternatives considered**:
- *Add userId to Message*: Redundant; adds migration, schema, and query complexity for no gain.
