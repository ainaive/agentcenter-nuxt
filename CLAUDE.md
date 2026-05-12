# AgentCenter (Nuxt)

Marketplace for AI agent extensions (Skills, MCP servers, slash commands, plugins) with internal-enterprise features (departments, scope, tags, collections) and a companion CLI for actual machine-side install. Bilingual (EN/ZH) from day one.

This is a rewrite of the original Next.js implementation (`../agentcenter/`) in Nuxt 4. The product surface and the public `/api/v1` contract are preserved verbatim so the existing CLI keeps working.

See `docs/plan.md` for the full implementation plan and milestone schedule.

## Tech stack

- TypeScript, Nuxt 4 (Nitro server, Vue 3, Vite), Tailwind CSS v4, shadcn-vue + Reka UI
- Bun for local dev, scripts, and CLI build; Node runtime in production
- PostgreSQL (Supabase by default; any Postgres via `DATABASE_URL`) with Drizzle ORM (`drizzle-orm/postgres-js`)
- Better Auth (cookie sessions, Drizzle adapter); CLI uses device-code flow on the same `sessions` table
- Supabase Storage for bundle storage (default); R2 via S3 SDK supported as alternative
- Inngest for background jobs (scan, index, publish)
- `@nuxtjs/i18n` with `strategy: 'prefix'`; locales `en` (default) + `zh`, always-prefixed URLs
- Fonts via `@nuxt/fonts`: Inter (UI), Fraunces (display, italic), JetBrains Mono (tags/counts)
- Postgres FTS + `pg_trgm` for search; Meilisearch deferred
- vee-validate + Zod for forms
- markdown-it + DOMPurify for README rendering (server-side)
- Pinia (`@pinia/nuxt`) only where cross-component client state is needed

## Locked product decisions

These mirror the original v1 product decisions. Same numbering; do not revisit inside a normal PR. If a PR needs to change one, update this section and `docs/plan.md` in the same commit as the code change.

1. **Multi-tenant schema, single-tenant UI** for v1.
2. **Themes**: Editorial Ivory (default) + Dark. Mono Clean dropped.
3. **Filter UI**: Mode B (drawer-style multi-row) only.
4. **Sign-up**: open. SSO/invite-only later if needed.
5. **Locale URLs**: always prefixed; no implicit default.
6. **Detail page README**: raw markdown stored, server-rendered with markdown-it + DOMPurify. Manifest metadata (homepage, repo, license, compatibility, screenshots) rendered as a side panel.
7. **Install button**: triggers real install via the Agent CLI. Web records install events; the CLI does the work.
8. **Agent CLI**: agent-agnostic with Claude-first defaults. Extensions declare destination paths per agent in their manifest; user can override via `agentcenter config set`. Default target: `~/.claude/...`. Distributed via npm. **Unchanged from the Next.js version**; only the base URL flips.
9. **Department IDs**: dotted-path text PKs (e.g. `eng.cloud.infra`). Descendant filter is a single `LIKE 'parent.%'` predicate, not a recursive CTE.
10. **Dynamic content i18n**: column-per-language (`name` + `nameZh`, `description` + `descriptionZh`). `tags` table carries `labelEn` + `labelZh`.

### Locked technical decisions

These are Nuxt-specific decisions that drove the layout in `docs/plan.md`. Same update rule as above.

