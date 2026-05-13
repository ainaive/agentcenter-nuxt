# Architecture

How AgentCenter (Nuxt) fits together today. For *what we plan to build next*, see [`plan.md`](./plan.md). For deployment, see [`deploy.md`](./deploy.md). For the public CLI contract, see [`api.md`](./api.md).

## Topology

```text
Browser ───▶ Nuxt 4 (Nitro on Node) ───▶ PostgreSQL
                ├── pages (Vue SSR + island hydration)
                ├── /api/auth/...           Better Auth handler
                ├── /api/v1/...             Public registry API (CLI surface)
                ├── /api/internal/...       Form-backing endpoints (web surface)
                ├── /api/upload/sign        Presigned upload URL
                └── /api/inngest            Inngest webhook
                                                  │
Browser ───── direct PUT ─────▶ Supabase / R2 ◀───┘
                                                  │
                                              Inngest ──▶ Postgres + Storage
                                                          (scan-bundle,
                                                           reindex-search)

CLI (Bun binary) ──── /api/v1/... ────▶ Nuxt
        Bearer token via device-code flow on the same `sessions` table
```

The web app and the CLI hit the same Nuxt deployment. Bundles flow directly between the browser/CLI and object storage via signed URLs — Nuxt never proxies binary content.

## Directory layout

```text
app/                              # Vue + composables (browser + SSR render)
├── app.vue                       # entry — useTheme(), useHead, NuxtLayout/Page
├── error.vue                     # global error boundary
├── layouts/default.vue           # skip link + TopBar + Sidebar + main slot
├── pages/                        # @nuxtjs/i18n auto-prefixes /en, /zh
│   ├── index.vue                 # home (featured + trending grid)
│   ├── extensions/
│   │   ├── index.vue             # browse
│   │   └── [slug].vue            # detail
│   ├── sign-in.vue / sign-up.vue / onboard.vue
│   ├── cli/auth.vue              # device-code authorization
│   └── publish/{index,new}.vue
├── components/
│   ├── layout/                   # TopBar, Sidebar, ThemeSwitch, LocaleSwitch, UserButton
│   ├── extension/                # ExtCard, ExtGrid, InstallButton, Markdown
│   └── filters/                  # FilterBar, ScopePills, FilterChips, SortSelect
├── composables/                  # useTheme, useFilters, useAuth
├── middleware/                   # require-auth, require-onboard
└── assets/css/tailwind.css       # @theme tokens + .dark variant
server/                           # Nitro request handlers + server utilities
├── api/
│   ├── v1/                       # FROZEN CONTRACT — see docs/api.md
│   ├── internal/                 # form-backing endpoints called via $fetch
│   ├── auth/[...all].ts          # Better Auth catch-all
│   ├── upload/sign.post.ts
│   └── inngest.ts                # webhook → inngest/node serve()
└── utils/                        # SERVER-ONLY HELPERS
    ├── db.ts                     # postgres-js + drizzle singleton
    ├── auth.ts                   # useAuthServer, getSessionUser, requireUser
    ├── api-auth.ts               # authenticateBearerToken (CLI)
    ├── storage.ts                # Supabase / R2 backend (env-flag)
    ├── inngest.ts                # Inngest client + functions
    ├── extensions-state.ts       # submit / recordScanResult / publishVersion
    ├── publish.ts                # createDraft / attachFile / submitForReview / discard
    ├── installs.ts               # recordInstall
    ├── queries/                  # extensions, extension-detail, collections
    └── jobs/                     # scan-bundle, reindex-search
shared/                           # USED BY BOTH app/ AND server/
├── db/schema/                    # Drizzle schema (auth, org, extension, collection, activity)
├── db/queries-types.ts           # ExtensionListItem (hand-written DTO)
├── validators/                   # filters, manifest (Zod)
├── search/query.ts               # buildExtensionWhere, buildExtensionOrder
├── data/                         # extensions, collections, departments seed data
├── types.ts                      # Locale, Theme, Extension, Department, ...
├── theme.ts                      # cookie name + isValidTheme
├── taxonomy.ts                   # FUNC_TAXONOMY
└── tags.ts                       # TAG_LABELS + tagLabel()
i18n/locales/{en,zh}.json
drizzle/                          # generated migrations
scripts/seed.ts                   # bun-runnable
tests/                            # contract + e2e (Playwright)
cli/                              # standalone Bun-built binary (carries over from original)
```

