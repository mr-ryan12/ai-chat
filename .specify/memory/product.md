# Product: OpenAI Playground

## Target User

Developers and knowledge workers who want a private AI chat assistant backed
by their own documents — without sending those documents to a third-party
service they don't control.

## Problem Being Solved

Generic AI chat tools (ChatGPT, Claude.ai) can answer general questions but
cannot ground answers in the user's private documents. Uploading sensitive
documents to those services raises data-privacy concerns. This app provides a
self-hosted alternative: bring your own OpenAI key, upload your own docs, get
citations back from your own data.

## Key User Journeys

### 1. Sign up and start chatting (core loop)
User creates an account → lands on the chat UI → types a message → receives
a streaming, animated response. No document upload required.

### 2. Ground answers in uploaded documents
User uploads a markdown/PDF file → ingestion runs in the background (chunking
+ embedding) → user asks a question mentioning "document" / "text" / "content"
→ system retrieves top-3 chunks → assistant responds with inline citations
(`DocumentName • chunkId • snippet`).

### 3. Web-augmented answers
User asks about current events or external data → system invokes the
`search_web` SerpAPI tool → response includes source + date citations.

### 4. Browse and resume conversations
User opens the sidebar → selects a past conversation → full history loads →
they continue the thread.

## UX Principles

- **Streaming first**: Responses stream word-by-word; the UI is never blocked.
- **Mobile-responsive**: Sidebar collapses on small screens with overlay/drawer.
- **Dark mode**: Supported via Tailwind dark-mode classes.
- **Transparent errors**: User-safe error messages with a short error id;
  no raw stack traces or internal details exposed.
- **Loading states**: All async operations (upload, ingestion, retrieval, chat)
  MUST show a loading indicator.

## Scope

**In scope**
- Single-user authenticated chat with conversation history
- Document upload → ingestion → vector retrieval → cited answers
- Web search tool for current/external information
- Tool calls: `search_web` (SerpAPI), `get_time_in_timezone`

**Non-goals / known gaps (as of 2026-03-01)**
- Multi-user / team workspaces — `Conversation` and `Message` have no `userId`;
  tenant scoping is not yet implemented (constitution violation, migration pending).
- Semantic routing — document context is injected only when the message contains
  "document", "text", or "content" (keyword gate, not embedding similarity).
- Hybrid retrieval — `HybridRetriever` is a stub (returns `[]`); only vector
  (cosine) retrieval is active.
- Real-time collaboration — no WebSockets, no shared conversations.
- Mobile native app — web only.

## Success Metrics

- Non-streaming server requests: p95 < 5 s in production.
- Vector retrieval: p95 < 500 ms.
- Citation accuracy: doc-grounded answers MUST include a citation for every
  factual claim drawn from a document (enforced by constitution, tested manually).
- Auth coverage: 100% of user-data routes gated by `requireAuth`.
