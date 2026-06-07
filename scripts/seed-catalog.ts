// Idempotent catalog seed.
//
// Safe to run on every deploy. Mirrors scripts/seed-mcp-landscape.ts in
// strategy: upserts a fixed inventory of extensions (id prefix `cat-`) plus
// the small set of supporting rows it needs (default org, tag vocabulary),
// then prunes any catalog-prefixed rows no longer in the inventory. Real
// user-published extensions (any non-`cat-` id) are never touched.
//
// Wired into the Vercel build via `vercel-build` so a freshly deployed
// environment carries a populated /extensions catalog.

import { and, inArray, notInArray, sql } from "drizzle-orm"
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { CATALOG, type CatalogEntry } from "../shared/data/catalog"
import * as schema from "../shared/db/schema"
import {
  extensions,
  extensionTags,
  organizations,
  tags,
} from "../shared/db/schema"
import { TAG_LABELS } from "../shared/tags"

type Db = PostgresJsDatabase<typeof schema>

const SYSTEM_ORG_ID = "default"
const CATALOG_ID_PREFIX = "cat-"

function extensionIdFor(entry: CatalogEntry): string {
  return `${CATALOG_ID_PREFIX}${entry.slug}`
}

/**
 * Upserts the catalog into `extensions` + `extension_tags`. Re-runnable;
 * never destructive to user data. The whole body runs inside one
 * transaction so a mid-step failure rolls back cleanly — particularly
 * important for step 4, where a crash between the delete and the insert
 * would otherwise leave catalog extensions with no tag links.
 *
 *   1. Ensure SYSTEM_ORG_ID exists (the owner for catalog rows).
 *   2. Upsert every tag from TAG_LABELS so referenced ids resolve in prod.
 *   3. Upsert each catalog entry by extension id.
 *   4. Replace tag links for each upserted extension (delete-then-insert
 *      scoped by extensionId — surgical, only the catalog row is touched).
 *   5. Prune extensions with id LIKE 'cat-%' not in the current CATALOG.
 */
