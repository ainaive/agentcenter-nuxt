import { and, asc, eq, isNull, or } from "drizzle-orm"

import type { OfficialTier } from "~~/shared/approvals/state"
import { approvalAdmins, memberships, users } from "~~/shared/db/schema"
import type { CategoryLevel } from "~~/shared/taxonomy"
import { categoryAncestors } from "~~/shared/taxonomy"
import type { ExtensionCategory } from "~~/shared/types"

import type { Transactable } from "./types"

// `approval_admins` table accessor. Replaces the pre-redesign
// `approval_reviewers` repo (`reviewers.ts`). A row grants both admin
// authority over its covered shadow (descendant cells on either the
// tier-column or category-level axis) and the duty to decide approval
// requests routed into that shadow. See ADR-0001 for the cover rules.
//
// Cell key (5-dim): (extensionCategory, tier, productLineId?, level, key).

export type { OfficialTier }

export interface AdminCell {
  extensionCategory: ExtensionCategory
  tier: OfficialTier
  productLineId: string | null
  categoryLevel: CategoryLevel
  categoryKey: string
}

export interface AdminRow extends AdminCell {
  id: string
  userId: string
  userEmail: string
  userName: string | null
  createdAt: Date
}

export interface InsertAdminRow extends AdminCell {
  id: string
  userId: string
}

// Full matrix view, joined with `users` so the matrix UI can render
// admin chips with a recognisable label without an extra round-trip.
// Sort order matches the UI's row→column→key ordering: extension
// category first (the active tab), then column-tier shape (Company
// before any product line), then the vertical hierarchy.
export async function listMatrix(db: Transactable): Promise<AdminRow[]> {
  return db
    .select({
      id: approvalAdmins.id,
      extensionCategory: approvalAdmins.extensionCategory,
      tier: approvalAdmins.tier,
      productLineId: approvalAdmins.productLineId,
      categoryLevel: approvalAdmins.categoryLevel,
      categoryKey: approvalAdmins.categoryKey,
      userId: approvalAdmins.userId,
      userEmail: users.email,
      userName: users.name,
      createdAt: approvalAdmins.createdAt,
    })
    .from(approvalAdmins)
    .innerJoin(users, eq(users.id, approvalAdmins.userId))
    .orderBy(
      asc(approvalAdmins.extensionCategory),
      asc(approvalAdmins.tier),
      asc(approvalAdmins.productLineId),
      asc(approvalAdmins.categoryLevel),
      asc(approvalAdmins.categoryKey),
      asc(users.email),
    )
}

// All admin cells the given user holds. Drives both the
// `requireCellAdmin` covering-cell annotation in the matrix list
// response and the reviewer queue's "what requests cover my cells"
// expansion in `server/repositories/approvals.ts`.
export async function listCellsForUser(
  db: Transactable,
  userId: string,
): Promise<AdminCell[]> {
  return db
    .select({
      extensionCategory: approvalAdmins.extensionCategory,
      tier: approvalAdmins.tier,
      productLineId: approvalAdmins.productLineId,
      categoryLevel: approvalAdmins.categoryLevel,
      categoryKey: approvalAdmins.categoryKey,
    })
    .from(approvalAdmins)
    .where(eq(approvalAdmins.userId, userId))
}

// Column-tier ancestors of a target cell — `(company, null)` is the
// universal cover when the target is a product-line cell; the target
// itself is always its own ancestor.
function columnAncestors(
  tier: OfficialTier,
  productLineId: string | null,
): Array<{ tier: OfficialTier; productLineId: string | null }> {
  if (tier === "productLine") {
    return [
      { tier: "productLine", productLineId },
      { tier: "company", productLineId: null },
    ]
  }
  return [{ tier: "company", productLineId: null }]
}

