# ADR-0001: Official-tier approval workflow

## Status

Accepted — 2026-06-07 (shipped via PR #41 merged as `a392c16`).

## Context

The product needed a moderation path for elevating a published extension
to "Official" status. The shape of the workflow was open along four
axes, each with plausible alternatives:

1. **What does "category" mean for routing?** The taxonomy already
   distinguished `funcCat` (3 top-level enum), `subCat` (text drawn
   from `FUNC_TAXONOMY.l1`, 9 leaves), and `deptId` (dotted-path text
   PK with descendant matching). Any one could plausibly drive the
   reviewer matrix.
2. **Are the two official tiers (Product-Line and Company) ordered?**
   A hierarchical ladder (PL first, then Company) reads naturally as
   "earn trust then escalate." Independent tiers let a publisher
   apply directly for Company without a PL gate.
3. **How does the existing `extensions.badge` column (already
   carrying `"official" | "popular" | "new"` and surfaced through the
   frozen `/api/v1` contract) interact with the new tier?** Reusing
   `badge` keeps the schema small; introducing a new column keeps the
   semantics clean.
4. **Who can edit the (tier × category) reviewer matrix?** Any
   `role='admin'` membership is the lightest model; a separate
   super-admin role is a smaller trust circle.

The CLI's `/api/v1` shape is frozen (see `docs/plan.md` §13 and
`docs/api.md`), so any choice that changed the public response was a
contract break and a much larger lift than the workflow needed.

## Decision

Four locked decisions, taken together:

1. **Category = `subCat`** (the FUNC_TAXONOMY l1 leaf). The matrix is
   `9 subCats × 2 tiers = 18` cells — concrete enough to assign
   without sprawl, fine-grained enough that a network specialist
   isn't asked to review documentation tooling.

2. **Tiers are independent, not hierarchical.** A publisher picks
   their target tier at submission time; Company supersedes
   Product-Line if both end up granted on the same extension. The
   orchestrator does not require a prior Product-Line approval before
   a Company request.

3. **`officialTier` is its own enum column.** `extensions.badge`
   stays in the DB unchanged. The `/api/v1/extensions/*` mappers
   *derive* `badge: "official"` from `officialTier != null` at the
   response boundary, so the frozen contract is preserved without a
   v2 bump and the CLI sees no change. App code stops writing `badge`
   entirely; future removal can ride an intentional v2 break.

4. **Matrix admin = `superAdmin` membership role only.** A new value
   is appended to `membershipRoleEnum` alongside `viewer | publisher |
   admin`. Reviewers decide their own assigned cells; matrix edits
   are a separate, smaller trust circle. Super-admins also bypass the
   cell-assignment check when deciding (so they can unblock a stuck
   request without first assigning themselves).

## Consequences

What this makes easier:

- The reviewer queue ranks naturally by cell and is small enough that
  super-admins can hold the whole matrix in their head.
- The CLI keeps working without any contract change — useful since
  the CLI is distributed via npm and slow to roll forward.
- The state machine is small enough to fit in
  `shared/approvals/state.ts` as pure functions with full unit
  coverage; the orchestrator (`server/utils/approvals.ts`) does
  nothing tricky beyond optimistic-lock race detection.

What we gave up:

- A single "officially endorsed" enum on `extensions` would have been
  one fewer column. The separate `officialTier` means we now have
  two fields tracking related concepts; the derive-in-mapper
  bridges them but is technically duplication.
- The independent-tier model lets a brand-new extension apply for
  Company on day one. If we later want to require Product-Line
  approval as a prerequisite, that's a state-machine change we'd
  need a new ADR for.
- A `superAdmin` role concentrates matrix-edit authority in one
  account by default. Production deployments need to remember to
  seed at least one super-admin (`SEED_SUPER_ADMIN_EMAIL`); without
  one, the matrix is unmanageable.

Open follow-ups (not blocking):

- **Notification fan-out** — the orchestrator emits
  `extension/approval.{requested,decided}` Inngest events, but the
  current consumer only logs them. Email / in-app notifications are
  P1.