export async function seedCatalog(db: Db): Promise<void> {
  await db.transaction(async (tx) => {
    // 1. Owner org — same constant as seed-mcp-landscape; safe to upsert again.
    await tx
      .insert(organizations)
      .values({
        id: SYSTEM_ORG_ID,
        slug: SYSTEM_ORG_ID,
        name: "Default Organization",
        nameZh: "默认组织",
      })
      .onConflictDoNothing({ target: organizations.id })

    // 2. Tag vocabulary. seed.ts seeds these in dev; in prod nothing else
    //    does, so we upsert here too. onConflictDoNothing keeps existing
    //    rows verbatim in case admin curation has edited a label by hand.
    const tagRows = Object.entries(TAG_LABELS).map(([id, label]) => ({
      id,
      labelEn: label.en,
      labelZh: label.zh,
    }))
    await tx.insert(tags).values(tagRows).onConflictDoNothing()
    console.log(`seed-catalog: ensured ${tagRows.length} tags`)

    // 3. Extension upserts. Catalog rows are visibility=published with a
    //    fixed publishedAt (so re-runs don't shift sort order); ownerOrgId
    //    is the SYSTEM_ORG; publisherUserId is null (the schema allows it).
    //    deptId stays null — catalog rows are department-agnostic.
    const now = new Date()
    const extRows = CATALOG.map((entry) => ({
      id: extensionIdFor(entry),
      slug: entry.slug,
      category: entry.category,
      scope: entry.scope,
      funcCat: entry.funcCat,
      subCat: entry.subCat,
      l2: entry.l2,
      badge: entry.badge ?? null,
      officialTier: entry.officialTier ?? null,
      publisherUserId: null,
      ownerOrgId: SYSTEM_ORG_ID,
      deptId: null,
      iconEmoji: entry.iconEmoji,
      iconColor: entry.iconColor,
      visibility: "published" as const,
      name: entry.name,
      nameZh: entry.nameZh,
      tagline: entry.tagline,
      taglineZh: entry.taglineZh,
      description: entry.description,
      descriptionZh: entry.descriptionZh,
      downloadsCount: entry.downloadsCount,
      starsAvg: entry.starsAvg,
      ratingsCount: Math.floor(entry.downloadsCount / 50),
      publishedAt: now,
    }))

    await tx
      .insert(extensions)
      .values(extRows)
      .onConflictDoUpdate({
        target: extensions.id,
        set: {
          slug: sql`excluded.slug`,
          category: sql`excluded.category`,
          scope: sql`excluded.scope`,
          funcCat: sql`excluded.func_cat`,
          subCat: sql`excluded.sub_cat`,
          l2: sql`excluded.l2`,
          badge: sql`excluded.badge`,
          officialTier: sql`excluded.official_tier`,
          ownerOrgId: sql`excluded.owner_org_id`,
          iconEmoji: sql`excluded.icon_emoji`,
          iconColor: sql`excluded.icon_color`,
          visibility: sql`excluded.visibility`,
          name: sql`excluded.name`,
          nameZh: sql`excluded.name_zh`,
          tagline: sql`excluded.tagline`,
          taglineZh: sql`excluded.tagline_zh`,
          description: sql`excluded.description`,
          descriptionZh: sql`excluded.description_zh`,
          downloadsCount: sql`excluded.downloads_count`,
          starsAvg: sql`excluded.stars_avg`,
          ratingsCount: sql`excluded.ratings_count`,
          updatedAt: sql`now()`,
        },
      })
    console.log(`seed-catalog: upserted ${extRows.length} extensions`)

    // 4. Tag links — replace per-extension to keep edits in sync with the
    //    data file. Scoped delete + insert is safe: it never touches other
    //    rows. The transaction makes the delete+insert atomic so the table
    //    is never observed mid-state.
    const catalogExtIds = extRows.map((r) => r.id)
    await tx
      .delete(extensionTags)
      .where(inArray(extensionTags.extensionId, catalogExtIds))
    const tagLinkRows = CATALOG.flatMap((entry) =>
      entry.tags.map((tagId) => ({
        extensionId: extensionIdFor(entry),
        tagId,
      })),
    )
    if (tagLinkRows.length > 0) {
      await tx
        .insert(extensionTags)
        .values(tagLinkRows)
        .onConflictDoNothing()
    }
    console.log(`seed-catalog: wired ${tagLinkRows.length} tag links`)

    // 5. Prune catalog rows whose slug has been removed from CATALOG. Bound
    //    by the `cat-` id prefix so non-catalog extensions are never affected.
    const desiredIds = catalogExtIds
    const stale = await tx
      .delete(extensions)
      .where(
        and(
          sql`${extensions.id} LIKE ${`${CATALOG_ID_PREFIX}%`}`,
          desiredIds.length > 0
            ? notInArray(extensions.id, desiredIds)
            : sql`true`,
        ),
      )
      .returning({ id: extensions.id })
    if (stale.length > 0) {
      console.log(`seed-catalog: pruned ${stale.length} stale entries (${stale.map((s) => s.id).join(", ")})`)
    } else {
      console.log(`seed-catalog: no stale entries to prune`)
    }
  })
}

// ─── Standalone entry-point: `bun scripts/seed-catalog.ts` ────────────────────
async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error("seed-catalog: DATABASE_URL is not set")
    process.exit(1)
  }
  const client = postgres(url)
  const db = drizzle(client, { schema, casing: "snake_case" })

  console.log("seed-catalog: starting")
  await seedCatalog(db)
  console.log("seed-catalog: done")
  await client.end()
}

const isEntry = import.meta.url === `file://${process.argv[1]}`
if (isEntry) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("seed-catalog: failed")
      console.error(err)
      process.exit(1)
    })
}