// Has the given user any admin row that covers the target cell? The
// covering set is at most 6 cells (≤2 column shapes × ≤3 category
// shapes) — built in code and OR-ed into a single index probe on
// `idx_admins_user`. Returns `true` for the first matching row.
//
// Used by both `requireCellAdmin` (the matrix-edit gate) and the
// reviewer queue's per-request covering check. Cross-extensionCategory
// authority does not exist — each ext-type matrix is independent —
// so the candidate cells all share the target's extensionCategory.
export async function findCoveringAdmin(
  db: Transactable,
  userId: string,
  target: {
    extensionCategory: ExtensionCategory
    tier: OfficialTier
    productLineId: string | null
    categoryLevel: CategoryLevel
    categoryKey: string
  },
): Promise<boolean> {
  const colShapes = columnAncestors(target.tier, target.productLineId)
  const catShapes = categoryAncestors(target.categoryLevel, target.categoryKey)

  const colExpr = or(
    ...colShapes.map((c) =>
      c.productLineId === null
        ? and(eq(approvalAdmins.tier, c.tier), isNull(approvalAdmins.productLineId))
        : and(
            eq(approvalAdmins.tier, c.tier),
            eq(approvalAdmins.productLineId, c.productLineId),
          ),
    ),
  )
  const catExpr = or(
    ...catShapes.map((k) =>
      and(
        eq(approvalAdmins.categoryLevel, k.level),
        eq(approvalAdmins.categoryKey, k.key),
      ),
    ),
  )

  const [row] = await db
    .select({ id: approvalAdmins.id })
    .from(approvalAdmins)
    .where(
      and(
        eq(approvalAdmins.userId, userId),
        eq(approvalAdmins.extensionCategory, target.extensionCategory),
        colExpr,
        catExpr,
      ),
    )
    .limit(1)
  return !!row
}

// Reviewer queue's per-request covering check (used at decide time):
// is this user an admin whose shadow covers the given request? The
// request's `l2` is optional — when null we only consider the
// (all, '*') and (macro, subCat) candidates; a `micro` admin cell is
// unreachable for an l2-less request, by construction.
export async function isAdminCoveringRequest(
  db: Transactable,
  userId: string,
  request: {
    extensionCategory: ExtensionCategory
    tier: OfficialTier
    productLineId: string | null
    subCat: string
    l2: string | null
  },
): Promise<boolean> {
  // Treat the request as a `micro` cell when it carries an l2 (and the
  // ancestor walk reflows up to macro+all); otherwise treat as `macro`.
  return findCoveringAdmin(db, userId, {
    extensionCategory: request.extensionCategory,
    tier: request.tier,
    productLineId: request.productLineId,
    categoryLevel: request.l2 ? "micro" : "macro",
    categoryKey: request.l2 ?? request.subCat,
  })
}

export async function insertAdmin(
  db: Transactable,
  row: InsertAdminRow,
): Promise<void> {
  // No `target` on the conflict clause — the table carries two partial
  // unique indexes (one per tier) and Drizzle can't synthesise a typed
  // target across both. The CHECK + partial uniques still de-dupe at the
  // DB layer; this just makes a duplicate insert a no-op instead of an
  // error (same pattern as the pre-redesign repo).
  await db.insert(approvalAdmins).values(row).onConflictDoNothing()
}

export async function deleteAdmin(
  db: Transactable,
  id: string,
): Promise<void> {
  await db.delete(approvalAdmins).where(eq(approvalAdmins.id, id))
}

// Single-row fetch used by the unassign endpoint so it can authorise
// against the row's own cell coords before deleting.
export async function findAdminById(
  db: Transactable,
  id: string,
): Promise<AdminRow | null> {
  const [row] = await db
    .select({
      id: approvalAdmins.id,
      extensionCategory: approvalAdmins.extensionCategory,
      tier: approvalAdmins.tier,
      productLineId: approvalAdmins.productLineId,
      categoryLevel: approvalAdmins.categoryLevel,
      categoryKey: approvalAdmins.categoryKey,
      userId: approvalAdmins.userId,
      userEmail: users.email,
      userName: users.name,
      createdAt: approvalAdmins.createdAt,
    })
    .from(approvalAdmins)
    .innerJoin(users, eq(users.id, approvalAdmins.userId))
    .where(eq(approvalAdmins.id, id))
    .limit(1)
  return row ?? null
}

// Super-admin check. A user is a super-admin if any of their
// memberships carries the `superAdmin` role. Decoupled from a specific
// org so seeded super-admins keep their authority even when the
// default org is renamed.
export async function isSuperAdmin(
  db: Transactable,
  userId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(
      and(eq(memberships.userId, userId), eq(memberships.role, "superAdmin")),
    )
    .limit(1)
  return !!row
}

