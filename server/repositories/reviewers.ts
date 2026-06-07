import { and, asc, eq } from "drizzle-orm"

import {
  approvalReviewers,
  memberships,
  users,
} from "~~/shared/db/schema"

import type { Transactable } from "./types"

// `approval_reviewers` table accessor. Backs the reviewer matrix:
// (tier × subCat) → list of users assigned to decide on that cell.
// Also exposes the super-admin lookup used by the admin guards.

export type OfficialTier = "productLine" | "company"

export interface ReviewerRow {
  id: string
  tier: OfficialTier
  subCat: string
  userId: string
  userEmail: string
  userName: string | null
  createdAt: Date
}

export interface InsertReviewerRow {
  id: string
  tier: OfficialTier
  subCat: string
  userId: string
}

// Full matrix view, joined with `users` so the matrix UI can render
// reviewer chips with a recognisable label without an extra round-trip.
export async function listMatrix(db: Transactable): Promise<ReviewerRow[]> {
  return db
    .select({
      id: approvalReviewers.id,
      tier: approvalReviewers.tier,
      subCat: approvalReviewers.subCat,
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
      asc(users.email),
    )
}

// Cells (tier × subCat) where the given user is assigned. Used by the
// orchestrator to drive `listPendingForCells` from `approvals.ts`.
export async function listCellsForUser(
  db: Transactable,
  userId: string,
): Promise<Array<{ tier: OfficialTier; subCat: string }>> {
  return db
    .select({
      tier: approvalReviewers.tier,
      subCat: approvalReviewers.subCat,
    })
    .from(approvalReviewers)
    .where(eq(approvalReviewers.userId, userId))
}

// Per-cell reviewer list — useful for the orchestrator's notification fan-out.
export async function findReviewersFor(
  db: Transactable,
  tier: OfficialTier,
  subCat: string,
): Promise<string[]> {
  const rows = await db
    .select({ userId: approvalReviewers.userId })
    .from(approvalReviewers)
    .where(
      and(
        eq(approvalReviewers.tier, tier),
        eq(approvalReviewers.subCat, subCat),
      ),
    )
  return rows.map((r) => r.userId)
}

export async function insertReviewer(
  db: Transactable,
  row: InsertReviewerRow,
): Promise<void> {
  await db.insert(approvalReviewers).values(row).onConflictDoNothing({
    target: [
      approvalReviewers.tier,
      approvalReviewers.subCat,
      approvalReviewers.userId,
    ],
  })
}

export async function deleteReviewer(
  db: Transactable,
  id: string,
): Promise<void> {
  await db.delete(approvalReviewers).where(eq(approvalReviewers.id, id))
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
