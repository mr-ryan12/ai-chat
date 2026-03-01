# Testing

- Tests must be deterministic by default — do not assume network availability in CI
- Unit tests must mock all external services (OpenAI, SerpAPI, storage)
- Integration tests may call real services only when `RUN_INTEGRATION_TESTS=1` is set
- Integration tests must skip gracefully with a clear message when required env vars are missing
- Integration tests must be rate-limited
- Tests must use isolated DB state (transaction/rollback or reset) and clean up reliably
- Critical paths requiring coverage: auth, document upload/ingestion, retrieval, chat streaming, tool-call routing
