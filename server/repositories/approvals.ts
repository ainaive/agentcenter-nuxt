import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm"

import type {
  ApprovalStatus,
  OfficialTier,
} from "~~/shared/approvals/state"
import {
  approvalAdmins,
  approvalRequests,
  extensions,
} from "~~/shared/db/schema"
import type { ExtensionCategory } from "~~/shared/types"

import type { Transactable } from "./types"

// `approval_requests` table accessor. Used by the approval orchestrator to
// drive the publisher submit / reviewer decide / publisher withdraw flow.
// `ApprovalStatus` and `OfficialTier` are re-exported so callers that
// already depend on the repository module don't need a second import.

export type { ApprovalStatus, OfficialTier }

export interface ApprovalRequestRow {
  id: string
  extensionId: string
  // Snapshot of the extension's category at submission time. Frozen
  // here so the routing fan-out doesn't have to join `extensions`.
  extensionCategory: ExtensionCategory
  requestedTier: OfficialTier
  subCat: string
  // Snapshot of the extension's l2 leaf, when classified. Null for
  // extensions that only carry a macro classification — routing fan-out
  // simply omits the `micro` candidate when this is null.
  l2: string | null
  productLineId: string | null
  requestedByUserId: string
  reason: string | null
  status: ApprovalStatus
  decidedByUserId: string | null
  decidedAt: Date | null
  reviewerNote: string | null
  createdAt: Date
  updatedAt: Date
}

const fullSelect = {
  id: approvalRequests.id,
  extensionId: approvalRequests.extensionId,
  extensionCategory: approvalRequests.extensionCategory,
  requestedTier: approvalRequests.requestedTier,
  subCat: approvalRequests.subCat,
  l2: approvalRequests.l2,
  productLineId: approvalRequests.productLineId,
  requestedByUserId: approvalRequests.requestedByUserId,
  reason: approvalRequests.reason,
  status: approvalRequests.status,
  decidedByUserId: approvalRequests.decidedByUserId,
  decidedAt: approvalRequests.decidedAt,
  reviewerNote: approvalRequests.reviewerNote,
  createdAt: approvalRequests.createdAt,
  updatedAt: approvalRequests.updatedAt,
}

export interface InsertApprovalRequest {
  id: string
  extensionId: string
  extensionCategory: ExtensionCategory
  requestedTier: OfficialTier
  subCat: string
  l2: string | null
  productLineId: string | null
  requestedByUserId: string
  reason: string | null
}

export async function insertRequest(
  db: Transactable,
  row: InsertApprovalRequest,
): Promise<ApprovalRequestRow> {
  const [created] = await db
    .insert(approvalRequests)
    .values(row)
    .returning(fullSelect)
  if (!created) throw new Error("approval request insert vanished")
  return created
}

export async function findById(
  db: Transactable,
  id: string,
): Promise<ApprovalRequestRow | null> {
  const [row] = await db
    .select(fullSelect)
    .from(approvalRequests)
    .where(eq(approvalRequests.id, id))
    .limit(1)
  return row ?? null
}

// Bulk variant of `findPendingByExtension` for the publisher dashboard —
// the listing already loads many extensions, so we fan in a single query
// rather than N round-trips and return a Map<extId, pendingRequest>.
export async function findPendingForExtensions(
  db: Transactable,
  extensionIds: string[],
): Promise<Map<string, ApprovalRequestRow>> {
  if (extensionIds.length === 0) return new Map()
  const rows = await db
    .select(fullSelect)
    .from(approvalRequests)
    .where(
      and(
        inArray(approvalRequests.extensionId, extensionIds),
        eq(approvalRequests.status, "pending"),
      ),
    )
  return new Map(rows.map((r) => [r.extensionId, r]))
}

