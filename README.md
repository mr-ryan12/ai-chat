# OpenAI Playground

A Remix-based chat application with document ingestion and vector search capabilities using OpenAI and PostgreSQL with pgvector.

## Prerequisites

- Node.js >= 18.0.0
- PostgreSQL with pgvector extension
- OpenAI API key
- SerpAPI key

## Setup

### 1. Install Dependencies

```bash
yarn install
```

### 2. Database Setup

Install and start PostgreSQL:

```bash
brew install postgresql
brew services start postgresql
```

### 3. Environment Variables

Copy the `.env` file and add your API keys:

```bash
OPENAI_API_KEY="your-openai-api-key"
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_chat?schema=public"
SERPAPI_KEY="your-serpapi-key"
```

**Get API Keys:**
- OpenAI API key: https://platform.openai.com/api-keys
- SerpAPI key: https://serpapi.com/

### 4. Database Migration

```bash
yarn prisma:generate # Generates the Prisma Client
yarn migrate:latest # Applies migrations
```

## Development

Run the dev server:

```bash
yarn dev
```

The app will be available at http://localhost:3000

## Features

- AI-powered chat conversations
- Document upload and ingestion
- Vector similarity search
- Conversation management
- PostgreSQL with pgvector for embeddings

## Available Scripts

- `yarn dev` - Start development server
- `yarn build` - Build for production
- `yarn start` - Start production server
- `yarn prisma:generate` - Generate the Prisma Client
- `yarn migrate:latest` - Apply database migrations
