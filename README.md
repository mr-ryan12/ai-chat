# ThreadMind

An AI-powered chat application with RAG (Retrieval-Augmented Generation) capabilities. Upload documents, ask questions, and get context-aware answers powered by OpenAI and pgvector.

**Live at [threadmind.dev](https://threadmind.dev)**

## Features

- **AI Chat** — Conversational interface powered by GPT-4
- **Document Upload & Ingestion** — Upload documents that get chunked, embedded, and stored for retrieval
- **Vector Search** — Relevant document context is surfaced automatically using pgvector cosine similarity
- **Tool Use** — Built-in web search (SerpAPI) and timezone tools the AI can call mid-conversation
- **Conversation Management** — Create, browse, and delete conversation threads
- **Auth** — Cookie-based session authentication with secure password hashing

## Tech Stack

- **Framework:** Remix v2 + Vite
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL + pgvector
- **AI:** OpenAI GPT-4 + text-embedding-ada-002 via LangChain
- **Styling:** Tailwind CSS
