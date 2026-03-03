# Implementation Plan: Link Conversations to Users

**Branch**: `001-link-user-conversations` | **Date**: 2026-03-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-link-user-conversations/spec.md`

## Summary

Add a `userId` foreign key to the `Conversation` model, scope all conversation queries to the authenticated user, and pass `userId` through the call chain from route handlers down to service helpers. A migration purges pre-existing ownerless conversations and adds the non-null column with a cascade-delete foreign key constraint.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, `noEmit`, `isolatedModules`)
**Primary Dependencies**: Remix v2 + Vite, Prisma 5.x, PostgreSQL + pgvector, pino
**Storage**: PostgreSQL via Prisma — schema change required (migration)
**Testing**: No test runner currently configured; unit tests to be added for service helpers; integration tests gated behind `RUN_INTEGRATION_TESTS=1`
**Target Platform**: Node.js (Remix SSR on server)
**Project Type**: Web application (Remix monolith — no frontend/backend split)
**Performance Goals**: Non-streaming server requests p95 < 5 s; retrieval p95 < 500 ms
**Constraints**: `requireAuth(request)` on every protected route; all DB queries scoped by `userId`; migration must include rollback notes
**Scale/Scope**: Single-deployment dev/learning app; small user count; no production data at risk

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| TypeScript strict mode | ✅ PASS | Existing; no changes to compiler config |
| Explicit return types on non-trivial functions | ✅ PASS | Service helpers will carry explicit return types |
| Route boundaries catch and return typed errors | ✅ PASS | Existing pattern; service helpers already throw typed errors |
| DB queries scoped by `userId` | ⚠️ RESOLVES VIOLATION | This feature adds `userId` scoping — closes the known constitution gap |
| Tenant scoping in shared access layer | ✅ PASS | `userId` passed into service helpers, not hand-rolled per route |
| DB changes require migration + rollback + backfill plan | ✅ PASS | Migration: purge orphaned rows, add column + FK. Rollback: drop column. No backfill needed (dev app, purge strategy) |
| Auth required on all user-data routes | ✅ PASS | `requireAuth` already in place; this feature captures and uses the returned `userId` |
| No unhandled promise rejections | ✅ PASS | All new async code wrapped in try/catch per existing pattern |
| No secrets/PII in logs | ✅ PASS | No sensitive data introduced |

**Post-Phase-1 re-check**: All gates pass. No constitution violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/001-link-user-conversations/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/           ← Phase 1 output
│   └── routes.md
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code (files touched by this feature)

```text
prisma/
├── schema.prisma                                    # add userId to Conversation; add User→Conversation relation
└── migrations/
    └── [timestamp]_add_user_id_to_conversation/
        └── migration.sql                            # purge orphaned rows; add column + FK; rollback notes

app/
├── routes/
│   ├── conversation.$id.tsx                         # capture userId from requireAuth; pass to service calls
│   ├── api.conversation.$id.delete.tsx              # capture userId; pass to deleteConversation
│   └── api.conversation.$id.messages.tsx            # capture userId; pass to getConversation for ownership check
├── utils/
│   └── chat.ts                                      # accept userId param; pass to createNewConversation + getConversation
└── server/
    └── utils/
        └── apiCalls/
            ├── getConversation.ts                   # accept userId; scope findUnique by { id, userId }
            ├── getConversations.ts                  # accept userId; add where: { userId } to findMany
            ├── deleteConversation.ts                # accept userId; verify ownership in where clause
            └── createNewConversation.ts             # accept userId; pass to prisma.conversation.create
```

**Structure Decision**: Remix monolith — no frontend/backend split. All server logic in `app/server/utils/`, all routes in `app/routes/`. Service helpers are the shared access layer for tenant scoping.
