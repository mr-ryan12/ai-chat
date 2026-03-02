# Quickstart: Link Conversations to Users

**Branch**: `001-link-user-conversations` | **Date**: 2026-03-01

## Integration Scenarios

### Scenario 1: New conversation is owned by the creating user

1. Log in as User A (`/login`)
2. Send a message from the home screen (`/`)
3. A new conversation is created → sidebar shows it under User A's session
4. Log out; log in as User B
5. User B's sidebar is empty — User A's conversation is not visible

**Expected**: User A sees 1 conversation; User B sees 0.

---

### Scenario 2: Existing conversations are scoped on reload

1. Log in as User A
2. Create two conversations by sending messages
3. Log out; log in as User B and create one conversation
4. Each user's sidebar shows only their own conversations

**Expected**: User A: 2 conversations. User B: 1 conversation. No cross-contamination.

---

### Scenario 3: Direct URL access denied for non-owner

1. Log in as User A, start a conversation, copy its URL (e.g. `/conversation/clx123abc`)
2. Log out; log in as User B
3. Navigate directly to `/conversation/clx123abc`
4. The page loads with an empty chat state — no conversation content is displayed

**Expected**: No error page; graceful empty state. User B cannot see User A's messages.

---

### Scenario 4: Delete is ownership-gated

1. Log in as User A, create a conversation, copy its ID
2. Log in as User B (separate session or incognito)
3. Send a `DELETE` request to `/api/conversation/:id/delete` using User A's conversation ID
4. Response: `{ error: "Conversation not found" }` with status 404

**Expected**: Delete rejected; no conversation removed; no information leaked.

---

## Post-Migration Verification

After running `yarn migrate:latest` and `yarn prisma:generate`:

```bash
# Verify no conversations exist without a userId
# (run in psql or via a quick script)
SELECT COUNT(*) FROM "Conversation" WHERE "userId" IS NULL;
-- Expected: 0

# Verify foreign key index exists
SELECT indexname FROM pg_indexes WHERE tablename = 'Conversation' AND indexname = 'Conversation_userId_idx';
-- Expected: 1 row
```
