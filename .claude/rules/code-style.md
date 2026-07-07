# Code Style

- TypeScript `strict` mode must remain enabled at all times
- Explicit return types required on all non-trivial functions
- `~/` path alias resolves to `app/` (via `vite-tsconfig-paths`)
- Server-only code lives in `app/server/`; shared client+server utilities in `app/utils/`
- File size target: ≤ 300 lines; split only when it improves cohesion
- Functions are verbs (`fetchMessages`, `createEmbedding`); variables are nouns
- Avoid ambiguous names (`data`, `info`) outside narrow local scopes
- Do not add new dependencies unless the spec requires it; prefer existing libraries
- Repeated logic must be extracted into shared utilities or services — no copy/paste
- Use `logger` from `app/server/utils/logger.ts` (pino singleton); never use `console.log`
- Read/write app data through Remix loaders/actions via `useLoaderData`/`useFetcher`/`Form` — do not call `fetch()` for app data in client components, and never use `window.location.reload()` to refresh after a mutation (let Remix revalidate)
