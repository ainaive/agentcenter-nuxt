import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import { extensions, officialTierEnum } from "./extension";

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
    index("idx_approval_status_cell").on(
      t.status,
      t.subCat,
      t.requestedTier,
    ),
    // Publisher "my requests" view and the at-most-one-pending guard.
    index("idx_approval_ext_status").on(t.extensionId, t.status),
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
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("approval_reviewers_cell_user_unique").on(
      t.tier,
      t.subCat,
      t.userId,
    ),
    index("idx_approval_reviewers_cell").on(t.tier, t.subCat),
  ],
);