### Layer boundaries (ESLint-enforced)

```text
shared/   ──▶  (leaf — no framework imports, no app/server/ either)
server/   ──▶  shared/
app/      ──▶  shared/  (no direct server/ — talks to it over $fetch)
cli/      ──▶  (its own world; only sees /api/v1)
```

`no-restricted-imports` rules in `eslint.config.mjs` enforce this. Violations fail CI.

## Request flows

### Browse (anonymous read)

```text
GET /en/extensions?category=skills&sort=stars
  └─ app/pages/extensions/index.vue (SSR'd by Nitro)
      ├─ useFilters() reads route.query → parseFilters() typed Filters
      └─ useFetch("/api/internal/extensions", { query: route.query })
                                       │
            ┌──────────────────────────┘
            ▼
      server/api/internal/extensions.get.ts
          ├─ parseFilters(searchParams) again (server side, defensive)
          ├─ try/catch around Promise.all([
          │     listExtensions(filters),
          │     countFilteredExtensions(filters),
          │   ])  → 500 on db error
          └─ returns { items, total, filters }
```

`buildExtensionWhere(db, filters)` in `shared/search/query.ts` is pure; takes the db client as a parameter so it stays inside the `shared/` boundary. Same function powers `/api/v1/extensions` so the CLI sees the same filter semantics as the web.

### Detail

```text
GET /en/extensions/<slug>
  └─ app/pages/extensions/[slug].vue (SSR)
      └─ useFetch("/api/internal/extension-detail", { query: { slug } })
                                       │
            ┌──────────────────────────┘
            ▼
      server/api/internal/extension-detail.get.ts
          ├─ getExtensionBySlug(slug)        ← server/utils/queries/extension-detail.ts
          ├─ Promise.all:
          │     listExtensionVersions(id)
          │     getRelatedExtensions(id, cat)
          └─ returns { ext, versions, related }
```

The page renders a two-column layout (hero + README via `<Markdown>` on the left, metadata sidebar + Related list on the right). `<Markdown>` runs `markdown-it` → `DOMPurify` with an explicit tag/attr allowlist and a tight `ALLOWED_URI_REGEXP` that blocks `javascript:`, `data:`, `file:`, `vbscript:`. Homepage and repo URLs pass through a separate `safeExternalUrl()` allowlist.

### Auth (web)

Better Auth instance lives at `server/utils/auth.ts` as a lazy singleton (`useAuthServer`). The Drizzle adapter is wired against the existing `users` / `sessions` / `accounts` / `verifications` tables. Three additional fields (`locale`, `themePreference`, `defaultDeptId`) are declared via `additionalFields` with `input: false` — set by app code, not the auth form.

```text
Browser ── POST /api/auth/sign-up/email ──▶ Nuxt
              ├─ server/api/auth/[...all].ts → toWebRequest(event) → auth.handler()
              ├─ Better Auth: hash, insert users row, mint session, Set-Cookie
              └─ 200 { user, session }

(then) require-onboard middleware:
  ├─ SSR branch:  auth.getSession({ headers: toFetchHeaders(useRequestHeaders(["cookie"])) })
  └─ Client:      auth.useSession() reactive ref
  if user.defaultDeptId is null → navigateTo(localePath("/onboard"))
```

`require-auth` middleware redirects unauthenticated requests to `/sign-in?next=<originalPath>`. Both middleware are named, not global — pages opt in via `definePageMeta({ middleware: ["require-auth", "require-onboard"] })`.

### Auth (CLI device-code)

Two parallel flows back the same `sessions` table:

