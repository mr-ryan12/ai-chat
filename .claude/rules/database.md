---
paths:
  - "app/server/**"
  - "prisma/**"
---

# Database Rules

- All queries must be scoped by `userId` (and `conversationId` where applicable) — no exceptions
- Tenant scoping must be enforced in a shared access layer (repository/service helpers), not hand-rolled per route
- DB changes must include: a migration file, a rollback plan, and a backfill plan if needed
- Never use `db:push` outside local prototyping — use `yarn migrate:new` for all real changes
- GIN indexes for `DocumentChunk.metadata` and `.fts` must be created manually in migration SQL
- Use Prisma `select`/`include` intentionally; avoid N+1 patterns
- Add indexes for high-frequency filter columns
- Embeddings are `vector(1536)` (pgvector); retrieval uses cosine distance (`<->` operator), top-3 chunks by default (hard cap ≤ 10)
- Identical normalized content must not be re-embedded — use content-hash deduplication
- Deleting a document must also delete or mark unreachable its associated chunks/embeddings