- **Audit trail for matrix edits** — today we record the decision +
  note on each request row but don't capture super-admin matrix
  changes. If audit becomes a requirement, add a dedicated
  `audit_events` table in a follow-up ADR.

## Cross-references

- Schema: `shared/db/schema/approval.ts`, `shared/db/schema/extension.ts`
- Pure decisions: `shared/approvals/state.ts`
- Orchestrator: `server/utils/approvals.ts`
- Public-contract bridge: `server/api/v1/extensions/index.get.ts:36`
  and `server/api/v1/extensions/[slug]/index.get.ts:24`
- CLAUDE.md decision #12 (summary entry pointing here)
- `docs/plan.md` §3 (schema additions) and `P21` status entry

## Update 2026-06-08 — product-line dimension

PR #41's matrix routed exclusively on `(tier × subCat)`. Reality at
Naive is that the company is organised in **multiple product lines**
(Wireless, Datacom, Terminals, Cloud), and each functional category
inside each product line wants its own admin. The original matrix
collapses all four lines onto one cell per subCat, which is the wrong
unit of trust — a Wireless network specialist isn't the right reviewer
for a Cloud network skill. The Product-Line tier therefore needs a
third axis. The Company tier stays one admin per subCat — that level
is intentionally cross-line.

A second constraint surfaced at the same time: the company-tier admin
of a given subCat is the right person to **pick the product-line
admins** for that same subCat. The original `superAdmin`-only gate
makes them ask a super-admin every time, which doesn't scale and
doesn't reflect the org chart.

Refinements (do not revoke the original four locked decisions; they
remain accurate):

- **Decision #1 refines**: routing key is `(tier × subCat × productLine?)`,
  where `productLine` is required iff `tier='productLine'` and absent
  otherwise. The reviewer matrix table widens to
  `9 subCats × 1 Company + 9 subCats × 4 ProductLines = 45` cells.
  `productLines` is a seeded lookup table (id, label_en, label_zh,
  sort_order), kept as data rather than a code enum so adding a line
  is a content migration. CHECK constraints on
  `approval_reviewers`, `approval_requests`, and `extensions` enforce
  the iff-rule at the boundary — repository and orchestrator code can
  rely on it as a hard backstop.
- **Decision #4 widens**: matrix edits remain super-admin-able anywhere,
  but a **company-tier admin of subCat X may now manage productLine
  cells of subCat X (any productLine)**. Company-tier cells stay
  super-admin-only. The new `requireCellAdmin(event, cell)` helper
  encodes the rule; `unassign.delete.ts` loads the target row first so
  the gate authorises against the row's own coordinates rather than
  the caller's request body.

Implementation notes:

- **Partial unique indexes over `NULLS NOT DISTINCT`** on
  `approval_reviewers`: two indexes, one per tier, each carrying
  exactly the columns that participate. This is clearer than one
  unique index with quirky NULL semantics and lets each tier's arity
  stand on its own in `\d`.
- **`/api/v1` contract is unchanged.** `badge: ext.officialTier
  ? "official" : ext.badge` already collapses tier away; productLineId
  is intentionally suppressed at the same boundary. A future v2 break
  could expose the tier + line; until then the CLI sees nothing new.
- **`listReviewerQueue` dedup key** picks `productLineId ?? '∅'` for
  the super-admin fan-out so a `(company, cloud, null)` cell can't
  collide with `(productLine, cloud, '')` in the Set.

What this gives up:

- Single product line per extension. Multi-line endorsement would
  require a `extension_official_product_lines` join table and is
  rejected for v1 as additional surface area for a use case nobody has
  asked for. A publisher who wants two endorsements submits two
  separate requests; the latest approved one stamps the extension.
- A non-super company admin can still grow the productLine reviewer
  pool unbounded inside their subCat. We accept this — the trust
  circle for "your own subCat" is small by construction.

Cross-references for this update:

