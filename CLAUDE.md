# AgentCenter (Nuxt)

Marketplace for AI agent extensions (Skills, MCP servers, slash commands, plugins) with internal-enterprise features (departments, scope, tags, collections) and a companion CLI for actual machine-side install. Bilingual (EN/ZH) from day one.

This is a rewrite of the original Next.js implementation in Nuxt 4. The product surface and the public `/api/v1` contract are preserved verbatim so the existing CLI keeps working.

See `docs/plan.md` for the full implementation plan, milestone schedule, validate pipeline, coverage thresholds, layer boundaries, and detailed commit/PR rules.

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
2. **Themes**: Editorial Ivory (default) + Dark + Mono Clean. Selectable via the TopBar theme picker; persisted in a `theme` cookie.
3. **Filter UI**: single-row quiet pill rail (revised 2026-05-21, replacing the earlier "Mode B (drawer-style multi-row) only" decision). Scope pills + Dept/Creator/Publisher pickers + Tag-drawer trigger live inline on one row of compact bordered pills with no `border-b` divider below. The Tag drawer's expanded panel still wraps to a new row when opened — drawer behavior is retained for tag *selection* only, not for the rail as a whole.
4. **Sign-up**: open. SSO/invite-only later if needed.
5. **Locale URLs**: always prefixed; no implicit default.
6. **Detail page README**: raw markdown stored, server-rendered with markdown-it + DOMPurify. Manifest metadata (homepage, repo, license, compatibility, screenshots) rendered as a side panel.
7. **Install button**: triggers real install via the Agent CLI. Web records install events; the CLI does the work.
8. **Agent CLI**: agent-agnostic with Claude-first defaults. Extensions declare destination paths per agent in their manifest; user can override via `agentcenter config set`. Default target: `~/.claude/...`. Distributed via npm.
9. **Department IDs**: dotted-path text PKs (e.g. `eng.cloud.infra`). Descendant filter is a single `LIKE 'parent.%'` predicate, not a recursive CTE.
10. **Dynamic content i18n**: column-per-language (`name` + `nameZh`, `description` + `descriptionZh`). `tags` table carries `labelEn` + `labelZh`.
11. **Accent usage**: `--color-accent` is reserved for primary CTAs, focus rings, the home featured hero, and the active extension-detail install action. Secondary active states (sidebar nav, filter trigger pills, non-primary picker chips) use neutral ink + left-rule or bold weight, not tinted fills. The home should carry at most two accent moments per viewport; the goal is "one intentional accent moment" wherever practical. Auth pages, error states, and UI primitive focus rings are exempt.
12. **Official-tier approval workflow**: extensions default to Unofficial; elevation to Product-Line Official or Company Official goes through an admin matrix indexed by 5 coords — `(extensionCategory × tier × productLineId? × categoryLevel × categoryKey)`. `extensionCategory` reuses the existing `extension_category` enum so the matrix is tabbed per ext-type; `categoryLevel` is `all | macro | micro` (wildcard / FUNC_TAXONOMY l1 / l2); `productLineId` participates only for the `productLine` tier. Tiers are independent (no PL→Company ladder), `officialTier` lives in its own enum column, and the `/api/v1` `badge` field is read-derived from it to preserve the frozen CLI contract. Matrix edits use a 2-D cover relation: super-admins everywhere; any user whose admin row covers the target cell on both the column-tier axis (`(company, null) ⊇ (productLine, X)`) and the category axis (`all ⊇ macro ⊇ micro`) within the same extensionCategory. Routing is fan-out on the category dim and EXACT on column-tier (company admins do NOT receive product-line requests for review). Revocation is a super-admin action from the detail page; revocation metadata (timestamp / admin / required note) lives on `extensions` and clears on the next approval. Full rationale and trade-offs in `docs/adr/0001-official-tier-approval-workflow.md` (including the 2026-06-08, 2026-06-09, and 2026-06-09b updates).

Nuxt-specific technical decisions (deployment target, auth choice, DB driver, storage default, public API contract, validate pipeline, coverage thresholds, layer boundaries) live in `docs/plan.md` so they only have to be maintained in one place.

## Workflow

- **Commit per coherent unit** — usually one or several commits per phase, split where natural (schema vs. consumers, refactor vs. feature, deps vs. first use). Conventional Commits with phase scope: `feat(p2-db): add extension drizzle schema`. See `docs/plan.md` §13 for granularity calibration and the per-commit vs. per-PR validate split.
- **Pause at each phase boundary** for an explicit human checkpoint before starting the next phase. Never run `git push` without an explicit request.
- **No `--amend` once pushed, no force-push, no `--no-verify`.** Corrective commits over history rewrites.
- **Breaking changes to `/api/v1`** require `!` after the scope and a `BREAKING CHANGE:` footer.
- Always work on a feature branch and open a PR — never commit to `main` directly.
- When a binding decision changes, update `docs/plan.md` in the same commit as the code change.
- **No agent-attribution noise in commits or PRs.** Do not add a `Co-Authored-By:` trailer (e.g. `Co-Authored-By: Claude …`) to commit messages, and do not append the "🤖 Generated with Claude Code" footer to PR descriptions. The branch already records authorship and the content speaks for itself.
- **Dev sign-in.** `bun run db:seed` plants six demo users on `*@agentcenter.dev` (`amy` = super-admin, the rest publishers / reviewers — see `scripts/seed.ts:CREATORS`). The shared password comes from the `SEED_PASSWORD` env var; the seed fails fast if it isn't set so a misconfigured environment can't hand out a predictable default. Run as `SEED_PASSWORD=anything-you-like bun run db:seed`. Rotate by re-running with a new env value; the deterministic credential row id makes it idempotent.

## Project structure

See `docs/plan.md` §1 for the full tree.

- `app/pages/...` — file-based routes (locale-prefixed via `@nuxtjs/i18n`)
- `app/components/{ui,layout,extension,filters,publish,profile}` — Vue components
- `app/composables/`, `app/middleware/` — client state + route guards
- `server/api/v1/...` — public registry API consumed by the CLI (frozen contract)
- `server/api/internal/...` — form-backing endpoints (Nuxt's analogue of Next.js server actions)
- `server/api/{auth,upload,inngest}/...` — Better Auth, upload signing, Inngest webhook
- `server/utils/` — server-side singletons and queries
- `shared/{db/schema,validators,search,tags,taxonomy,data,types}` — code reachable from both `app/` and `server/`
- `cli/` — separate Bun-built binary
- `drizzle/` — generated migrations
- `docs/` — plan, ADRs, manifest spec
