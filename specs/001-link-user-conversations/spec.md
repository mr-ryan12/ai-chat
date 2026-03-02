# Feature Specification: Link Conversations to Users

**Feature Branch**: `001-link-user-conversations`
**Created**: 2026-03-01
**Status**: Draft
**Input**: User description: "Link conversations to users to resolve the known gap where Conversation and Message models have no userId. Currently all conversations are visible to all users."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Only My Conversations Appear in the Sidebar (Priority: P1)

A logged-in user opens the app and sees only the conversations they personally started. Conversations belonging to other accounts are never visible, even if they exist in the system.

**Why this priority**: This is the core tenant isolation requirement. Without it, every user can read every other user's conversation history, which is the primary gap this feature resolves.

**Independent Test**: Log in as User A, create two conversations. Log in as User B, create one conversation. Each user's sidebar shows only their own conversations — User A sees two, User B sees one.

**Acceptance Scenarios**:

1. **Given** User A is logged in and has 3 conversations, **When** they view the sidebar, **Then** they see exactly their 3 conversations and no others.
2. **Given** User B has conversations in the system, **When** User A views the sidebar, **Then** User B's conversations do not appear.
3. **Given** a newly registered user with no conversations, **When** they view the sidebar, **Then** an empty state is shown with no errors.

---

### User Story 2 — New Conversations Are Automatically Mine (Priority: P2)

When a logged-in user sends their first message and a new conversation is created, it is automatically linked to their account. No manual action or selection is required.

**Why this priority**: Ownership must be established at creation time. If conversations are created without an owner, the isolation guarantee in Story 1 breaks immediately.

**Independent Test**: Log in, send a message, observe a new conversation appears in the sidebar under that account only — not visible under any other account.

**Acceptance Scenarios**:

1. **Given** a logged-in user, **When** they send the first message in a new chat, **Then** the resulting conversation is linked to their account.
2. **Given** two users logged in on different sessions, **When** each sends a message creating a new conversation, **Then** each user's sidebar shows only their own new conversation.

---

### User Story 3 — Direct URL Access is Restricted to the Owner (Priority: P3)

If a user navigates directly to a conversation URL that belongs to another user, they receive a not-found response. No information about the conversation's existence is revealed.

**Why this priority**: Sidebar filtering (Story 1) prevents accidental discovery, but a user could still guess or share a URL. This story closes that gap.

**Independent Test**: Log in as User A, copy the URL of one of their conversations. Log out and log in as User B. Paste User A's conversation URL. The app responds as if the conversation does not exist.

**Acceptance Scenarios**:

1. **Given** User B is logged in, **When** they navigate to a URL for a conversation owned by User A, **Then** they receive a not-found response.
2. **Given** User A is logged in, **When** they navigate to their own conversation URL, **Then** the conversation loads normally.
3. **Given** an unauthenticated visitor, **When** they attempt to access any conversation URL, **Then** they are redirected to the login page.

---

### Edge Cases

- A user with zero conversations sees an empty sidebar — no errors, just an empty state message.
- An unauthenticated request to any conversation endpoint is redirected to login, not shown a not-found or error.
- Existing conversations in the database that predate this feature and have no owner must be handled at migration time (see Assumptions).
- A conversation is deleted by its owner — subsequent access attempts by any user return not-found.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each conversation MUST be owned by exactly one user, established at the moment of creation.
- **FR-002**: When a new conversation is created, the system MUST automatically assign ownership to the currently authenticated user.
- **FR-003**: The conversation list shown to a user MUST contain only conversations they own — no other users' conversations may appear.
- **FR-004**: Fetching a conversation by its identifier MUST return not-found if the requesting user does not own that conversation.
- **FR-005**: Deleting a conversation MUST only be permitted for the user who owns it; requests from any other user MUST be rejected.
- **FR-006**: All existing conversations without an owner MUST be resolved at migration time — either purged or assigned — so that zero unowned conversations remain after the migration runs.

### Key Entities

- **User**: Owns zero or more conversations. Identified by their authenticated session.
- **Conversation**: Belongs to exactly one User. Ownership is immutable after creation. Contains an ordered list of messages.
- **Message**: Belongs to a Conversation and is implicitly scoped to the conversation's owner. No separate user ownership field is required on messages.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A logged-in user sees only their own conversations — verified by confirming zero cross-account conversations appear in any user's sidebar.
- **SC-002**: Every new conversation created after this feature ships is linked to a user — verified by confirming no conversation records exist without an owner.
- **SC-003**: Attempting to access another user's conversation by direct URL results in a not-found response 100% of the time — no conversation content or metadata is leaked.
- **SC-004**: Zero unowned conversations remain in the system after the migration runs.
- **SC-005**: All existing application routes that read, list, or delete conversations continue to function correctly for authenticated users accessing their own data.

---

## Assumptions

- **Message scoping**: `Message` records do not require a direct user ownership field. They are implicitly scoped to the authenticated user through their parent `Conversation`. This avoids redundant data and aligns with standard relational modelling.
- **Pre-existing conversations**: Because this is a development/learning application with no real end-users, any conversations created before this migration (which currently have no owner) will be purged rather than assigned to a user. A backfill to a specific user is not warranted.
- **Ownership is immutable**: A conversation's owner cannot be transferred to another user. This is out of scope.

## Out of Scope

- Sharing conversations between users or making conversations public.
- Transferring conversation ownership from one user to another.
- Adding `userId` directly to `Message` records (implicitly scoped through `Conversation`).
- Multi-user or team workspaces.