- Migration: `drizzle/0009_last_naoko.sql`
- New helpers: `server/utils/auth.ts` (`requireCellAdmin`),
  `server/repositories/reviewers.ts` (`isCompanyAdminForSubCat`,
  `listCompanySubCatsForUser`, `findReviewerById`).
- New repo: `server/repositories/productLines.ts`
- New endpoint: `server/api/internal/product-lines/index.get.ts`
- UI: `app/components/approvals/ReviewerMatrix{,Company,ProductLine}.vue`,
  `app/components/approvals/RequestOfficialDialog.vue`,
  `app/components/filters/OfficialTierPicker.vue` (collapses the original
  OfficialTierPill + ProductLinePill into one popover trigger so the
  listing rail stays a single row — see the 2026-06-08-b followup), and the
  `extensions.officialTier.productLineWith` i18n key consumed by
  `app/components/extension/ExtHero.vue`.

## Followup 2026-06-08-b — filter rail consolidation

The product-line dimension surfaced as a second inline pill rail
(`ProductLinePill.vue`) immediately next to the tier pill rail
(`OfficialTierPill.vue`). With `tier=productLine` selected the listing
rail rendered roughly twenty interactive elements on one row and wrapped
into 2–3 physical lines on a typical viewport — at odds with locked
decision #3's "single-row quiet pill rail".

The two pill components are replaced by a single popover trigger,
`OfficialTierPicker.vue`, that owns both the `tier` and `productLineId`
URL keys. The trigger reads `Official: <value>` and matches the
existing `CreatorPicker` / `PublisherPicker` / `DeptPicker` affordance.
Opening it exposes a Tier row of four options and, when Product-Line is
active, a Product-Line row of N+1 options inside the same popover.
Switching tier *away* from Product-Line clears `productLineId` in the
same `update({...})` call so the URL never carries a stale line on a
non-productLine tier — mirroring the iff-rule the server already
enforces.

No URL contract change. No API change. The active-filter chip strip
(`ResultsSummary.vue`) keeps surfacing dismissible chips for the
applied filters, unchanged. Cross-references for the followup:

- New component: `app/components/filters/OfficialTierPicker.vue`
- Filter rail mount: `app/components/filters/FilterBar.vue`
- Removed: `app/components/filters/OfficialTierPill.vue`,
  `app/components/filters/ProductLinePill.vue`
- New i18n key: `filters.tierPicker.triggerLabel` (EN: "Official", ZH: "官方"),
  reusing the existing `filters.tierLabel` / `filters.productLineLabel`
  keys as popover section headers.

## Update 2026-06-09b — matrix redesign (ext-type × 3-tier × column)

The 2026-06-08 + revocation updates left the matrix at 45 cells —
`9 subCats × (Company + 4 ProductLines)` — with a flat one-level
category axis (FUNC_TAXONOMY l1 only) and exact-match routing. Two
limitations surfaced in practice:

1. **No per-extension-type split**. A Skills reviewer and an MCP
   reviewer overlap if they care about the same subCat, but they
   review fundamentally different artifacts. The matrix had no way
   to route them separately.
2. **Category granularity was either too coarse (l1 only) or
   inexpressive (l2 was stored on the extension but ignored by
   routing)**. A reviewer who only knows `reqAnalysis` couldn't sign
   up just for that leaf; they had to take the whole `systemDesign`.

Refinements (do not revoke the four locked decisions; they remain
accurate):

- **Decision #1 widens to 5 coordinates**: routing key is now
  `(extensionCategory × tier × productLineId? × categoryLevel × categoryKey)`.
  `extensionCategory` reuses the existing `extension_category` enum
  (`skills | mcp | slash | plugins`); `categoryLevel` is a new
  `admin_category_level` enum (`all | macro | micro`); `categoryKey`
  is `'*'` at the `all` level, an l1 leaf at `macro`, an l2 leaf at
  `micro`. The reviewer table is renamed `approval_admins` because a
  row now grants both review duty AND admin authority over its
  covered shadow — see the cover relation below.
