# ThreadMind

An AI-powered chat application with RAG (Retrieval-Augmented Generation) capabilities. Upload documents, ask questions, and get context-aware answers powered by OpenAI and pgvector.

**Live at [threadmind.dev](https://threadmind.dev)**

## Features

- **AI Chat** — Conversational interface powered by GPT-4
- **Document Upload & Ingestion** — Upload documents that get chunked, embedded, and stored for retrieval
- **Vector Search** — Relevant document context is surfaced automatically using pgvector cosine similarity
- **Tool Use** — Built-in web search (SerpAPI) and timezone tools the AI can call mid-conversation
- **Conversation Management** — Create, browse, and delete conversation threads
- **Auth** — Cookie-based session authentication with username login

## Tech Stack

- **Framework:** Remix v2 + Vite
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL + pgvector
- **AI:** OpenAI GPT-4 + text-embedding-ada-002 via LangChain
- **Styling:** Tailwind CSS

## Prerequisites

- Node.js >= 20
- Yarn 1.x
- PostgreSQL with the [pgvector](https://github.com/pgvector/pgvector) extension enabled

## Getting Started

1. **Clone and install**

   ```bash
   git clone https://github.com/mr-ryan12/threadmind.git
   cd threadmind
   yarn install
   ```

2. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Then fill in your `.env`:

   | Variable | Description |
   |---|---|
   | `DATABASE_URL` | PostgreSQL connection string (must have pgvector) |
   | `OPENAI_API_KEY` | OpenAI API key |
   | `SERPAPI_KEY` | SerpAPI key (for web search tool) |
   | `SESSION_SECRET` | Secret for cookie sessions |
   | `NODE_ENV` | `development` or `production` |

3. **Set up the database**

   ```bash
   yarn migrate:latest
   ```

4. **Start the dev server**

   ```bash
   yarn dev
   ```

   The app runs at [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---|---|
| `yarn dev` | Start dev server on port 3000 |
| `yarn build` | Production build |
| `yarn start` | Run production build |
| `yarn lint` | Run ESLint |
| `yarn typecheck` | TypeScript type check |
| `yarn migrate:new` | Create a new Prisma migration |
| `yarn migrate:latest` | Apply pending migrations |
| `yarn prisma:generate` | Regenerate Prisma client |
| `yarn run:ingest` | Run document ingestion script |