```text
CLI                                             Nuxt                                User browser
──── POST /api/v1/auth/device/code ──▶ creates two verifications rows
                                       (dc:poll:<deviceCode>,
                                        dc:user:<userCode>) in one tx
   ◀─ { deviceCode, userCode,
        verificationUri: "/cli/auth" }
                                                                          ▶ opens /en/cli/auth
                                                                            (require-auth)
                                                                            types user code
                                                                            submits → POST
                                                                            /api/internal/
                                                                            device-authorize
                                                                            (requireUser)
                                                                            ├─ resolve userCode
                                                                            │   → deviceCode
                                                                            ├─ insert 30-day
                                                                            │   sessions row
                                                                            │   (CLI token)
                                                                            ├─ stamp poll row
                                                                            │   authorized=true
                                                                            └─ delete lookup row
─── POST /api/v1/auth/device/poll ───▶ reads poll row by deviceCode
   ◀─ { status: "authorized", token } ◀── deletes poll row, returns token once
   (CLI stores token in
    ~/.config/agentcenter/credentials.json mode 0600)
```

Subsequent `/api/v1/*` writes from the CLI carry the token as `Authorization: Bearer <token>`. `authenticateBearerToken(event)` in `server/utils/api-auth.ts` joins `sessions` to `users` to resolve the caller.

### Publish

```text
Browser                          Nitro                          Storage     Inngest
   │ /publish/new ──submit────▶│
   ├ POST /api/internal/publish/create-draft (ManifestFormSchema)
   │       │                    │
   │       │   transactional:
   │       │     insert extensions (visibility=draft, funcCat/subCat backfilled)
   │       │     insert extension_versions (status=pending)
   │       │     insert extension_tags
   │       │
   │   ◀── { extensionId, versionId }
   │
   ├ POST /api/upload/sign (slug + version) (requireUser-gated)
   │   ◀── { url, key = bundles/<slug>/<version>/bundle.zip }
   │
   ├ PUT  <signed url> ─────────────────────▶ direct browser → storage
   │
   ├ POST /api/internal/publish/attach-file
   │       │  (requireUser-gated, ownership-checked: version→extension→publisherUserId)
   │       │  transactional: insert files + UPDATE version.bundleFileId
   │       │  (UPDATE uses .returning() and throws on 0 rows to force rollback)
   │
   ├ POST /api/internal/publish/submit
   │       │  (ownership-checked again)
   │       │  state.submit() — pending|scanning → scanning (idempotent retry)
   │       │  inngest.send("extension/scan.requested", { versionId, fileId })
   │       │  rollback scanning→pending if inngest.send fails
   │       │
                                          inngest receives event,
                                          calls /api/inngest webhook
                                                                          │
                                              ┌───────────────────────────┘
                                              ▼
                                     scan-bundle:
                                       fetch signed download URL
                                       SHA-256 the bytes
                                       fflate unzipSync   (try/catch → invalid_zip)
                                       smol-toml parse manifest.toml
                                       BundleManifestSchema.safeParse
                                       recordScanResult(versionId, fileId, ok | reject)
                                         ├─ scope = personal:
                                         │     files.scanStatus=clean
                                         │     version.status=ready + publishedAt
                                         │     extensions.visibility=published + publishedAt
                                         │     (one transaction)
                                         └─ scope = org|enterprise:
                                              files.scanStatus=clean
                                              version.status=ready
                                              (admin must publishVersion later)
                                       on failure:
                                         files.scanStatus=flagged
                                         version.status=rejected
                                       sendEvent("extension/index.requested")
                                              │
                                              ▼
                                     reindex-search:
                                       publishVersion(versionId)
                                       sendEvent("extension/published")
```

Two design decisions worth knowing:

- **`recordScanResult` branches on extension scope**: `personal` is the auto-publish path; `org` / `enterprise` wait for an admin curation call to `publishVersion`. The scan job doesn't have to know the rule — `recordScanResult` joins `extensions` and reads `scope`.
- **`extensions.search_vector` is a Postgres `GENERATED ALWAYS … STORED` column** — no application code writes to it. The reindex job exists for the publish flip + the downstream `extension/published` event, not for any DB write to the search vector.

### Install (web)