// Used by the at-most-one-pending guard in the submit orchestrator.
export async function findPendingByExtension(
  db: Transactable,
  extensionId: string,
): Promise<ApprovalRequestRow | null> {
  const [row] = await db
    .select(fullSelect)
    .from(approvalRequests)
    .where(
      and(
        eq(approvalRequests.extensionId, extensionId),
        eq(approvalRequests.status, "pending"),
      ),
    )
    .limit(1)
  return row ?? null
}

// Publisher's "my requests" view.
export async function listForPublisher(
  db: Transactable,
  userId: string,
): Promise<ApprovalRequestRow[]> {
  return db
    .select(fullSelect)
    .from(approvalRequests)
    .where(eq(approvalRequests.requestedByUserId, userId))
    .orderBy(desc(approvalRequests.createdAt))
}

// Reviewer queue — pending requests covered by the user's admin cells.
// Implemented as a single JOIN between approval_admins and
// approval_requests on the cover relation, so coverage logic lives in
// one SQL clause rather than being recomputed per-cell in the
// orchestrator.
//
// Cover relation (per the redesigned 5-coord cell):
//   - extensionCategory, tier, and productLineId match exactly. The
//     column-tier dimension is intentionally NOT widened for routing
//     (company admins do not pick up product-line requests for review);
//     the company→PL cover applies only to matrix-edit authority,
//     handled by `findCoveringAdmin` in `admins.ts`.
//   - category dimension covers via the all → macro → micro walk:
//     'all' covers everything; 'macro' covers requests with matching
//     subCat (l2 may be anything, including NULL); 'micro' covers only
//     requests where l2 matches exactly (so an l2-less request never
//     reaches a micro admin — the right semantic).
//
// DISTINCT on r.id de-dupes the case where the same user holds two
// admin rows that both cover the same request (e.g. (all,'*') AND
// (macro, subCat)). The pattern mirrors today's Set-based dedup in
// `listReviewerQueue` and stays consistent across the orchestrator.
export async function listPendingForUser(
  db: Transactable,
  userId: string,
): Promise<ApprovalRequestRow[]> {
  return db
    .selectDistinct(fullSelect)
    .from(approvalRequests)
    .innerJoin(
      approvalAdmins,
      and(
        eq(approvalAdmins.userId, userId),
        eq(approvalAdmins.extensionCategory, approvalRequests.extensionCategory),
        eq(approvalAdmins.tier, approvalRequests.requestedTier),
        // Column-tier match — same PL on both sides, including the
        // both-NULL case for company-tier rows. SQL's `=` returns NULL
        // for NULL operands, so the IS NULL fallback is required.
        or(
          eq(approvalAdmins.productLineId, approvalRequests.productLineId),
          and(
            isNull(approvalAdmins.productLineId),
            isNull(approvalRequests.productLineId),
          ),
        ),
        // Category cover: all/macro/micro per the level.
        or(
          and(
            eq(approvalAdmins.categoryLevel, "all"),
            eq(approvalAdmins.categoryKey, "*"),
          ),
          and(
            eq(approvalAdmins.categoryLevel, "macro"),
            eq(approvalAdmins.categoryKey, approvalRequests.subCat),
          ),
          and(
            eq(approvalAdmins.categoryLevel, "micro"),
            eq(approvalAdmins.categoryKey, approvalRequests.l2),
          ),
        ),
      ),
    )
    .where(eq(approvalRequests.status, "pending"))
    .orderBy(desc(approvalRequests.createdAt))
}

// Super-admin variant — every pending request, no JOIN. Kept separate
// from `listPendingForUser` so the trust model is explicit at the call
// site (the orchestrator picks one or the other based on the
// super-admin check).
export async function listAllPending(
  db: Transactable,
): Promise<ApprovalRequestRow[]> {
  return db
    .select(fullSelect)
    .from(approvalRequests)
    .where(eq(approvalRequests.status, "pending"))
    .orderBy(desc(approvalRequests.createdAt))
}

export interface DecidePatch {
  status: "approved" | "rejected"
  decidedByUserId: string
  decidedAt: Date
  reviewerNote: string | null
}

