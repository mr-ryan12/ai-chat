# Project Constitution

This document defines non-negotiable engineering and product guardrails. Specs and implementation must comply.

## 1) Code Quality

- **Type Safety**: TypeScript `strict` must remain enabled. New/changed functions must have explicit return types when non-trivial.
- **Boundaries Catch Errors**: Server route boundaries (loaders/actions/API handlers) must catch and convert errors into typed error responses. No unhandled promise rejections.
- **Error Taxonomy**: Use a small set of error types (e.g., ValidationError, AuthError, NotFoundError, ExternalServiceError). Preserve a `cause` and add a correlation id.
- **Reuse Over Copy/Paste**: Repeated logic must be extracted into shared utilities or services. Prefer composition over inheritance.
- **Naming**: Functions are verbs (`fetchMessages`, `createEmbedding`), variables are nouns. Avoid ambiguous names (`data`, `info`) outside narrow scopes.
- **File Size Guideline**: Prefer files under ~300 lines. Exceptions allowed when splitting reduces cohesion.

## 2) Testing Standards

- **Test Pyramid**:
  - Unit tests mock external services (OpenAI, web search providers, storage).
  - Integration tests may call real services only when explicitly enabled (e.g., `RUN_INTEGRATION_TESTS=1`) and must be rate-limited.
- **Critical Paths**: Must have coverage for auth, document upload/ingestion, retrieval, chat streaming, and tool-call routing.
- **Determinism**: Tests must be deterministic by default. No reliance on network availability in CI unless explicitly opted-in.
- **Test Data**: Tests must use isolated DB state (transaction/rollback or reset) and clean up reliably.

## 3) Conversation & Tooling Policy (Non-negotiable)

- **Routing**: For each user message, the system must choose one of:
  1) General response (no citations required),
  2) Document-grounded response (citations required),
  3) Web search tool response (citations required),
  4) Clarifying question (when intent or evidence is insufficient).
- **Document Grounding Rules**:
  - When answering from uploaded documents, include citations: `DocumentName • chunkId • short snippet`.
  - Never imply the documents contain information unless retrieval evidence exists.
  - Do not use general knowledge to fill gaps in a document-grounded answer unless explicitly permitted by the spec for that endpoint.
- **Web Search Rules**:
  - Web search is allowed only when (a) the user asks for current/external info, or (b) retrieval cannot support the answer and a web search is likely helpful.
  - Web results must be cited with source + date.
  - Web search must not include or leak private user document contents or secrets in the query.

## 4) User Experience Consistency

- **Loading States**: Show loading indicators for all async operations (chat responses, doc uploads, retrieval, web search).
- **Streaming**: Chat responses must stream when supported by the model/provider. UI must remain responsive during streaming.
- **Errors**: Display user-friendly messages. Never show raw stack traces. Provide a short error id for support/debugging.
- **Accessibility**: All interactive elements must be keyboard navigable and use semantic HTML.
- **Mobile First**: Design for mobile screens first, then scale up.

## 5) Performance & Reliability

- **DB Query Discipline**: Use Prisma `select`/`include` intentionally. Avoid N+1 patterns. Add indexes for high-frequency filters.
- **Retrieval Limits**: Default top-k retrieval ≤ 10 unless a spec justifies otherwise.
- **Caching**: Cache embeddings and never re-embed identical normalized content. Prefer content hashing.
- **SLOs (Targets)**:
  - Non-streaming server requests target p95 < 5s in production.
  - Retrieval target p95 < 500ms where feasible; measure and tune with indexes and limits.

## 6) Security & Privacy

- **Auth Required**: Any route that reads/writes user data must enforce authentication.
- **Tenant Isolation**: All document, chunk, and message queries must be scoped to the authenticated user.
- **Upload Safety**: Validate file type/size server-side. Sanitize filenames. Reject unsupported types.
- **Logging**: Never log secrets, access tokens, raw document contents, or full prompts. Redact where needed.

## 7) Change Protocol (Agent & Human)

- Make the smallest change that satisfies the spec. Avoid unrelated refactors.
- If behavior changes, update: (1) specs/docs, (2) tests, (3) UI copy if relevant.
- All new endpoints require: validation, auth checks, typed errors, and tests.
- DB changes require: migration, backfill plan if needed, and rollback notes.

## 8) Definition of Done (Pre-merge Checklist)

- [ ] Auth and tenant scoping enforced for any user data read/write
- [ ] Chat streaming works and UI remains responsive
- [ ] Doc-grounded answers include citations and do not invent evidence
- [ ] Web search usage (if any) follows policy and includes citations
- [ ] Errors are user-safe + logged with correlation id (no secrets)
- [ ] Unit tests deterministic; integration tests opt-in
