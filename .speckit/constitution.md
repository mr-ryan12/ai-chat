# Project Constitution

## Code Quality

- **Type Safety**: Use TypeScript strict mode. All functions must have explicit return types.
- **Error Handling**: Never throw unhandled errors. Use try-catch blocks and return error states to the UI.
- **Code Reuse**: Extract repeated logic into utility functions. No duplicate code blocks.
- **Naming**: Use descriptive names. Functions are verbs (`fetchMessages`, `createEmbedding`), variables are nouns.
- **File Size**: Keep files under 300 lines. Split large components into smaller, focused modules.

## Testing Standards

- **Critical Paths**: Test all database operations, API integrations (OpenAI, SerpAPI), and vector search logic.
- **Edge Cases**: Test empty states, null values, API failures, and network timeouts.
- **No Mocking External APIs**: Use actual test API keys or skip tests in CI if unavailable.
- **Test Data**: Clean up test database records after each test run.

## User Experience Consistency

- **Loading States**: Show loading indicators for all async operations (chat responses, document uploads, searches).
- **Error Messages**: Display user-friendly error messages. Never show raw error stack traces.
- **Response Time**: Chat responses must stream. No blocking waits for full completion.
- **Accessibility**: All interactive elements must be keyboard navigable. Use semantic HTML.
- **Mobile First**: Design for mobile screens first, then scale up to desktop.

## Performance Requirements

- **Database Queries**: Use Prisma's `select` to fetch only needed fields. Avoid N+1 queries.
- **Vector Search**: Limit similarity search results to top 10 matches. Index embeddings for sub-100ms queries.
- **Bundle Size**: Keep client JavaScript under 200KB gzipped. Code-split routes.
- **API Response Time**: Server responses must complete within 5 seconds (excluding streaming).
- **Caching**: Cache OpenAI embeddings. Never re-embed identical content.
