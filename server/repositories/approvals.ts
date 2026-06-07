import { and, desc, eq, inArray, sql } from "drizzle-orm"

import {
  approvalRequests,
  approvalReviewers,
  extensions,
} from "~~/shared/db/schema"

import type { Transactable } from "./types"

// `approval_requests` table accessor. Used by the approval orchestrator to
// drive the publisher submit / reviewer decide / publisher withdraw flow.

export type ApprovalStatus = "pending" | "approved" | "rejected" | "withdrawn"
export type OfficialTier = "productLine" | "company"

export interface ApprovalRequestRow {
  id: string
  extensionId: string
  requestedTier: OfficialTier
  subCat: string
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
  requestedTier: approvalRequests.requestedTier,
  subCat: approvalRequests.subCat,
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
  requestedTier: OfficialTier
  subCat: string
  requestedByUserId: string
  reason: string | null
}

export async function insertRequest(
  db: Transactable,
  row: InsertApprovalRequest,
): Promise<ApprovalRequestRow> {
  await db.insert(approvalRequests).values(row)
  const created = await findById(db, row.id)
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

// Reviewer's queue — pending requests in any (tier, subCat) cell that the
// reviewer is assigned to. Implemented as a single query against the cells
// the reviewer covers; the orchestrator pre-computes the cell list from
// `approval_reviewers` to keep this method driver-portable (no LATERAL).
export async function listPendingForCells(
  db: Transactable,
  cells: Array<{ tier: OfficialTier; subCat: string }>,
): Promise<ApprovalRequestRow[]> {
  if (cells.length === 0) return []
  // Build an OR over (tier=, subCat=) pairs. Postgres collapses these into
  // a single index scan against idx_approval_status_cell.
  const cellMatches = cells.map((c) =>
    and(
      eq(approvalRequests.requestedTier, c.tier),
      eq(approvalRequests.subCat, c.subCat),
    ),
  )
  return db
    .select(fullSelect)
    .from(approvalRequests)
    .where(
      and(
        eq(approvalRequests.status, "pending"),
        sql`(${sql.join(cellMatches, sql` OR `)})`,
      ),
    )
    .orderBy(desc(approvalRequests.createdAt))
}

export interface DecidePatch {
  status: "approved" | "rejected"
  decidedByUserId: string
  decidedAt: Date
  reviewerNote: string | null
}

export async function applyDecision(
  db: Transactable,
  id: string,
  patch: DecidePatch,
): Promise<void> {
  await db
    .update(approvalRequests)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(approvalRequests.id, id))
}

export async function applyWithdraw(
  db: Transactable,
  id: string,
  decidedAt: Date,
): Promise<void> {
  await db
    .update(approvalRequests)
    .set({ status: "withdrawn", decidedAt, updatedAt: new Date() })
    .where(eq(approvalRequests.id, id))
}

// Companion mutator for the approve path — stamps `officialTier` on the
// parent extension. Lives here (rather than in `extensions.ts`) because
// the approval orchestrator is the only legitimate writer; keeping the
// call adjacent to the request mutation makes that intent obvious.
export async function setExtensionOfficialTier(
  db: Transactable,
  extensionId: string,
  tier: OfficialTier,
): Promise<void> {
  await db
    .update(extensions)
    .set({ officialTier: tier, updatedAt: new Date() })
    .where(eq(extensions.id, extensionId))
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

// Used by guards in `decide.post.ts` — confirms a user is assigned to the
// cell that the request originated from. Super-admins are handled in the
// orchestrator (a separate join) so this stays a pure reviewer check.
export async function isReviewerForCell(
  db: Transactable,
  userId: string,
  tier: OfficialTier,
  subCat: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: approvalReviewers.id })
    .from(approvalReviewers)
    .where(
      and(
        eq(approvalReviewers.userId, userId),
        eq(approvalReviewers.tier, tier),
        eq(approvalReviewers.subCat, subCat),
      ),
    )
    .limit(1)
  return !!row
}
