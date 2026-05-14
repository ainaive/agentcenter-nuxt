import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { extensions } from "./extension";

export const mcpLayerEnum = pgEnum("mcp_layer", ["industry", "public"]);

// Industry sectors. PK is the design-time slug ("wireless", "cloud", …).
export const mcpSectors = pgTable("mcp_sectors", {
  key: text().primaryKey(),
  label: text().notNull(),
  labelZh: text().notNull(),
  short: text().notNull(),
  sortOrder: integer().notNull(),
});

// Public service domains (AI R&D, Hardware, …).
export const mcpDomains = pgTable("mcp_domains", {
  key: text().primaryKey(),
  label: text().notNull(),
  labelZh: text().notNull(),
  short: text().notNull(),
  sortOrder: integer().notNull(),
});

// PDTs (Product Development Teams) within a domain.
export const mcpPdts = pgTable(
  "mcp_pdts",
  {
    key: text().primaryKey(),
    domainKey: text()
      .notNull()
      .references(() => mcpDomains.key, { onDelete: "cascade" }),
    label: text().notNull(),
    labelZh: text().notNull(),
    sortOrder: integer().notNull(),
  },
  (t) => [index("idx_mcp_pdts_domain_sort").on(t.domainKey, t.sortOrder)],
);

// One row per traditional internal tool service. Status is *derived* —
// extensionId set ⇒ released; else inDev ⇒ dev; else none.
export const mcpLandscapeTools = pgTable(
  "mcp_landscape_tools",
  {
    id: serial().primaryKey(),
    slug: text().notNull().unique(),
    name: text().notNull(),
    nameZh: text(),
    layer: mcpLayerEnum().notNull(),
    ownerSector: text().references(() => mcpSectors.key, {
      onDelete: "restrict",
    }),
    ownerDomain: text().references(() => mcpDomains.key, {
      onDelete: "restrict",
    }),
    // TODO: a composite FK on (ownerDomain, ownerPdt) → (mcpPdts.domainKey, mcpPdts.key)
    // would let the DB enforce that the PDT actually belongs to the domain. Today
    // the seed is the only writer and keeps them aligned; revisit when an admin UI
    // can mutate landscape rows.
    ownerPdt: text().references(() => mcpPdts.key, { onDelete: "restrict" }),
    // Marketplace MCP listing. Non-null ⇒ tool is "released".
    extensionId: text().references(() => extensions.id, {
      onDelete: "set null",
    }),
    inDev: boolean().notNull().default(false),
    depsCount: integer().notNull().default(0),
    blurb: text().notNull(),
    blurbZh: text().notNull(),
    tags: text().array().notNull().default(sql`ARRAY[]::text[]`),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_mcp_tools_layer_sector").on(t.layer, t.ownerSector),
    index("idx_mcp_tools_layer_domain_pdt").on(
      t.layer,
      t.ownerDomain,
      t.ownerPdt,
    ),
    index("idx_mcp_tools_extension").on(t.extensionId),
    // A tool can be released or in-dev or neither — not both.
    check(
      "mcp_tools_status_xor",
      sql`NOT ("extension_id" IS NOT NULL AND "in_dev" = true)`,
    ),
    // Industry tools own a sector; public tools own a domain (and usually a PDT).
    check(
      "mcp_tools_owner_layer",
      sql`(layer = 'industry' AND owner_sector IS NOT NULL AND owner_domain IS NULL AND owner_pdt IS NULL)
        OR (layer = 'public' AND owner_sector IS NULL AND owner_domain IS NOT NULL)`,
    ),
  ],
);