- **Decision #4 widens via a 2-D cover relation**. Matrix edits are
  gated by `requireCellAdmin(event, cell)` which returns true iff
  the caller holds an admin row whose covered shadow includes the
  target cell:
    - **Column-tier dim** — `(company, null) ⊇ (productLine, X)` for
      any X. A company admin can configure product-line admins. A
      PL admin can only configure same-PL cells.
    - **Category dim** — `(all, '*')` covers everything; `(macro, l1)`
      covers itself + its 3 l2 children; `(micro, l2)` covers only
      itself.
  Cross-extensionCategory authority does NOT exist — each ext-type
  matrix is independent. Super-admins still bypass the gate.
- **Routing is fan-out on the category dim, EXACT on column-tier**.
  A pending request at `(E, T, C, l1, l2)` routes to any admin whose
  `(extensionCategory, tier, productLineId)` matches exactly AND
  whose `(categoryLevel, categoryKey)` covers the request's
  `(macro=l1, micro=l2)` via the ancestor walk. Crucially, a Company
  admin does NOT review Product-Line requests — the company →
  product-line widening applies to admin authority only. Routing is
  implemented as a single JOIN in
  `approvalsRepo.listPendingForUser`; super-admins read
  `listAllPending` instead. Request rows snapshot `extensionCategory`
  and `l2` at submission time so the JOIN doesn't need a hop through
  `extensions`.
- **`approval_requests` columns added**: `extension_category` (NOT
  NULL, mirrors `extensions.category` at submission time) and `l2`
  (nullable — extensions without an l2 classification still submit;
  routing fan-out simply omits the `micro` candidate for those).
  Updated `idx_approval_status_cell` carries both.

Implementation notes:

- **Clean replacement migration** (`0012_matrix_redesign.sql`): drops
  `approval_reviewers` and `approval_requests`, recreates both under
  the new shape. Pre-launch product per CLAUDE.md — current cells
  are seed data, so no backfill story is owed.
- **Partial unique indexes on `approval_admins`**: two indexes, one
  per tier (`approval_admins_pl_uq` and `approval_admins_co_uq`),
  each carrying exactly the columns that participate. Same pattern
  as the 2026-06-08 indexes, just widened to the 5-coord key.
- **`/api/v1` contract is unchanged.** The CLI still sees `badge:
  "official"` derived from `officialTier != null`; extensionCategory
  is already exposed on extension rows; l2 is not surfaced. A future
  v2 break could expose the new fields; until then the CLI sees
  nothing new.
- **Auth gate single-query**: `findCoveringAdmin` builds the cover
  relation in code (≤2 column shapes × ≤3 category shapes = ≤6 cell
  candidates), then ORs them into one indexed probe on
  `idx_admins_user`. Same approach as `isAdminCoveringRequest` for
  the decide-path gate, so coverage logic lives in one place.
- **JOIN-driven queue**: `listPendingForUser` is a single SQL
  statement that expresses the cover relation directly. `DISTINCT`
  on `r.id` de-dupes when the same user holds two admin rows that
  both cover a request — the same dedup pattern as today's
  `listReviewerQueue` Set, just promoted into SQL.

What we gave up:

- The l2 keyspace doubles the row count of any admin who wants
  micro-level granularity. We accept this — the matrix UI groups
  micros under their macros (`shared/taxonomy.ts:l2KeysFor`) so a
  full Skills × Wireless reviewer at the l2 level is 27 explicit
  rows, not the implicit 1.
- Routing's exact-match on column-tier means a Company admin who
  also wants to be in the PL request queue must hold both an admin
  row at Company AND one at each PL they care about. We accept this
  because the alternative — implicit Company → PL routing — would
  silently aggregate company admins into every PL queue, which read
  worse in early prototyping than the explicit assignment.

Cross-references for this update:

- Migration: `drizzle/0012_matrix_redesign.sql`
- Schema: `shared/db/schema/approval.ts` (approvalAdmins,
  approvalRequests with extensionCategory + l2),
  `shared/taxonomy.ts` (l1/l2 helpers + `categoryAncestors`)
