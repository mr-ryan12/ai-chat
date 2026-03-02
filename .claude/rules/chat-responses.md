---
paths:
  - "app/utils/chat.ts"
  - "app/routes/conversation*"
  - "app/server/services/document*"
---

# Chat Response Policy

For every user message, the system must choose exactly one response mode:
1. **General** — no citations required
2. **Document-grounded** — citations required
3. **Web-search** — citations required
4. **Clarifying question** — when intent or retrieval evidence is insufficient

## Document-grounded responses
- Citations must use the format: `DocumentName • chunkId • short snippet`
- Never imply a document contains information unless retrieval evidence exists
- General knowledge must not fill gaps in a document-grounded answer unless the spec explicitly permits it

## Web search
- Allowed only when: (a) user requests current/external info, or (b) retrieval cannot support the answer
- Web results must be cited with source and date
- Must not include private user document contents or secrets in the search query

## Routing tie-breakers
- If user requests "doc-only" / "use my uploads" → web search is forbidden
- If retrieval returns hits above threshold → prefer document-grounded over web search
- If user asks for "latest/current/news/price/today" → web search is allowed (unless doc-only requested)
- If neither docs nor web can support a reliable answer → ask a clarifying question

## Token/cost controls
- Enforce `MAX_CHUNKS_PER_QUERY` and `MAX_CONTEXT_TOKENS` hard limits
- When exceeded, truncate/summarize deterministically and log a cost-limit event with correlation id
- Never exceed limits silently
