import { sql } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import { extensions } from "./extension";

export const systemKindEnum = pgEnum("system_kind", ["installed", "saved"]);

export const collectionVisibilityEnum = pgEnum("collection_visibility", [
  "private",
  "public",
]);

export const collections = pgTable(
  "collections",
  {
    id: text().primaryKey(),
    // 10-char base36 shortcode used in the public URL. Generated server-side
    // on insert. Kept separate from `id` so the URL space stays stable even
    // if the internal id ever changes.
    slug: text().notNull().unique(),
    ownerUserId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text().notNull(),
    nameZh: text(),
    description: text(),
    descriptionZh: text(),
    // null for user-created groups; non-null for the auto-managed Installed/Saved
    systemKind: systemKindEnum(),
    visibility: collectionVisibilityEnum().notNull().default("private"),
    // Set the first time `visibility` flips to `public`. Drives browse sort
    // order. Not reset on a public→private toggle, so "ever-published" sort
    // remains stable; revisit if that causes confusion.
    publishedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_collections_owner_user").on(t.ownerUserId),
    index("idx_collections_visibility_published").on(
      t.visibility,
      sql`${t.publishedAt} DESC`,
    ),
  ],
);

export const collectionItems = pgTable(
  "collection_items",
  {
    collectionId: text()
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    extensionId: text()
      .notNull()
      .references(() => extensions.id, { onDelete: "cascade" }),
    addedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.collectionId, t.extensionId] })],
);
