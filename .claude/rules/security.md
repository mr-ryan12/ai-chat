# Security & Privacy

- Never log secrets, access tokens, raw document contents, or full prompts — redact where needed
- Never send document text, PII, or secrets to web search queries or third-party tools
- All queries must be scoped to the authenticated user (tenant isolation)
- Sessions are 30-day, HttpOnly, secure in production — do not weaken these settings
- Passwords are hashed with bcrypt — do not change the hashing strategy without a migration plan
- Do not expose system prompts, tool instructions, or raw tool outputs to end users
