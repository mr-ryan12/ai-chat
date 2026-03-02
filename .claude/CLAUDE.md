# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Claude Steering

### Read first (canonical)
- .specify/memory/constitution.md
- .specify/memory/product.md

### Workflow
- For non-trivial changes, keep SpecKit artifacts in `.specify/specs/<feature>/` (spec → plan → tasks) up to date.

## Commands

```bash
yarn dev              # Start dev server on http://localhost:3000
yarn build            # Production build
yarn start            # Run production build
yarn lint             # ESLint
yarn typecheck        # TypeScript type check (tsc)
yarn prisma:generate  # Generate Prisma client (run after schema changes)
yarn migrate:new      # Create a new migration (dev)
yarn migrate:latest   # Apply pending migrations (deploy/CI)
yarn db:push          # Push schema to DB without migrations (prototyping only)
yarn run:ingest       # Run document ingestion script (tsx ./app/server/scripts/ingest.ts)
```

## Architecture

This is a **Remix v2** app (with Vite) using file-based routing under `app/routes/`. It is a RAG-enabled AI chat app backed by PostgreSQL + pgvector.

### Route structure

- `_index.tsx` — landing/new conversation
- `conversation.$id.tsx` — main chat UI; loader fetches conversation + sidebar list; action calls `createChatCompletion`
- `api.conversation.$id.messages.tsx` — JSON API for message history
- `api.conversation.$id.delete.tsx` — delete conversation
- `login.tsx`, `signup.tsx` — auth forms
- `upload-file.tsx` — document upload route

### Core data flow: chat

`conversation.$id.tsx` action → `app/utils/chat.ts:createChatCompletion` → LangChain `ChatOpenAI` (gpt-4, temp 0) → optional tool call (`search_web` via SerpAPI, `get_time_in_timezone`) → saves user + assistant messages to DB via Prisma → returns word array for animated rendering.

Document context is injected **only** when the user message contains "document", "text", or "content" (keyword gate, not semantic routing — a known limitation).

### Core data flow: document ingestion

`app/server/scripts/ingest.ts` → `documentService.ingestDocument()` → `MarkdownTextSplitter` (1000 chars, 200 overlap) → `OpenAIEmbeddings` (text-embedding-ada-002, 1536 dims) → raw SQL `INSERT` into `Document` and `DocumentChunk` tables with `::vector` casting. Retrieval uses cosine distance (`<->` operator), top-3 chunks.

`HybridRetriever` in `documentService.ts` is a stub (returns `[]`).

### Database (Prisma + pgvector)

Schema: `User`, `Conversation`, `Message`, `Document`, `DocumentChunk`. Embeddings stored as `vector(1536)` (pgvector). GIN indexes for `DocumentChunk.metadata` and `.fts` must be created manually in migration SQL (see comments in schema). **Note:** `Conversation` and `Message` have no `userId` column — tenant scoping is not yet implemented (gaps vs. constitution).

### Auth

Cookie-based sessions via Remix `createCookieSessionStorage`. Sessions are 30-day, HttpOnly, secure in production. `requireAuth(request)` in `app/utils/auth.server.ts` is called at the top of every protected loader/action. Passwords are hashed with bcrypt.

### Logging

Structured logging via `pino` + `pino-pretty`. Use the singleton `logger` from `app/server/utils/logger.ts`.

## Environment variables

See `.env.example`:

```
DATABASE_URL      # PostgreSQL connection string (must have pgvector extension)
OPENAI_API_KEY    # OpenAI API key
SERPAPI_KEY       # SerpAPI key (used by search_web tool)
SESSION_SECRET    # Cookie session secret
NODE_ENV          # development | production
```

## Project constitution

Engineering guardrails are defined in `.specify/memory/constitution.md`. Detailed rules are in `.claude/rules/`.
