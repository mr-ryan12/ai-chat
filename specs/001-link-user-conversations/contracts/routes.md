# Route Contracts: Link Conversations to Users

**Branch**: `001-link-user-conversations` | **Date**: 2026-03-01

All routes require an active session. `requireAuth(request)` is called at the top of every loader/action and returns `userId`. The `userId` is passed into every service helper call.

---

## GET /conversation/:id (loader)

**File**: `app/routes/conversation.$id.tsx`

**Auth**: Required — redirect to `/login` if no session.

**Behaviour change**: `getConversation(id)` now requires `userId`. If the conversation exists but belongs to a different user, the service returns `null` and the loader renders as if the conversation does not exist (no 404 status — graceful fallback to empty state).

**Response (success)**:
```ts
{
  conversation: Conversation & { messages: Message[] } | null,
  conversations: ConversationSummary[],  // only the authenticated user's conversations
  conversationId: string | null
}
```

**Response (auth failure)**: Redirect to `/login`

---

## POST /conversation/:id (action)

**File**: `app/routes/conversation.$id.tsx`

**Auth**: Required.

**Behaviour change**: `createChatCompletion(message, conversationId, userId)` now receives `userId`. When a new conversation is created inside `chat.ts`, it is created with `userId` set to the authenticated user.

**Request body** (FormData):
```
message: string         (required)
conversationId: string  (optional — empty on first message)
```

**Response (success)**:
```ts
{
  message: string,
  response: string,
  words: string[],
  conversationId: string,
  redirect?: string       // present if a new conversation was created
}
```

**Response (validation failure)**:
```ts
{ error: "Message is required", response: "", words: [] }  // status 400
```

**Response (server error)**:
```ts
{ error: "Failed to process message", response: "", words: [] }  // status 500
```

---

## GET /api/conversation/:id/messages (loader)

**File**: `app/routes/api.conversation.$id.messages.tsx`

**Auth**: Required.

**Behaviour change**: After fetching messages, the route now verifies the conversation belongs to the authenticated user. If not, returns `{ messages: [] }` with status 404 — no content or metadata leaked.

**Response (success)**:
```ts
{ messages: { id: string, content: string, role: string, createdAt: Date }[] }
```

**Response (not owned / not found)**:
```ts
{ error: "Conversation not found" }  // status 404
```

---

## DELETE /api/conversation/:id/delete (action)

**File**: `app/routes/api.conversation.$id.delete.tsx`

**Auth**: Required.

**Behaviour change**: `deleteConversation(conversationId, userId)` now receives `userId`. The delete query uses `where: { id: conversationId, userId }` — if the conversation doesn't exist or belongs to another user, Prisma throws a `RecordNotFound` error which is caught and returned as a 404.

**Response (success)**:
```ts
{ success: true }
```

**Response (not owned / not found)**:
```ts
{ error: "Conversation not found" }  // status 404
```

**Response (server error)**:
```ts
{ error: "Failed to delete conversation" }  // status 500
```

---

## Service Helper Signatures (updated)

```ts
// app/server/utils/apiCalls/getConversations.ts
getConversations(userId: string): Promise<ConversationSummary[]>

// app/server/utils/apiCalls/getConversation.ts
getConversation(id: string, userId: string): Promise<(Conversation & { messages: Message[] }) | null>
createNewConversation(userId: string): Promise<Conversation & { messages: Message[] }>

// app/server/utils/apiCalls/deleteConversation.ts
deleteConversation(conversationId: string, userId: string): Promise<{ success: true }>

// app/utils/chat.ts
createChatCompletion(message: string, conversationId: string | undefined, userId: string): Promise<{ response: string, words: string[], conversationId: string }>
```