```text
Browser ── click InstallButton ──▶ POST /api/internal/installs (requireUser)
                                       │
                                       ▼
                          recordInstall in server/utils/installs.ts:
                            tx.select prior installs for (user, ext)  → isFirstInstall
                            tx.insert installs row
                            tx.upsert into the "Installed" collection
                            tx.update extensions set downloadsCount = downloadsCount + 1
                          (all four writes in one transaction)
                          getOrCreateSystemCollection seeds the Installed
                          collection lazily on first read — decoupled from
                          Better Auth signUp hook (per the locked plan).
```

### Install (CLI)

```text
agentcenter install <slug>
  ├── GET /api/v1/extensions/<slug>           metadata + bundleUrl
  ├── GET /api/v1/extensions/<slug>/bundle    302 → signed storage URL
  ├── fetch(signedUrl) → ZIP bytes
  ├── unzip + write to manifest.install.<agent> dir (~/.claude/skills/<slug>)
  └── POST /api/v1/installs (Bearer)           records the event
```

The bundle endpoint resolves the latest **`status="ready"`** version by `publishedAt DESC NULLS LAST, createdAt DESC`. Returns 503 + `bundle_unavailable` if no ready version exists yet (still scanning, scan failed, etc.). The signed URL is short-lived (default ~5 minutes from `storage.getSignedDownloadUrl`); clients should fetch immediately.

## Storage backend

`server/utils/storage.ts` exports a single `useStorage()` lazy-singleton. The backend is picked from env at first call:

- `R2_ACCOUNT_ID` set → Cloudflare R2 (via `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`)
- otherwise `SUPABASE_URL` set → Supabase Storage (via `@supabase/supabase-js` `createSignedUploadUrl` / `createSignedUrl`)
- both unset → throws a clear "storage not configured" error on first use, not at module load

Both backends implement the same `StorageBackend` interface (`bundleKey`, `getSignedUploadUrl`, `getSignedDownloadUrl`). Swapping is a config flip, not a code change. Both SDKs ship in the bundle; only the configured one runs at request time.

`bundleKey(slug, version)` returns `bundles/<slug>/<version>/bundle.zip`. Slug + version are locked once a draft is persisted (the wizard refuses to write them via `updateDraftExtension`) — they form the object key, and letting them shift would orphan the upload.

## Auth model summary

```text
Web sessions:   cookie ◀─▶ sessions.token  (Better Auth handler at /api/auth)
CLI sessions:   Bearer  ◀─▶ sessions.token  (device-code flow → 30-day token)
                                            (Bearer recognized by api-auth.ts,
                                             which joins sessions to users)
```

Same table, two transport mechanisms. The CLI's `verifications`-based device-code flow lives alongside Better Auth's own usage of the `verifications` table for email-verification — they use distinct `identifier` namespaces (`dc:poll:*`, `dc:user:*` vs the Better Auth defaults).

## i18n

- `@nuxtjs/i18n` with `strategy: "prefix"`. Locales `en` (default) + `zh`. Always-prefixed URLs (`/en/...`, `/zh/...`); the i18n module owns the locale segment — **pages live at `app/pages/...`, NOT `app/pages/[locale]/...`**.
- Static UI strings in `i18n/locales/{en,zh}.json`. Keys are namespaced by feature (`Sidebar.browse`, `nav.toggleSidebar`, `publish.fields.summary`).
- Dynamic content (extension names, descriptions, dept names, tag labels): **column-per-language** in Postgres (`name` + `nameZh`, `description` + `descriptionZh`, `tags.labelEn` + `tags.labelZh`). Component-level locale switching reads the appropriate column.
- Locale switcher swaps the segment via `useSwitchLocalePath()`, preserving query string.

## Theme

Editorial Ivory (default) + Dark. Cookie name: `theme`, values `ivory | dark`. The no-flash-on-hydrate trick:

```ts
// app/composables/useTheme.ts
const cookie = useCookie<Theme>("theme", { default: () => "ivory", ... })
useHead({ htmlAttrs: { class: computed(() => cookie.value === "dark" ? "dark" : "") } })
```

Called synchronously in `app.vue`'s `<script setup>` so unhead serializes the class into the SSR HTML before the response stream. Client toggling is reactive — no `router.refresh()`. Tailwind v4's `@custom-variant dark (&:where(.dark, .dark *))` in `tailwind.css` activates `dark:` utilities against the same class.

