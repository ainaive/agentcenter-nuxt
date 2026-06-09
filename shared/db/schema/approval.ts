import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import {
  extensionCategoryEnum,
  extensions,
  officialTierEnum,
  productLines,
} from "./extension";

export const approvalStatusEnum = pgEnum("approval_status", [
  "pending",
  "approved",
  "rejected",
  "withdrawn",
]);

// Vertical-axis level of a matrix admin assignment.
// `all` is the wildcard root (categoryKey='*'); `macro` is a FUNC_TAXONOMY
// l1 key (9 entries); `micro` is an l2 key (27 entries). See
// `shared/taxonomy.ts` for the keyspaces and the ancestor walk used by
// the cell-admin gate and the routing fan-out.
export const adminCategoryLevelEnum = pgEnum("admin_category_level", [
  "all",
  "macro",
  "micro",
]);

export const approvalRequests = pgTable(
  "approval_requests",
  {
    id: text().primaryKey(),
    extensionId: text()
      .notNull()
      .references(() => extensions.id, { onDelete: "cascade" }),
    // Snapshot of the extension's category at submission time. Drives the
    // per-type matrix toggle and is part of the cell key, so we freeze it
    // here rather than joining `extensions` on every queue scan.
    extensionCategory: extensionCategoryEnum().notNull(),
    requestedTier: officialTierEnum().notNull(),
    // Snapshot of the functional subCat (FUNC_TAXONOMY l1 key) at
    // submission. Validator layer enforces membership; storing as text
    // means a taxonomy edit doesn't require a migration.
    subCat: text().notNull(),
    // Snapshot of the l2 key (FUNC_TAXONOMY l2). Nullable because not
    // every extension classifies down to l2; routing fan-out simply
    // omits the `micro` candidate when l2 is null.
    l2: text(),
    // Product line snapshot — required iff requestedTier='productLine'.
    // RESTRICT on delete keeps the audit trail honest: a product line
    // cannot disappear while requests still reference it.
    productLineId: text().references(() => productLines.id, {
      onDelete: "restrict",
    }),
    requestedByUserId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: text(),
    status: approvalStatusEnum().notNull().default("pending"),
    decidedByUserId: text().references(() => users.id, {
      onDelete: "set null",
    }),
    decidedAt: timestamp({ withTimezone: true }),
    reviewerNote: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Reviewer queue: pending rows in a given cell. Extension category
    // leads since the matrix toggles on it; l2 trails so company-tier
    // rows still collapse onto the same prefix.
    index("idx_approval_status_cell").on(
      t.status,
      t.extensionCategory,
      t.subCat,
      t.requestedTier,
      t.productLineId,
      t.l2,
    ),
    // Publisher "my requests" view.
    index("idx_approval_ext_status").on(t.extensionId, t.status),
    // At-most-one-pending invariant: the orchestrator's read+CAS
    // pattern still applies on the happy path, but two concurrent
    // `submitRequest` calls can both observe "no pending" before
    // either commits. The partial unique index closes that race at
    // the DB layer — the second insert hits 23505 and the
    // orchestrator translates it back to `duplicate_pending_request`.
    uniqueIndex("approval_requests_one_pending_uq")
      .on(t.extensionId)
      .where(sql`status = 'pending'`),
    // Shape invariant: productLineId is present iff requestedTier='productLine'.
    check(
      "approval_requests_pl_shape_chk",
      sql`(requested_tier = 'productLine' AND product_line_id IS NOT NULL)
        OR (requested_tier = 'company' AND product_line_id IS NULL)`,
    ),
  ],
);

// Matrix admin cells. A row in this table grants both (a) admin authority
// over its covered shadow (descendant cells on either the tier-column or
// category-level axis) and (b) the duty to decide approval requests routed
// into that shadow. Replaces the pre-redesign `approval_reviewers` (which
// had a flat 3-coord cell key); see ADR-0001's "Update 2026-06-09b" entry
// for the rationale.
//
// Cell key (5-dim):
//   (extensionCategory, tier, productLineId?, categoryLevel, categoryKey).
//
// Shape invariants (mirroring the iff-pattern used elsewhere):
//   - productLineId is present iff tier='productLine'.
//   - categoryKey = '*' iff categoryLevel='all'.
//
// Routing fan-out happens at the JOIN — `listPendingForUser` in
// `server/repositories/approvals.ts` joins approval_admins to
// approval_requests on the cover relation in one SQL clause.
export const approvalAdmins = pgTable(
  "approval_admins",
  {
    id: text().primaryKey(),
    extensionCategory: extensionCategoryEnum().notNull(),
    tier: officialTierEnum().notNull(),
    productLineId: text().references(() => productLines.id, {
      onDelete: "restrict",
    }),
    categoryLevel: adminCategoryLevelEnum().notNull(),
    // '*' when categoryLevel='all', otherwise an l1 (macro) or l2 (micro)
    // key from FUNC_TAXONOMY. Membership in the right keyspace is enforced
    // at the validator layer — same as approval_requests.subCat — so
    // adding a taxonomy leaf stays a code-only change.
    categoryKey: text().notNull(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Tier-aware uniqueness. ProductLine cells include productLineId in
    // the key; company cells do not. Two partial indexes are clearer than
    // relying on NULLS NOT DISTINCT and let each tier's arity stand on
    // its own in `\d`.
    uniqueIndex("approval_admins_pl_uq")
      .on(
        t.extensionCategory,
        t.tier,
        t.productLineId,
        t.categoryLevel,
        t.categoryKey,
        t.userId,
      )
      .where(sql`tier = 'productLine'`),
    uniqueIndex("approval_admins_co_uq")
      .on(
        t.extensionCategory,
        t.tier,
        t.categoryLevel,
        t.categoryKey,
        t.userId,
      )
      .where(sql`tier = 'company'`),
    // Routing fan-out scan: queue lookups OR over (≤6) candidate cells
    // with the extensionCategory + tier-column prefix.
    index("idx_admins_cell").on(
      t.extensionCategory,
      t.tier,
      t.productLineId,
      t.categoryLevel,
      t.categoryKey,
    ),
    // Covering-row probe for `requireCellAdmin`: starts at (userId) and
    // narrows to the ≤6 candidate cells.
    index("idx_admins_user").on(t.userId),
    // Column-tier shape (same as approval_requests).
    check(
      "approval_admins_pl_shape_chk",
      sql`(tier = 'productLine' AND product_line_id IS NOT NULL)
        OR (tier = 'company' AND product_line_id IS NULL)`,
    ),
    // Category-level shape: '*' iff level='all'.
    check(
      "approval_admins_level_shape_chk",
      sql`(category_level = 'all' AND category_key = '*')
        OR (category_level <> 'all' AND category_key <> '*')`,
    ),
  ],
);
