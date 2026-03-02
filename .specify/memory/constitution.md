<!--
SYNC IMPACT REPORT
==================
Version change: (none — initial formal versioning) → 1.0.0
Source: Migrated from a previously unversioned constitution (former location: .speckit/constitution.md; directory removed)

Modified principles: N/A (initial creation)
Added sections: All 8 sections (I–VIII) newly formalised in this location
Removed sections: None

Templates reviewed:
  ✅ .specify/templates/plan-template.md — "Constitution Check" gate aligns with all principles
  ✅ .specify/templates/spec-template.md — Success Criteria and Requirements sections align
  ✅ .specify/templates/tasks-template.md — Task categories align with Change Protocol

Follow-up TODOs:
  - TODO(HYBRID_RETRIEVER): Prior constitution noted HybridRetriever is a stub — Principle V references this as a known gap.
    Implement or remove stub before next minor amendment.
  - TODO(TENANT_SCOPING): Conversation and Message models lack userId — violates Security & Privacy (Tenant Isolation).
    Must be addressed in a migration before next constitution amendment.
-->

# OpenAI Playground Constitution

This document defines non-negotiable engineering and product guardrails.
Specs and implementation MUST comply. The constitution supersedes all other
documented practices; any conflict is resolved in favour of this document.

## Core Principles

### I. Code Quality

TypeScript `strict` MUST remain enabled at all times. New or changed
functions MUST carry explicit return types when non-trivial. Server route
boundaries (loaders, actions, API handlers) MUST catch and convert errors into
typed, structured responses — unhandled promise rejections are forbidden.

Rules:
- **Error taxonomy**: Use ValidationError, AuthError, NotFoundError, and
  ExternalServiceError. Every error MUST preserve a `cause` and carry a
  correlation id.
- **Reuse over copy/paste**: Repeated logic MUST be extracted into shared
  utilities or services. Prefer composition over inheritance.
- **Naming**: Functions are verbs (`fetchMessages`, `createEmbedding`);
  variables are nouns. Avoid ambiguous names (`data`, `info`) outside narrow
  local scopes.
- **File size**: Prefer files ≤ 300 lines. Exceptions allowed only when
  splitting would reduce cohesion.
- **Dependency discipline**: Do not add new dependencies unless the spec
  requires it; prefer existing libraries.
- **DB safety**: All queries MUST be scoped by `userId` (and `conversationId`
  where applicable) by default — no exceptions.
- **Tenant scoping enforcement point**: Scoping MUST be enforced in a shared
  access layer (repository/service helpers and/or ORM middleware), not hand-rolled per route.

### II. Testing Standards

Tests MUST be deterministic by default. Network availability MUST NOT be
assumed in CI unless explicitly opted-in.

Rules:
- **Test pyramid**: Unit tests MUST mock external services (OpenAI, web search,
  storage). Integration tests MAY call real services only when
  `RUN_INTEGRATION_TESTS=1` is set and MUST be rate-limited.
- **Critical paths**: Auth, document upload/ingestion, retrieval, chat
  streaming, and tool-call routing MUST have coverage.
- **Test data isolation**: Tests MUST use isolated DB state
  (transaction/rollback or reset) and MUST clean up reliably.
- **Integration test gating**: Integration tests MUST skip gracefully with a
  clear message when required env vars are missing.

### III. Conversation & Tooling Policy

For every user message the system MUST choose exactly one of:
1. General response (no citations required)
2. Document-grounded response (citations required)
3. Web-search tool response (citations required)
4. Clarifying question (when intent or retrieval evidence is insufficient)

Document-grounding rules:
- Citations MUST use the format: `DocumentName • chunkId • short snippet`.
- The system MUST NOT imply documents contain information unless retrieval
  evidence exists.
- General knowledge MUST NOT fill gaps in a document-grounded answer unless
  the spec for that endpoint explicitly permits it.

Web-search rules:
- Web search is allowed only when (a) the user requests current/external
  information, or (b) retrieval cannot support the answer and a web search is
  likely helpful.
- Web results MUST be cited with source and date.
- Web search MUST NOT include or leak private user document contents or secrets
  in the query.

Routing tie-breakers:
- If the user requests "doc-only" / "use my uploads", web search is forbidden.
- If retrieval returns relevant hits above the configured threshold, prefer
  document-grounded over web search.
- If the user asks for "latest/current/news/price/today", web search is allowed
  even when docs exist — unless doc-only was requested.
- If neither docs nor web can support a reliable answer, ask a clarifying
  question.

Token/cost controls (mandatory):
- Enforce configurable hard limits such as `MAX_CHUNKS_PER_QUERY` and `MAX_CONTEXT_TOKENS`.
- When exceeded, truncate/summarize deterministically and log a cost-limit event with correlation id.
- Never exceed limits silently.

