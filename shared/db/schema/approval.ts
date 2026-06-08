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
import { extensions, officialTierEnum, productLines } from "./extension";

export const approvalStatusEnum = pgEnum("approval_status", [
  "pending",
  "approved",
  "rejected",
  "withdrawn",
]);

export const approvalRequests = pgTable(
  "approval_requests",
  {
    id: text().primaryKey(),
    extensionId: text()
      .notNull()
      .references(() => extensions.id, { onDelete: "cascade" }),
    requestedTier: officialTierEnum().notNull(),
    // Snapshot of the functional subCat at submission time. Source of truth is
    // FUNC_TAXONOMY in shared/taxonomy.ts; validated against the flattened l1
    // key set at the validator layer.
    subCat: text().notNull(),
    // Product line snapshot — required iff requestedTier='productLine'.
    // RESTRICT on delete keeps the audit trail honest: a product line cannot
    // disappear while requests still reference it.
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
    // Reviewer queue: pending rows in a given cell, ordered by createdAt.
    // productLineId trails so company-tier rows (productLineId IS NULL) still
    // collapse onto the same prefix; productLine-tier scans use the full key.
    index("idx_approval_status_cell").on(
      t.status,
      t.subCat,
      t.requestedTier,
      t.productLineId,
    ),
    // Publisher "my requests" view and the at-most-one-pending guard.
    index("idx_approval_ext_status").on(t.extensionId, t.status),
    // Shape invariant: productLineId is present iff requestedTier='productLine'.
    check(
      "approval_requests_pl_shape_chk",
      sql`(requested_tier = 'productLine' AND product_line_id IS NOT NULL)
        OR (requested_tier = 'company' AND product_line_id IS NULL)`,
    ),
  ],
);

export const approvalReviewers = pgTable(
  "approval_reviewers",
  {
    id: text().primaryKey(),
    tier: officialTierEnum().notNull(),
    // Same FUNC_TAXONOMY l1 key as approvalRequests.subCat — text rather
    // than enum so adding a taxonomy leaf doesn't require a migration.
    subCat: text().notNull(),
    // Product line this reviewer is scoped to. Required iff tier='productLine',
    // null when tier='company'. CHECK enforces the shape; the unique behaviour
    // for each tier is expressed below as two partial indexes.
    productLineId: text().references(() => productLines.id, {
      onDelete: "restrict",
    }),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Tier-aware uniqueness. ProductLine cells include productLineId in the
    // key; company cells do not. Two partial indexes are clearer than relying
    // on NULLS NOT DISTINCT and let each tier's arity stand on its own.
    uniqueIndex("approval_reviewers_pl_cell_user_uq")
      .on(t.tier, t.subCat, t.productLineId, t.userId)
      .where(sql`tier = 'productLine'`),
    uniqueIndex("approval_reviewers_co_cell_user_uq")
      .on(t.tier, t.subCat, t.userId)
      .where(sql`tier = 'company'`),
    index("idx_approval_reviewers_cell").on(
      t.tier,
      t.subCat,
      t.productLineId,
    ),
    // Shape invariant: productLineId is present iff tier='productLine'.
    check(
      "approval_reviewers_pl_shape_chk",
      sql`(tier = 'productLine' AND product_line_id IS NOT NULL)
        OR (tier = 'company' AND product_line_id IS NULL)`,
    ),
  ],
);