- **Deployment target**: local / self-hosted Node (Nitro `node-server` preset) is the primary target. Cloudflare is a stretch goal documented but not maintained alongside primary.
- **Auth**: Better Auth (cookie sessions). Supabase Auth was considered and declined to keep the device-code flow and existing session model.
- **Database driver**: `drizzle-orm/postgres-js` over a standard `DATABASE_URL`. No edge / HTTP drivers in v1.
- **Storage**: Supabase Storage by default; R2 via S3 SDK is a config-level swap, not a code-level rewrite. `server/api/upload/sign.post.ts` and `server/api/v1/extensions/[slug]/bundle.get.ts` are the only two endpoints affected.
- **Background jobs**: Inngest. Same SDK, same `scan-bundle` / `reindex-search` shape as the original.
- **Public API contract**: `/api/v1/...` JSON shapes are frozen. Anything that breaks the CLI is a breaking change and goes through a `v2` namespace.
- **Server actions → endpoints**: server actions don't exist in Nuxt. User-initiated mutations from pages go through `server/api/internal/...` endpoints called with `$fetch`. The validators (Zod) port verbatim.
- **Validate pipeline**: `bun run validate` chains `prepare → lint → typecheck → test` (`nuxi prepare`, `@nuxt/eslint`, `nuxi typecheck` / `vue-tsc`, `vitest run`). CI runs the same script on every PR. Playwright is a separate, slower gate — local on demand + nightly CI, not per-PR. See `docs/plan.md` §11.
- **No DB mocking in unit tests.** Push DB-touching code into pure functions under `shared/` and unit-test those; let Playwright cover the integration. Reason: mocked-DB tests are a known failure mode where the mock and prod diverge silently. Same rule as the original project.
- **Coverage thresholds (CI-enforced)**: `shared/**` ≥ 95% lines / 90% branches; `app/composables/**` ≥ 90%; `server/utils/**` ≥ 80%; `server/api/**` ≥ 70%; `app/components/**` ≥ 60% overall (≥ 80% for interactive components). `app/pages/**`, `app/layouts/**`, `app/app.vue` excluded — Playwright covers. PRs cannot reduce coverage of a touched file by more than 3 points. See `docs/plan.md` §12.
- **TypeScript strict, plus extras**: `noUncheckedIndexedAccess: true` and `exactOptionalPropertyTypes: true` and `noImplicitOverride: true` on top of `strict: true`. Together they catch the "undefined slipping through" class of bugs at compile time.
- **Layer boundaries (ESLint-enforced)**: `app/` does not import from `server/` (use `$fetch` over the wire). `server/` does not import from `app/`. `shared/` imports from neither. Configured via `no-restricted-imports` in `eslint.config.mjs`.
- **No barrel files** (`index.ts` re-exports) except `shared/db/schema/index.ts` for Drizzle. Direct imports from source.
- **`shared/**` code without unit tests is not landable.** Hard reviewer rule.

## Workflow

- **Commit on each step.** A phase is many commits; one per checklist item or TodoWrite checkbox. Tests usually ship in the same commit as the code they cover. Always-split boundaries: schema vs. consumers, refactor vs. feature, generated code vs. source, dep install vs. first use. Conventional Commits with phase scope: `feat(p2-db): add extension drizzle schema`.
- **Per-commit gate**: every commit compiles and `bun run typecheck` passes. **Per-PR gate**: PR head passes full `bun run validate` (lint + typecheck + test + coverage). Coverage is a PR-boundary property, not a per-commit one — see `docs/plan.md` §13.
- **Before each commit**, surface a diff summary and proposed commit message. Wait for explicit go-ahead before running `git commit`. Never run `git push` without an explicit request.
- **At the end of each phase**, pause for an explicit human checkpoint before starting the next phase.
- **No `--amend`** once a commit is on a pushed branch. **No force-push**. **No `--no-verify`** — if a hook fails, fix the underlying issue. Corrective commits over history rewrites.
- **Breaking changes to `/api/v1`** require `!` after the scope and a `BREAKING CHANGE:` footer. CI's contract test fails without them. The CLI is the only external consumer that can break; nothing else needs the marker.
- **No co-author trailers.** Plain commit messages, human author of record.
- **Merge strategy**: PRs land as merge commits, not squashed and not rebased. Per-step history is preserved on `main`. (`Allow squash` and `Allow rebase` are disabled on the GitHub repo.)
- **PR rules**: PR title = Conventional Commit summary. Reviewer-requested changes go in as new commits, not force-push.
- Always work on a feature branch and open a PR — never commit to `main` directly. CI runs `bun run validate` on every PR push; commitlint validates the commit range as a backstop.
- When a binding decision changes, update `docs/plan.md` in the same commit as the code change.
- Hooks (installed in P0): `commit-msg` runs commitlint; `pre-commit` runs `lint-staged`; `pre-push` runs `bun run validate`. See `docs/plan.md` §13.

## Project structure (target)

See `docs/plan.md` §1 for the full tree. High-level layout:

- `app/pages/[locale]/...` — file-based routes, locale-segmented
- `app/components/{ui,layout,extension,filters,publish}` — Vue components
- `app/composables/` — `useFilters`, `useAuth`, `useTheme`, `useTagLabel`
- `app/middleware/` — `auth`, `onboard`
- `server/api/v1/...` — public registry API consumed by the CLI (frozen contract)
- `server/api/internal/...` — form-backing endpoints (replaces Next.js server actions)
- `server/api/{auth,upload,inngest}/...` — Better Auth handler, R2/Supabase upload signing, Inngest webhook
- `server/utils/{db,auth,storage,inngest}.ts` — server-side singletons
- `shared/{db/schema,validators,search,taxonomy,tags,types}` — code reachable from both `app/` and `server/`
- `cli/` — separate Bun-built binary (carried over from the original repo unchanged)
- `drizzle/` — generated migrations
- `docs/` — plan, ADRs, manifest spec