## Error handling

- **Page-level**: `app/error.vue` catches any throw that escapes a page. Wrapped in `<NuxtLayout>` so the topbar/sidebar render and users can navigate away. Dev console logs the full error; production logs only `{ statusCode, message }` (avoids leaking Drizzle SQL fragments).
- **Endpoint-level**: all `/api/v1/*` endpoints return the documented `{ error, message }` shape via `apiError(event, message, status, code)` which throws an `H3Error` typed `never`. Internal endpoints throw `createError({ statusCode, statusMessage })` directly; the global error page handles them.
- **Inngest jobs**: catch `VersionStateError` from state-machine writes — these mean a duplicate Inngest delivery, treated as idempotent no-op (with a `console.warn` for triage).

## Background jobs

- Inngest client is a lazy module-level singleton in `server/utils/inngest.ts`. Function list is itself lazy-loaded via dynamic `import()` so unrelated server modules don't pull `fflate` / `smol-toml` into their import graph.
- Webhook endpoint at `server/api/inngest.ts` calls `serve()` from `inngest/node` and awaits it — without the await, the Nuxt response could close before Inngest finishes signature verification + step dispatch.
- `INNGEST_SIGNING_KEY` is read by `serve()` from env automatically.
- For local dev, run `bunx inngest-cli@latest dev` — auto-discovers `/api/inngest` and routes events locally. No keys needed in dev (the client uses `isDev: true` when `NODE_ENV !== "production"`).

## Validate pipeline

`bun run validate` chains `prepare → lint → typecheck → test`:

| Step | Tool | Why |
|---|---|---|
| `nuxi prepare` | generates `.nuxt/types/*` for auto-imports | `vue-tsc` errors on auto-imported symbols without it |
| `@nuxt/eslint` | lint Vue + TS + Nuxt with layer-boundary rules | replaces `eslint-config-next` |
| `nuxi typecheck` | `vue-tsc` strict + the three extras | `tsc --noEmit` can't read `.vue` |
| Vitest + `@nuxt/test-utils` | unit + component (happy-dom) | `mountSuspended` for Nuxt internals |

Pre-push hook runs the same. CI mirrors on every PR push. Playwright (`bun run test:e2e`) is a separate, slower gate — local on demand, nightly in CI. SSR cookie assertions live in Playwright because `@nuxt/test-utils` e2e setup can't bundle under Vitest+Bun.

## Locked decisions

The full list lives in [`CLAUDE.md`](../CLAUDE.md#locked-product-decisions) and [`plan.md`](./plan.md#13-locked-decisions). The ones that drove the architecture above:

- **Multi-tenant schema, single-tenant UI** (decision #1). `organizations` table populated; no org picker in the wizard. `ownerOrgId` defaults to `"default"`.
- **Better Auth + Drizzle adapter** (#2). Cookie sessions; CLI device-code on the same table.
- **Inngest** (#3). Same SDK as the original repo; webhook on Nitro.
- **Supabase Storage default, R2 alternative** (#5). Pluggable via env at first use.
- **Locale URLs always prefixed** (#8). `@nuxtjs/i18n` owns the segment.
- **CLI agent-agnostic with Claude-first defaults** (#10). Per-agent install paths in the manifest; `~/.claude/...` is the default profile.

## What's intentionally NOT in this architecture

- **No RSC, no Vue Server Components** — Nuxt's `useAsyncData` / `useFetch` covers SSR data fetching. Vue's Server Components are not mature enough to replicate the RSC model meaningfully.
- **No server actions** — every Next.js `'use server'` action became a `server/api/internal/...` endpoint called over the wire.
- **No `revalidateTag`** — Nuxt's data layer keys per-`useFetch` call, not by tags. Reindex job sends an `extension/published` event; consuming pages refetch on next visit.
- **No barrel files** (`index.ts` re-exports) except `shared/db/schema/index.ts` (Drizzle needs the namespace).
- **No DB mocking in unit tests** — pure logic lives in `shared/` and is tested directly; DB-touching code is covered by Playwright. Mocked-DB tests are a known failure mode (mock/prod drift).
