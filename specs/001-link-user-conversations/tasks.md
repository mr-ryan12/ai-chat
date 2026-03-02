# Tasks: Link Conversations to Users

**Input**: Design documents from `specs/001-link-user-conversations/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: No test tasks — tests not requested in the spec. Quickstart scenarios in `quickstart.md` serve as manual validation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: User story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup (DB Schema & Migration)

**Purpose**: Schema and migration changes that block ALL subsequent work. Must be complete before any service or route changes.

**⚠️ CRITICAL**: No service or route work can begin until this phase is complete — the Prisma client must reflect the new schema.

- [ ] T001 Update `prisma/schema.prisma` — add `userId String` field and `user User @relation(fields: [userId], references: [id], onDelete: Cascade)` to `Conversation` model; add `conversations Conversation[]` back-relation to `User` model
- [ ] T002 Run `yarn migrate:new` (migration name: `add_user_id_to_conversation`) to scaffold the migration directory, then replace the auto-generated SQL in the new `prisma/migrations/[timestamp]_add_user_id_to_conversation/migration.sql` with the custom SQL from `specs/001-link-user-conversations/data-model.md` (DELETE FROM Message; DELETE FROM Conversation; ALTER TABLE ADD COLUMN userId NOT NULL; ADD CONSTRAINT FK with CASCADE; CREATE INDEX)
- [ ] T003 Apply migration and regenerate Prisma client: run `yarn migrate:latest` then `yarn prisma:generate`; confirm no errors

**Checkpoint**: `prisma/schema.prisma` contains `userId` on `Conversation`; Prisma client is regenerated; migration applied successfully.

---

## Phase 2: Foundational (Service Layer)

**Purpose**: Update all service helpers to require `userId` and apply scoping. These are the shared access layer — ALL user stories depend on this phase being complete.

**⚠️ CRITICAL**: No route changes can be made until the service helper signatures are updated here.

- [ ] T004 [P] Update `app/server/utils/apiCalls/getConversations.ts` — add `userId: string` parameter to `getConversations`; add `where: { userId }` to `prisma.conversation.findMany`; update explicit return type to `Promise<ConversationSummary[]>`
- [ ] T005 [P] Update `app/server/utils/apiCalls/getConversation.ts` — add `userId: string` parameter to `getConversation`; add `userId` to the `findUnique` where clause (`where: { id, userId }`); add `userId: string` parameter to `createNewConversation`; pass `userId` to `prisma.conversation.create({ data: { userId } })`; update explicit return types on both functions
- [ ] T006 [P] Update `app/server/utils/apiCalls/deleteConversation.ts` — add `userId: string` parameter to `deleteConversation`; add `userId` to the `prisma.conversation.delete` where clause (`where: { id: conversationId, userId }`); update explicit return type to `Promise<{ success: true }>`
- [ ] T007 Update `app/utils/chat.ts` — add `userId: string` as a required third parameter to `createChatCompletion`; pass `userId` to `createNewConversation(userId)` (line ~124); pass `userId` to `getConversation(conversationId, userId)` (line ~47); update explicit return type

**Checkpoint**: All four service helpers accept `userId`; TypeScript types updated; `yarn typecheck` passes on these files.

---

## Phase 3: User Story 1 — Sidebar Shows Only My Conversations (Priority: P1) 🎯 MVP

**Goal**: Every route that renders the conversation sidebar passes the authenticated user's ID to `getConversations`, so users only see their own conversations.

**Independent Test**: Log in as User A and create a conversation. Log in as User B and create a conversation. Each user's sidebar shows only their own conversation. *(Note: requires US2 creation path to also work — addressed in T009/T010 actions below.)*

- [ ] T008 [P] [US1] Update `app/routes/conversations.tsx` loader — change `await requireAuth(request)` to `const userId = await requireAuth(request)`; pass `userId` to `getConversations(userId)`
- [ ] T009 [US1] Update `app/routes/_index.tsx` loader and action — capture `userId` from `requireAuth` in both; pass to `getConversations(userId)` in loader; pass to `createChatCompletion(message, conversationId, userId)` in action
- [ ] T010 [US1] Update `app/routes/conversation.$id.tsx` loader — capture `userId` from `requireAuth`; pass to `getConversation(conversationId, userId)` and `getConversations(userId)`

**Checkpoint**: Log in as two different users and verify each sidebar is isolated to their own conversations.

---

## Phase 4: User Story 2 — New Conversations Are Automatically Mine (Priority: P2)

**Goal**: When a new conversation is created from the conversation page action, it is linked to the authenticated user.

**Independent Test**: Log in, send a first message from `/conversation/:id`, verify the resulting conversation appears in the sidebar and is not visible to another user.

*(The `_index.tsx` action was already updated in T009.)*

- [ ] T011 [US2] Update `app/routes/conversation.$id.tsx` action — capture `userId` from `requireAuth`; pass to `createChatCompletion(message, conversationId, userId)`

**Checkpoint**: Sending a first message from any route creates a conversation owned by the authenticated user. No unowned conversations are created after this point.

---

## Phase 5: User Story 3 — Direct URL Access Restricted to Owner (Priority: P3)

**Goal**: API routes that fetch or delete conversations by ID verify ownership via `userId` before returning data or performing mutations.

**Independent Test**: Log in as User B, send a DELETE or messages GET request for a conversation owned by User A — receive a 404 response with no data leaked.

- [ ] T012 [P] [US3] Update `app/routes/api.conversation.$id.messages.tsx` loader — capture `userId` from `requireAuth`; call `getConversation(conversationId, userId)` to verify ownership; if result is `null`, return `data({ error: "Conversation not found" }, { status: 404 })` immediately; otherwise proceed to fetch messages with the existing `prisma.message.findMany` query
- [ ] T013 [US3] Update `app/routes/api.conversation.$id.delete.tsx` action — capture `userId` from `requireAuth`; pass to `deleteConversation(conversationId, userId)`; catch Prisma `RecordNotFound` error and return `data({ error: "Conversation not found" }, { status: 404 })`

**Checkpoint**: All four conversation-related routes enforce ownership. Cross-user access returns 404 on all paths (sidebar list, message fetch, delete, direct URL load).

---

## Phase 6: Polish & Cross-Cutting

**Purpose**: Documentation cleanup and final validation.

- [ ] T014 [P] Remove the "Known gap" language from `.claude/rules/database.md` (remove the bullet "Known gap: `Conversation` and `Message` lack `userId`...") and update `.specify/memory/product.md` Non-goals section to remove the `Conversation`/`Message` userId tenant scoping gap note
- [ ] T015 [P] Update `.specify/memory/constitution.md` Known Gap comment (sync impact report header) to note that the tenant scoping violation is resolved by this feature
- [ ] T016 Run `yarn typecheck` and `yarn lint` across the full project; resolve any type errors introduced by the new `userId` parameters

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (Prisma client must be regenerated first) — **BLOCKS all route changes**
- **Phase 3 (US1)**: Depends on Phase 2 — service helpers must accept `userId`
- **Phase 4 (US2)**: Depends on Phase 2; can run in parallel with Phase 3 (different file sections)
- **Phase 5 (US3)**: Depends on Phase 2; can start after Phase 2 independently of Phase 3/4
- **Phase 6 (Polish)**: Depends on Phases 3–5 all complete

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2; no dependency on US2 or US3
- **US2 (P2)**: Depends on Phase 2; no dependency on US1 or US3
- **US3 (P3)**: Depends on Phase 2; no dependency on US1 or US2

### Within Each Phase

- T004, T005, T006 (Phase 2) — fully parallel, different files
- T007 (Phase 2) — depends on T005 (createNewConversation and getConversation signatures must be updated first)
- T008, T009, T010 (Phase 3) — T008 is parallel with T009/T010; T009 and T010 touch different files
- T012, T013 (Phase 5) — fully parallel, different files
- T014, T015, T016 (Phase 6) — T014 and T015 parallel; T016 runs last

---

## Parallel Execution Examples

### Phase 2 (run together after T003):
```
T004 — getConversations.ts
T005 — getConversation.ts
T006 — deleteConversation.ts
# then T007 (chat.ts) after T005 completes
```

### Phase 3 + 4 + 5 (run together after Phase 2):
```
T008 — conversations.tsx loader
T009 — _index.tsx loader + action
T010 — conversation.$id.tsx loader
T011 — conversation.$id.tsx action  (after T010 completes)
T012 — api.conversation.$id.messages.tsx
T013 — api.conversation.$id.delete.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 — Sidebar Isolation)
1. Complete Phase 1 (schema + migration)
2. Complete Phase 2 (service layer)
3. Complete Phase 3 (US1 — sidebar scoping)
4. **STOP AND VALIDATE**: Two users — each sees only their own conversations
5. Continue with Phase 4 + 5 for full feature

### Full Feature Delivery
1. Phase 1 → Phase 2 → Phases 3/4/5 (parallel) → Phase 6
2. Each phase adds a complete, independently verifiable increment
3. Validate with `quickstart.md` integration scenarios after Phase 5

---

## Notes

- All `requireAuth(request)` calls currently discard the return value — the core change is simply `const userId = await requireAuth(request)`
- No new files needed — all changes are updates to existing files
- `Message` model is unchanged — it is implicitly scoped through `Conversation`
- The migration is destructive (purges all existing conversations) — appropriate for this dev-only app with no real user data
