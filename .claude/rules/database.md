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
- GIN indexes for `DocumentChunk.metadata` and `.fts`, the HNSW index on `.embedding`, and the `.fts` generated column live outside Prisma's model (Unsupported columns / raw SQL). `prisma migrate dev` will scaffold **destructive drift** that drops them — always review generated migrations and discard any `DROP INDEX`/`DROP DEFAULT` for these; keep them in raw migration SQL only
- Use Prisma `select`/`include` intentionally; avoid N+1 patterns
- Add indexes for high-frequency filter columns
- Embeddings are `vector(1536)` (pgvector); retrieval uses cosine distance (`<->` operator), top-3 chunks by default (hard cap ≤ 10)
- Identical normalized content must not be re-embedded — use content-hash deduplication
- Deleting a document must also delete or mark unreachable its associated chunks/embeddings