// Optimistic-locking variant: only updates a request that's still pending.
// Returns the number of affected rows so the orchestrator can detect a
// race (a second reviewer that committed between the orchestrator's
// pre-check and this UPDATE) and surface it as `request_not_pending`.
export async function applyDecision(
  db: Transactable,
  id: string,
  patch: DecidePatch,
): Promise<number> {
  const updated = await db
    .update(approvalRequests)
    .set({ ...patch, updatedAt: new Date() })
    .where(
      and(
        eq(approvalRequests.id, id),
        eq(approvalRequests.status, "pending"),
      ),
    )
    .returning({ id: approvalRequests.id })
  return updated.length
}

// Same optimistic-locking shape as `applyDecision` — only a pending
// request can be withdrawn, and the affected row count tells the caller
// whether the transition actually fired.
export async function applyWithdraw(
  db: Transactable,
  id: string,
  decidedAt: Date,
): Promise<number> {
  const updated = await db
    .update(approvalRequests)
    .set({ status: "withdrawn", decidedAt, updatedAt: new Date() })
    .where(
      and(
        eq(approvalRequests.id, id),
        eq(approvalRequests.status, "pending"),
      ),
    )
    .returning({ id: approvalRequests.id })
  return updated.length
}

// Companion mutator for the approve path — stamps `officialTier` and the
// matching `productLineId` (null for company tier) on the parent extension.
// Lives here (rather than in `extensions.ts`) because the approval
// orchestrator is the only legitimate writer; keeping the call adjacent to
// the request mutation makes that intent obvious. The DB CHECK enforces
// productLineId is non-null iff tier='productLine', so a bad pair from a
// caller is rejected at the boundary. Also clears the revocation audit
// fields in the same UPDATE — the invariant is "you're either currently
// Official with no pending revocation explanation, or Unofficial".
export async function setExtensionOfficialTier(
  db: Transactable,
  extensionId: string,
  tier: OfficialTier,
  productLineId: string | null,
): Promise<void> {
  await db
    .update(extensions)
    .set({
      officialTier: tier,
      productLineId,
      revokedAt: null,
      revokedByUserId: null,
      revocationNote: null,
      updatedAt: new Date(),
    })
    .where(eq(extensions.id, extensionId))
}

// Companion mutator for the revoke path — atomically clears
// `officialTier` and `productLineId` while writing the audit trio
// (`revokedAt`, `revokedByUserId`, `revocationNote`). The orchestrator's
// pre-check already confirmed the row was Official; this method's
// returned affected-row count is the race-safe equivalent of a CAS,
// surfacing "someone else already revoked / re-approved" as a 0.
export interface RevocationPatch {
  revokedAt: Date
  revokedByUserId: string
  revocationNote: string
}
export async function applyRevocation(
  db: Transactable,
  extensionId: string,
  patch: RevocationPatch,
): Promise<number> {
  const updated = await db
    .update(extensions)
    .set({
      officialTier: null,
      productLineId: null,
      revokedAt: patch.revokedAt,
      revokedByUserId: patch.revokedByUserId,
      revocationNote: patch.revocationNote,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(extensions.id, extensionId),
        sql`${extensions.officialTier} IS NOT NULL`,
      ),
    )
    .returning({ id: extensions.id })
  return updated.length
}

// Bulk lookup of `officialTier` for a set of extensions — used by the
// publisher dashboard to render the per-row badge alongside any pending
// requests in one round-trip.
export async function findTiersForExtensions(
  db: Transactable,
  extensionIds: string[],
): Promise<Map<string, OfficialTier | null>> {
  if (extensionIds.length === 0) return new Map()
  const rows = await db
    .select({ id: extensions.id, officialTier: extensions.officialTier })
    .from(extensions)
    .where(inArray(extensions.id, extensionIds))
  return new Map(rows.map((r) => [r.id, r.officialTier ?? null]))
}
