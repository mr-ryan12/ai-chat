---
paths:
  - "app/routes/**"
---

# API Route Rules

- Every loader and action must call `requireAuth(request)` at the top
- All loaders/actions must catch errors and return typed, structured responses — no unhandled promise rejections
- Use the error taxonomy: `ValidationError`, `AuthError`, `NotFoundError`, `ExternalServiceError`
- Every error must preserve a `cause` and carry a correlation id
- Never expose raw stack traces, system prompts, tool instructions, or internal chain-of-thought to end users — return a short error id for support
- All new endpoints must include: input validation, auth check, typed errors, and tests
- Expensive endpoints (upload, ingestion, retrieval, model calls) must apply per-user and per-IP rate limits
- File uploads: validate type and size server-side; sanitize filenames; reject unsupported types