### IV. User Experience Consistency

- **Loading states**: MUST show loading indicators for all async operations
  (chat responses, document uploads, retrieval, web search).
- **Streaming**: Chat responses MUST stream when supported by the
  model/provider. The UI MUST remain responsive during streaming.
- **Errors**: MUST display user-friendly messages. Raw stack traces MUST
  never be shown. Provide a short error id for support/debugging.
- **Accessibility**: All interactive elements MUST be keyboard navigable and
  MUST use semantic HTML.
- **Mobile first**: Design for mobile screens first, then scale up.

### V. Performance & Reliability

- **DB query discipline**: Use Prisma `select`/`include` intentionally. Avoid
  N+1 patterns. Add indexes for high-frequency filters.
- **Retrieval limits**: Default top-k retrieval MUST be ≤ 10 unless a spec
  justifies a higher value.
- **Caching**: Embeddings MUST be cached; identical normalised content MUST
  NOT be re-embedded. Prefer content-hash-based deduplication.
- **SLOs (targets)**:
  - Non-streaming server requests: p95 < 5 s in production.
  - Retrieval: p95 < 500 ms where feasible; measure and tune with indexes
    and limits.
- **Telemetry**: Key events MUST be logged with a correlation id (upload
  started/finished, ingestion finished, retrieval performed, web search
  invoked, model request started/finished). Raw document contents MUST NOT
  be stored in logs.

## Security & Privacy

- **Auth required**: Any route that reads or writes user data MUST enforce
  authentication via `requireAuth(request)`.
- **Tenant isolation**: All document, chunk, and message queries MUST be
  scoped to the authenticated user. (Known gap: `Conversation` and `Message`
  lack `userId` — migration required before next release.)
- **Upload safety**: File type and size MUST be validated server-side.
  Filenames MUST be sanitised. Unsupported types MUST be rejected.
- **Rate limiting / abuse control**: Expensive endpoints (upload, ingestion,
  retrieval, model calls) MUST apply per-user and per-IP limits and return typed errors.
- **Logging**: MUST NOT log secrets, access tokens, raw document contents, or
  full prompts. Redact where needed.
- **User data lifecycle**: Deleting a document MUST also delete or mark
  unreachable its associated chunks/embeddings and remove them from retrieval
  results.
- **No prompt/tool disclosure**: MUST NOT expose system prompts, tool
  instructions, internal chain-of-thought, or raw tool outputs to end users.
- **No sensitive exfiltration**: MUST NOT send document text, PII, or secrets
  to web search queries or third-party tools unless the spec requires it and
  the user has explicitly consented.

## Change Protocol & Definition of Done

### Change Protocol (Agent & Human)

- Make the smallest change that satisfies the spec. Avoid unrelated refactors.
- If behaviour changes, update: (1) specs/docs, (2) tests, (3) UI copy if
  relevant.
- All new endpoints MUST include: validation, auth checks, typed errors, and
  tests.
- DB changes MUST include: a migration, a backfill plan if needed, and rollback
  notes.

### Definition of Done (Pre-merge Checklist)

- [ ] Auth and tenant scoping enforced for any user data read/write
- [ ] Chat streaming works and UI remains responsive
- [ ] Doc-grounded answers include citations and do not invent evidence
- [ ] Web search usage (if any) follows policy and includes citations
- [ ] Errors are user-safe and logged with correlation id (no secrets)
- [ ] Unit tests deterministic; integration tests opt-in and gated
- [ ] DB changes include migration + rollback notes/backfill plan if needed

## Governance

**Authority**: This constitution supersedes all other documented engineering
practices. Any conflict is resolved in favour of this document.

**Amendment procedure**:
1. Propose the amendment in a pull request, updating this file.
2. State the motivation and list affected artifacts (templates, specs, tests).
3. Increment the version number per the versioning policy below.
4. Propagate changes to all dependent templates and command files.
5. Merge only after at least one reviewer approves.

**Versioning policy**:
- **MAJOR** — backward-incompatible governance change: principle removal,
  redefinition that breaks existing specs/tests.
- **MINOR** — new principle or section added; material expansion of guidance.
- **PATCH** — clarifications, wording fixes, typo corrections, non-semantic
  refinements.

**Compliance review**: All PRs and code-review sessions MUST verify compliance
with the active version of this constitution. Complexity MUST be justified
against the principles above; undocumented complexity is a constitution
violation. Use `CLAUDE.md` for day-to-day runtime development guidance.

**Version**: 1.0.0 | **Ratified**: 2026-02-07 | **Last Amended**: 2026-02-22
