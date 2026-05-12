# AgentCenter (Nuxt)

A bilingual (EN/ZH) marketplace for AI agent extensions — Skills, MCP servers, slash commands, and plugins. Nuxt 4 rewrite of the original Next.js implementation; same `/api/v1` contract so the existing CLI binary keeps working.

## What's in here

- **Web app** — browse, filter, search, and view extension detail pages; sign up and publish your own extensions; bilingual UI with always-prefixed locales (`/en/...`, `/zh/...`)
- **Public registry API** — the `/api/v1/...` surface the CLI talks to
- **Background workers** — Inngest jobs scan uploaded bundles and auto-publish personal-scope extensions

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Nuxt 4 (Nitro, Vue 3, Vite) |
| Language | TypeScript strict (with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`) |
| Styling | Tailwind v4 |
| Runtime | Node 22+ (production); Bun 1.3.12 (build + scripts) |
| Database | PostgreSQL via Drizzle ORM (`drizzle-orm/postgres-js`) |
| Auth | Better Auth (cookie sessions; CLI device-code flow on the same `sessions` table) |
| Storage | Supabase Storage (default) or Cloudflare R2 |
| Background jobs | Inngest |
| i18n | `@nuxtjs/i18n` with `strategy: "prefix"`, locales `en` (default) + `zh` |
| Search | Postgres FTS + `pg_trgm` |
| Tests | Vitest (unit + component via `@nuxt/test-utils`) + Playwright (E2E) |

## Quickstart

```bash
# 1. Install dependencies
bun install

# 2. Provision a Postgres + copy the URL
cp .env.example .env   # then fill in DATABASE_URL etc.

# 3. Migrations + sample data
bun run db:migrate
bun run db:apply-fts
bun run db:seed

# 4. Dev server
bun run dev
```

Open <http://localhost:3000>. The minimum env vars needed for local browsing are `DATABASE_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`. Add storage + Inngest for the publish flow. See [`docs/deploy.md`](./docs/deploy.md).

## Scripts

| Command | What it does |
|---|---|
| `bun run dev` | Dev server (Nitro + Vite) |
| `bun run build` | Production build → `.output/` |
| `bun run preview` | Run the production build locally |
| `bun run prepare` | Husky + `nuxt prepare` (type generation) |
| `bun run lint` | `@nuxt/eslint` |
| `bun run typecheck` | `nuxi typecheck` (vue-tsc) |
| `bun run test` | Vitest unit + component tests |
| `bun run test:coverage` | Vitest with v8 coverage |
| `bun run test:e2e` | Playwright E2E (needs dev server + seeded DB) |
| `bun run validate` | `prepare → lint → typecheck → test` — mirrors CI |
| `bun run db:migrate` | Apply Drizzle migrations |
| `bun run db:apply-fts` | Apply the FTS migration (requires `psql`) |
| `bun run db:seed` | Seed sample extensions, tags, departments |
| `bun run db:studio` | Drizzle Studio |

## Documentation

- [`docs/plan.md`](./docs/plan.md) — full implementation plan
- [`docs/deploy.md`](./docs/deploy.md) — deployment runbook
- [`docs/api.md`](./docs/api.md) — public `/api/v1/...` contract
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — workflow, commits, PRs
- [`CLAUDE.md`](./CLAUDE.md) — project rules and locked decisions

## Workflow

All changes go through a feature branch and a pull request. `bun run validate` mirrors what CI runs on every PR (lint, typecheck, tests). See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for details.