- Repository rename: `server/repositories/admins.ts` (was `reviewers.ts`)
- Auth: `server/utils/auth.ts:requireCellAdmin` (5-coord)
- Orchestrator: `server/utils/approvals.ts` (submit snapshots
  category + l2; decide path uses `isAdminCoveringRequest`; queue
  uses `listPendingForUser`/`listAllPending`)
- Validators: `shared/validators/approvals.ts:AssignAdminSchema`
- UI: `app/components/approvals/ReviewerMatrix.vue` (unified table
  with ext-type toggle + 3-tier rows — lands in the follow-up commit)

## Update 2026-06-09 — tier revocation

The original ADR called out tier revocation as the most load-bearing
open follow-up: "a super-admin removing a granted tier is not yet
supported. Data model allows `null` already; needs a single
orchestrator + endpoint." We've now closed it.

Design:

- **Trigger lives on the detail page**, next to the badge, gated on
  `admin/me.isSuperAdmin && officialTier`. Super-admins find an
  extension the same way as anyone else — by browsing — and act
  spatially next to the thing they're operating on. We deliberately
  did not add a dedicated `/admin/officials` list page for v1; if bulk
  audits become a need, that's an additive page later.
- **Reason note is required**, matching the existing Reject flow.
  `RevokeTierSchema` enforces `.trim().min(1)`; the publisher sees the
  reason verbatim on their dashboard so a missing note would leave
  them in the dark.
- **Pending elevation requests are left alone.** Revocation clears the
  *current* tier; a pending request asks for a *future* tier. Coupling
  them would mean a Company-Official extension with a pending
  Wireless productLine request can't be revoked without also
  withdrawing the unrelated request — confusing for everyone.

Audit trail strategy:

- **Three new columns on `extensions`**: `revoked_at`,
  `revoked_by_user_id` (FK to `users` with `ON DELETE SET NULL`),
  `revocation_note`. Kept on the row itself rather than in a separate
  `audit_events` table because the publisher dashboard's "why am I no
  longer Official?" answer is one JOIN-free read.
- **`setExtensionOfficialTier` extends to clear the trio** in the same
  UPDATE whenever a tier is stamped. The invariant "you're either
  currently Official with no pending revocation explanation, or
  Unofficial" lives in the repo, not scattered across orchestrator
  branches.
- **`applyRevocation` is a CAS** via `WHERE official_tier IS NOT NULL`:
  the returned affected-row count tells the orchestrator whether the
  row actually transitioned, so a concurrent revoke / re-approve
  surfaces cleanly as `extension_not_official` rather than silently
  no-op'ing.

Inngest event `extension/tier.revoked` fires with `{ extensionId,
revokedByUserId, revokedAt, note }`. The existing notify-approval
consumer hasn't been wired to it yet — that's the next follow-up.

What we gave up:

- A dedicated `audit_events` table would survive across the
  Official→Unofficial→Official cycle. Today the columns clear on
  re-approval, so once an extension is back to Official the prior
  revocation history is gone. That's intentional: the columns answer
  "what's happening now?", not "what's ever happened?" If you need
  durable history, the table is a separate ADR.

Cross-references for this update:

- Migration: `drizzle/0011_warm_mandrill.sql`
- Schema: `shared/db/schema/extension.ts` (revokedAt / revokedByUserId / revocationNote columns)
- Repo: `server/repositories/approvals.ts` (`applyRevocation`,
  extended `setExtensionOfficialTier`)
- Orchestrator: `server/utils/approvals.ts` (`revokeTier`,
  `extension_not_official` code)
- Endpoint: `server/api/internal/approvals/revoke.post.ts`
- UI: `app/components/extension/ExtHero.vue` (canRevoke prop +
  button), `app/components/approvals/RevokeTierDialog.vue`,
  `app/pages/extensions/[slug].vue` (admin/me fetch + dialog host),
  `app/pages/publish/index.vue` (revocation annotation row)
