import { and, asc, eq, isNull } from "drizzle-orm"

import type { OfficialTier } from "~~/shared/approvals/state"
import {
  approvalReviewers,
  memberships,
  users,
} from "~~/shared/db/schema"

import type { Transactable } from "./types"

// `approval_reviewers` table accessor. Backs the reviewer matrix:
// (tier × subCat × productLineId?) → list of users assigned to decide on
// that cell. ProductLineId participates only for the `productLine` tier;
// the DB CHECK constraint enforces the iff-rule. Also exposes the
// super-admin lookup and the company-admin-for-subCat helper used by the
// delegated matrix-edit gate.

export type { OfficialTier }

export interface ReviewerRow {
  id: string
  tier: OfficialTier
  subCat: string
  productLineId: string | null
  userId: string
  userEmail: string
  userName: string | null
  createdAt: Date
}

export interface InsertReviewerRow {
  id: string
  tier: OfficialTier
  subCat: string
  productLineId: string | null
  userId: string
}

export interface ReviewerCell {
  tier: OfficialTier
  subCat: string
  productLineId: string | null
}

// Full matrix view, joined with `users` so the matrix UI can render
// reviewer chips with a recognisable label without an extra round-trip.
// productLineId sorts NULLS FIRST so company-tier rows precede the
// productLine grid in iteration order.
export async function listMatrix(db: Transactable): Promise<ReviewerRow[]> {
  return db
    .select({
      id: approvalReviewers.id,
      tier: approvalReviewers.tier,
      subCat: approvalReviewers.subCat,
      productLineId: approvalReviewers.productLineId,
      userId: approvalReviewers.userId,
      userEmail: users.email,
      userName: users.name,
      createdAt: approvalReviewers.createdAt,
    })
    .from(approvalReviewers)
    .innerJoin(users, eq(users.id, approvalReviewers.userId))
    .orderBy(
      asc(approvalReviewers.tier),
      asc(approvalReviewers.subCat),
      asc(approvalReviewers.productLineId),
      asc(users.email),
    )
}

// Cells (tier × subCat × productLineId?) where the given user is assigned.
// Used by the orchestrator to drive `listPendingForCells` from `approvals.ts`.
export async function listCellsForUser(
  db: Transactable,
  userId: string,
): Promise<ReviewerCell[]> {
  return db
    .select({
      tier: approvalReviewers.tier,
      subCat: approvalReviewers.subCat,
      productLineId: approvalReviewers.productLineId,
    })
    .from(approvalReviewers)
    .where(eq(approvalReviewers.userId, userId))
}

// SubCats this user is a company-tier reviewer for. Drives the delegated
// matrix-edit gate: a company admin of subCat X can manage productLine
// reviewers for subCat X (and only X).
export async function listCompanySubCatsForUser(
  db: Transactable,
  userId: string,
): Promise<string[]> {
  const rows = await db
    .select({ subCat: approvalReviewers.subCat })
    .from(approvalReviewers)
    .where(
      and(
        eq(approvalReviewers.userId, userId),
        eq(approvalReviewers.tier, "company"),
      ),
    )
  return rows.map((r) => r.subCat)
}

// Cheap per-cell version of the above for endpoint authorisation paths.
export async function isCompanyAdminForSubCat(
  db: Transactable,
  userId: string,
  subCat: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: approvalReviewers.id })
    .from(approvalReviewers)
    .where(
      and(
        eq(approvalReviewers.userId, userId),
        eq(approvalReviewers.tier, "company"),
        eq(approvalReviewers.subCat, subCat),
      ),
    )
    .limit(1)
  return !!row
}

// Per-cell reviewer list — useful for the orchestrator's notification fan-out.
// For company tier the productLineId argument is ignored (and asserted null
// in callers); for productLine tier it must be supplied or the cell match is
// ambiguous.
export async function findReviewersFor(
  db: Transactable,
  tier: OfficialTier,
  subCat: string,
  productLineId: string | null,
): Promise<string[]> {
  const rows = await db
    .select({ userId: approvalReviewers.userId })
    .from(approvalReviewers)
    .where(
      and(
        eq(approvalReviewers.tier, tier),
        eq(approvalReviewers.subCat, subCat),
        productLineId === null
          ? isNull(approvalReviewers.productLineId)
          : eq(approvalReviewers.productLineId, productLineId),
      ),
    )
  return rows.map((r) => r.userId)
}

export async function insertReviewer(
  db: Transactable,
  row: InsertReviewerRow,
): Promise<void> {
  // No `target` on the conflict clause — the table now carries two partial
  // unique indexes (one per tier) and Drizzle can't synthesise a typed
  // target across both. The CHECK + partial uniques still de-dupe at the
  // DB layer; this just makes a duplicate insert a no-op instead of an error.
  await db.insert(approvalReviewers).values(row).onConflictDoNothing()
}

export async function deleteReviewer(
  db: Transactable,
  id: string,
): Promise<void> {
  await db.delete(approvalReviewers).where(eq(approvalReviewers.id, id))
}

// Single-row fetch used by the unassign endpoint so it can authorise
// against the row's tier/subCat (delegation rule) before deleting.
export async function findReviewerById(
  db: Transactable,
  id: string,
): Promise<ReviewerRow | null> {
  const [row] = await db
    .select({
      id: approvalReviewers.id,
      tier: approvalReviewers.tier,
      subCat: approvalReviewers.subCat,
      productLineId: approvalReviewers.productLineId,
      userId: approvalReviewers.userId,
      userEmail: users.email,
      userName: users.name,
      createdAt: approvalReviewers.createdAt,
    })
    .from(approvalReviewers)
    .innerJoin(users, eq(users.id, approvalReviewers.userId))
    .where(eq(approvalReviewers.id, id))
    .limit(1)
  return row ?? null
}

// Super-admin check. A user is a super-admin if any of their memberships
// carries the `superAdmin` role. Decoupled from a specific org so seeded
// super-admins keep their authority even when the default org is renamed.
export async function isSuperAdmin(
  db: Transactable,
  userId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.role, "superAdmin"),
      ),
    )
    .limit(1)
  return !!row
}
