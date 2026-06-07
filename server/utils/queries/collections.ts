import { and, desc, eq, sql } from "drizzle-orm"

import { itemCountExpression } from "~~/server/repositories/collections"
import { useDb } from "~~/server/utils/db"
import { users } from "~~/shared/db/schema/auth"
import { collectionItems, collections } from "~~/shared/db/schema/collection"
import { extensions, extensionTags } from "~~/shared/db/schema/extension"
import type { ExtensionListItem } from "~~/shared/db/queries-types"
import type { CollectionVisibility } from "~~/shared/validators/collection"

// View-layer aggregations for collections. CRUD lives in
// `server/repositories/collections.ts`; this module is for the shapes that
// the profile, browse, and detail pages need.

export interface OwnerCollectionRow {
  id: string
  slug: string
  name: string
  nameZh: string | null
  description: string | null
  descriptionZh: string | null
  systemKind: "installed" | "saved" | null
  visibility: CollectionVisibility
  itemCount: number
  updatedAt: Date
}

export interface PublicCollectionRow {
  slug: string
  name: string
  nameZh: string | null
  description: string | null
  descriptionZh: string | null
  itemCount: number
  publishedAt: Date | null
  ownerName: string | null
}

// Items in a collection are rendered with the same ExtCard the browse grid
// uses, so the row shape extends the marketplace's ExtensionListItem with
// the collection-specific addedAt timestamp.
export interface CollectionItemRow extends ExtensionListItem {
  addedAt: Date
}

// Owner-side listing. Excludes the 'installed' system row (that surface is
// the dedicated "Installed" tab) but keeps 'saved' so the picker can pin it
// at the top. The 'installed' row is still managed by the install
// orchestrator — it's just hidden from the collections UI.
export async function listForOwner(
  userId: string,
): Promise<OwnerCollectionRow[]> {
  const db = useDb()
  return db
    .select({
      id: collections.id,
      slug: collections.slug,
      name: collections.name,
      nameZh: collections.nameZh,
      description: collections.description,
      descriptionZh: collections.descriptionZh,
      systemKind: collections.systemKind,
      visibility: collections.visibility,
      itemCount: itemCountExpression(),
      updatedAt: collections.updatedAt,
    })
    .from(collections)
    .where(
      and(
        eq(collections.ownerUserId, userId),
        // ne(systemKind, "installed") would also match the NULL systemKind
        // rows (user-created), which is what we want.
        sql`(${collections.systemKind} IS NULL OR ${collections.systemKind} <> 'installed')`,
      ),
    )
    .orderBy(
      // Pin 'saved' at the top, then user-created collections by most-recent.
      sql`CASE WHEN ${collections.systemKind} = 'saved' THEN 0 ELSE 1 END`,
      desc(collections.updatedAt),
    )
}

export async function listPublicPaged(params: {
  page: number
  pageSize: number
}): Promise<{ rows: PublicCollectionRow[]; total: number }> {
  const db = useDb()
  const { page, pageSize } = params
  const offset = Math.max(0, (page - 1) * pageSize)

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        slug: collections.slug,
        name: collections.name,
        nameZh: collections.nameZh,
        description: collections.description,
        descriptionZh: collections.descriptionZh,
        itemCount: itemCountExpression(),
        publishedAt: collections.publishedAt,
        ownerName: users.name,
      })
      .from(collections)
      .innerJoin(users, eq(users.id, collections.ownerUserId))
      .where(eq(collections.visibility, "public"))
      .orderBy(desc(collections.publishedAt), desc(collections.id))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(collections)
      .where(eq(collections.visibility, "public")),
  ])
  return { rows, total: totalRow[0]?.c ?? 0 }
}

export async function listItems(
  collectionId: string,
): Promise<CollectionItemRow[]> {
  // Mirrors the listSelect shape in server/repositories/extensions.ts so the
  // detail page can pass each row straight into <ExtCard :ext="…">. tagIds
  // come from a leftJoin + array_agg + GROUP BY, exactly like the browse grid.
  const db = useDb()
  return db
    .select({
      id: extensions.id,
      slug: extensions.slug,
      category: extensions.category,
      badge: extensions.badge,
      officialTier: extensions.officialTier,
      scope: extensions.scope,
      funcCat: extensions.funcCat,
      subCat: extensions.subCat,
      l2: extensions.l2,
      deptId: extensions.deptId,
      iconEmoji: extensions.iconEmoji,
      iconColor: extensions.iconColor,
      name: extensions.name,
      nameZh: extensions.nameZh,
      tagline: extensions.tagline,
      taglineZh: extensions.taglineZh,
      description: extensions.description,
      descriptionZh: extensions.descriptionZh,
      downloadsCount: extensions.downloadsCount,
      starsAvg: extensions.starsAvg,
      tagIds: sql<string[]>`coalesce(array_agg(${extensionTags.tagId}) FILTER (WHERE ${extensionTags.tagId} IS NOT NULL), '{}')`,
      addedAt: collectionItems.addedAt,
    })
    .from(collectionItems)
    .innerJoin(extensions, eq(extensions.id, collectionItems.extensionId))
    .leftJoin(extensionTags, eq(extensionTags.extensionId, extensions.id))
    .where(eq(collectionItems.collectionId, collectionId))
    .groupBy(extensions.id, collectionItems.addedAt)
    .orderBy(desc(collectionItems.addedAt))
}

// Helper used by the [slug] detail route to also surface the owner's display
// name for the "by X" line.
export async function getOwnerName(userId: string): Promise<string | null> {
  const db = useDb()
  const [row] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  return row?.name ?? null
}
