/**
 * Idempotent insert of the editorial public collections defined in
 * shared/data/collections.ts. Safe enough to live in `vercel-build` — when
 * a collection's prerequisites are missing the script logs a warning and
 * skips, never blocks the deploy.
 *
 * Behaviour:
 *   - Resolves each collection's owner by email and each item by extension
 *     slug. Both lookups are batched into a single query each.
 *   - Skips a collection whose owner email isn't present in the DB.
 *   - Skips individual items whose extension slug isn't present, but still
 *     creates the collection if at least one item resolves.
 *   - Inserts each collection only when its `slug` (the readable URL slug,
 *     not the runtime shortcode) is free; existing rows are left untouched
 *     (no metadata overwrite, no visibility flip).
 *   - Inserts collection_items with onConflictDoNothing on the composite PK,
 *     so re-runs pick up newly-added extensionSlugs and zero-change re-runs
 *     are no-ops.
 *   - Exits 0 unless the DB itself is unreachable.
 *
 * Invocation paths:
 *   - Local: `DATABASE_URL=… bun scripts/seed-editorial-collections.ts`
 *   - Vercel build: chained into the `vercel-build` script in package.json
 *     so prod deploys re-attempt every push. On a fresh prod (no demo
 *     users / extensions) every collection is skipped and the script
 *     prints its plan. When real owners/extensions appear later the
 *     curations materialize automatically.
 */

import { eq, inArray } from "drizzle-orm"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { COLLECTIONS } from "../shared/data/collections"
import * as schema from "../shared/db/schema"
import {
  collectionItems,
  collections,
  extensions,
  users,
} from "../shared/db/schema"

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error("seed-editorial-collections: DATABASE_URL is not set")
    process.exit(1)
  }

  const client = postgres(url)
  const db = drizzle(client, { schema, casing: "snake_case" })

  console.log(
    `seed-editorial-collections: ${COLLECTIONS.length} collection(s) to consider`,
  )

  // Resolve owners (email → user.id) and items (slug → extension.id) up
  // front. Two batched lookups, then everything else is in-memory.
  const wantedEmails = [...new Set(COLLECTIONS.map((c) => c.ownerEmail))]
  const wantedSlugs = [
    ...new Set(COLLECTIONS.flatMap((c) => c.extensionSlugs)),
  ]

  const userRows = wantedEmails.length
    ? await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(inArray(users.email, wantedEmails))
    : []
  const userByEmail = new Map(userRows.map((r) => [r.email, r.id]))

  const extRows = wantedSlugs.length
    ? await db
        .select({ id: extensions.id, slug: extensions.slug })
        .from(extensions)
        .where(inArray(extensions.slug, wantedSlugs))
    : []
  const extBySlug = new Map(extRows.map((r) => [r.slug, r.id]))

  let createdCount = 0
  let existingCount = 0
  let skippedCollections = 0
  let itemsInserted = 0

  for (const c of COLLECTIONS) {
    const ownerId = userByEmail.get(c.ownerEmail)
    if (!ownerId) {
      console.log(
        `  ${c.slug}: skipped — owner ${c.ownerEmail} not in this DB`,
      )
      skippedCollections += 1
      continue
    }

    const resolvedItems: { collectionId: string; extensionId: string }[] = []
    const missingSlugs: string[] = []
    for (const slug of c.extensionSlugs) {
      const extId = extBySlug.get(slug)
      if (extId) resolvedItems.push({ collectionId: "", extensionId: extId })
      else missingSlugs.push(slug)
    }

    if (resolvedItems.length === 0) {
      console.log(
        `  ${c.slug}: skipped — none of [${c.extensionSlugs.join(", ")}] are in this DB`,
      )
      skippedCollections += 1
      continue
    }

    const [existing] = await db
      .select({ id: collections.id })
      .from(collections)
      .where(eq(collections.slug, c.slug))
      .limit(1)

    let collectionId: string
    if (existing) {
      collectionId = existing.id
      existingCount += 1
      console.log(`  ${c.slug}: exists, keeping metadata`)
    } else {
      collectionId = crypto.randomUUID()
      const now = new Date()
      await db.insert(collections).values({
        id: collectionId,
        slug: c.slug,
        ownerUserId: ownerId,
        name: c.name,
        nameZh: c.nameZh,
        description: c.description,
        descriptionZh: c.descriptionZh,
        systemKind: null,
        visibility: "public" as const,
        publishedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      createdCount += 1
      const tail = missingSlugs.length
        ? ` (missing items: ${missingSlugs.join(", ")})`
        : ""
      console.log(`  ${c.slug}: created${tail}`)
    }

    for (const item of resolvedItems) item.collectionId = collectionId
    const inserted = await db
      .insert(collectionItems)
      .values(resolvedItems)
      .onConflictDoNothing()
      .returning({ extensionId: collectionItems.extensionId })
    itemsInserted += inserted.length
  }

  console.log(
    `seed-editorial-collections: created ${createdCount}, kept ${existingCount}, skipped ${skippedCollections}, inserted ${itemsInserted} item(s)`,
  )

  await client.end()
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("seed-editorial-collections: failed")
    console.error(err)
    process.exit(1)
  })
