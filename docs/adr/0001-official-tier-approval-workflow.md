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

- **Tier revocation** — a super-admin removing a granted tier is not
  yet supported. Data model allows `null` already; needs a single
  orchestrator + endpoint.
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
