/**
 * Idempotent insert of the editorial public collections defined in
 * shared/data/collections.ts. Intended for one-off use against prod (or any
 * environment) where running the full `db:seed` is too destructive.
 *
 * Invocation (locally pointing at any DB):
 *   DATABASE_URL='postgresql://…' bun scripts/seed-editorial-collections.ts
 *
 * Against prod from your laptop:
 *   vercel env pull --environment=production .env.prod.real
 *   DATABASE_URL="$(grep ^DATABASE_URL .env.prod.real | cut -d= -f2- | tr -d '"')" \
 *     bun scripts/seed-editorial-collections.ts
 *   rm .env.prod.real
 *
 * Behaviour:
 *   - Verifies the seeded owner users (user-amy, user-ben, …) and the
 *     referenced extensions (ext-1, ext-3, …) all exist; halts cleanly if not.
 *   - Inserts each collection only if its slug is free. Already-present rows
 *     are left untouched (no metadata overwrite, no visibility flip).
 *   - Inserts collection_items with onConflictDoNothing so re-runs are safe
 *     even after editing the COLLECTIONS list (new items get added, existing
 *     ones are skipped).
 *   - Never truncates anything, never touches other tables.
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
    `seed-editorial-collections: ${COLLECTIONS.length} collection(s) to ensure`,
  )

  // Verify prerequisites up-front so we don't end up in a half-applied state.
  const requiredOwnerIds = [...new Set(COLLECTIONS.map((c) => c.ownerUserId))]
  const requiredExtIds = [
    ...new Set(
      COLLECTIONS.flatMap((c) => c.extensionIds.map((n) => `ext-${n}`)),
    ),
  ]

  const presentUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.id, requiredOwnerIds))
  const missingOwners = requiredOwnerIds.filter(
    (id) => !presentUsers.some((u) => u.id === id),
  )

  const presentExts = await db
    .select({ id: extensions.id })
    .from(extensions)
    .where(inArray(extensions.id, requiredExtIds))
  const missingExts = requiredExtIds.filter(
    (id) => !presentExts.some((e) => e.id === id),
  )

  if (missingOwners.length > 0 || missingExts.length > 0) {
    console.error("seed-editorial-collections: missing prerequisites")
    if (missingOwners.length > 0) {
      console.error(`  users not found: ${missingOwners.join(", ")}`)
      console.error(
        "  → these are seeded by `bun run db:seed`. On prod, insert them by hand or run a scoped users insert before re-running this script.",
      )
    }
    if (missingExts.length > 0) {
      console.error(`  extensions not found: ${missingExts.join(", ")}`)
      console.error(
        "  → editorial collections reference the demo EXTENSIONS fixtures. Without them in this DB, the curations would have no items.",
      )
    }
    await client.end()
    process.exit(1)
  }

  let createdCount = 0
  let existingCount = 0
  let itemsInserted = 0

  for (const c of COLLECTIONS) {
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
        ownerUserId: c.ownerUserId,
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
      console.log(`  ${c.slug}: created`)
    }

    // The PK is (collectionId, extensionId) — onConflictDoNothing means rerun
    // after adding a new extensionId to the seed file picks it up cleanly,
    // and rerun with no changes is a no-op.
    const itemRows = c.extensionIds.map((extNumId) => ({
      collectionId,
      extensionId: `ext-${extNumId}`,
    }))
    const inserted = await db
      .insert(collectionItems)
      .values(itemRows)
      .onConflictDoNothing()
      .returning({ extensionId: collectionItems.extensionId })
    itemsInserted += inserted.length
  }

  console.log(
    `seed-editorial-collections: created ${createdCount}, kept ${existingCount}, inserted ${itemsInserted} item(s)`,
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
