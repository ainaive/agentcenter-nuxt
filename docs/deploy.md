# Deployment

AgentCenter (Nuxt) ships as a standalone Node server, with Postgres + an object store + Inngest behind it. Three deploy targets are supported:

- **Node** (default) — `nitro: { preset: "node-server" }`. Runs anywhere Node 22+ runs: bare metal, container, PaaS.
- **Vercel** (auto-detected) — Nitro picks `preset: "vercel"` when `process.env.VERCEL` is set. The `vercel-build` script in `package.json` chains `drizzle-kit migrate && bun scripts/seed-mcp-landscape.ts && nuxt build`, so every deploy: (1) applies pending migrations against `DATABASE_URL`, then (2) upserts the static MCP panorama landscape (taxonomy + tool rows + marketplace stubs) idempotently, then (3) builds. Aborts the deploy if either step fails (prevents code shipping against a stale or empty schema). The destructive `db:seed` script (demo users + sample extensions) is **not** in the build path — that stays a one-shot manual operation.
- **Cloudflare** (stretch) — `nitro: { preset: "cloudflare_module" }`. Workers + R2 binding. Not maintained alongside primary; expect bundle-size + driver tweaks.

This guide covers the Node path. Vercel needs only the `DATABASE_URL` env var set in the project (Build & Runtime). The Cloudflare path is a config flip plus a storage driver swap.

## Prerequisites

| Service | Purpose | Required |
|---|---|---|
| **PostgreSQL 15+** | Application database | yes |
| **Object storage** — Supabase Storage **or** Cloudflare R2 | Extension bundles | yes |
| **Inngest** account (cloud) or local dev server | Background jobs (scan, index) | yes (cloud for prod) |
| **Node 22+** | Runtime | yes |
| **Bun 1.3.12** | Build (production runs Node, not Bun) | yes during build |

## 1. Provision the database

Any Postgres works — Supabase, Neon, AWS RDS, self-hosted. Apply migrations:

```bash
bun install
DATABASE_URL="postgresql://..." bun run db:migrate
DATABASE_URL="postgresql://..." bun run db:apply-fts
DATABASE_URL="postgresql://..." bun run db:seed   # optional: 16 sample extensions
```

The `db:apply-fts` step requires `psql` on PATH. It runs `drizzle/0002_fts_search_vector.sql` against your DB (FTS column + trgm indexes).

## 2. Provision object storage

### Supabase Storage (default)

1. Supabase dashboard → Storage → New bucket (e.g. `agentcenter-bundles`)
2. Generate a service-role key (Settings → API → service_role secret)
3. Set env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET`

### Cloudflare R2 (alternative)

1. Cloudflare dashboard → R2 → Create bucket
2. Create an API token with Object Read & Write on the bucket
3. Set env: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`
4. Apply CORS so browsers can `PUT` direct to R2 (the upload-sign endpoint hands out presigned URLs; the browser uploads without proxying through the app)

`R2_ACCOUNT_ID` being set picks R2 over Supabase automatically. See `server/utils/storage.ts`.

## 3. Inngest

1. Create an Inngest app (cloud) and copy `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY`
2. After deploying, register the webhook URL in the Inngest dashboard:
   ```text
   https://yourdomain.com/api/inngest
   ```
3. Inngest will verify by calling the endpoint; `scan-bundle` and `reindex-search` will appear as registered functions

For local dev, run the Inngest dev server instead:
```bash
bunx inngest-cli@1.19.2 dev
```
It auto-discovers `/api/inngest` and routes events locally. No event/signing keys needed locally.

## 4. Build & run

```bash
bun install --frozen-lockfile
bun run build
PORT=3000 node .output/server/index.mjs
```

Front the Node process with a reverse proxy (nginx, Caddy) for TLS, gzip, and HTTP/2.

### Required env vars at runtime

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `BETTER_AUTH_URL` | Public origin (e.g. `https://agentcenter.example.com`) |
| `BETTER_AUTH_SECRET` | Random 32+ char string (`openssl rand -base64 32`) |
| `NUXT_PUBLIC_APP_URL` | Public origin (same as `BETTER_AUTH_URL`) |
| `NODE_ENV=production` | Enables prod cookies, prod Inngest routing, etc. |
| `INNGEST_EVENT_KEY` | Inngest cloud event key |
| `INNGEST_SIGNING_KEY` | Inngest cloud webhook verification key |
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_BUCKET` | Storage (if using Supabase) |
| `R2_ACCOUNT_ID` + `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` + `R2_BUCKET` | Storage (if using R2) |

See `.env.example` for the canonical list.

## 5. Health checks

After the server is running:

- `curl https://yourdomain.com/api/v1/extensions` → 200 with `{ items, total, page, pageSize }`
- `curl -I https://yourdomain.com/` → 302 to `/en`
- `curl https://yourdomain.com/en/extensions` → 200 with the browse page HTML
- Sign-up via the UI → land on `/en/onboard` → pick a department → land on `/en/`
- Publish a test bundle (zip with valid `manifest.toml`) via `/en/publish/new` → scope=personal → Inngest scans → row appears on `/en/extensions`
- Build the CLI binary from `../agentcenter/cli/`, point at production URL, run `agentcenter login` end-to-end through the device-code flow

## 6. Upgrades

Migrations are idempotent (Drizzle journal-based). For zero-downtime upgrades:

1. Apply new migrations against the live DB before swapping app binaries
2. Run the FTS migration once (only re-run if `drizzle/0002_fts_search_vector.sql` was changed)
3. Hot-swap the Node process behind the reverse proxy (PM2, systemd, blue/green)

## 7. Cloudflare deploy (stretch)

```ts
// nuxt.config.ts
nitro: { preset: "cloudflare_module" }
```

Plus:
- Swap `drizzle-orm/postgres-js` (TCP) for `@neondatabase/serverless` (HTTP) or Hyperdrive — Workers can't open raw TCP
- Use the R2 binding (`event.context.cloudflare.env.BUCKET`) instead of the S3 SDK; cuts bundle size significantly
- `wrangler secret put` for each runtime env var

Both swaps are localized to `server/utils/db.ts` and `server/utils/storage.ts`. Everything else is preset-agnostic.

This path is documented but not maintained alongside the Node path. If you need it, expect a half-day of bundle-size triage on first deploy.
