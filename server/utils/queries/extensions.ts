import { count, eq, sql } from "drizzle-orm"

import { extensions, extensionTags } from "~~/shared/db/schema"
import {
  buildExtensionOrder,
  buildExtensionWhere,
} from "~~/shared/search/query"
import {
  PAGE_SIZE,
  pageOffset,
  type Filters,
} from "~~/shared/validators/filters"

const listSelect = {
  id: extensions.id,
  slug: extensions.slug,
  category: extensions.category,
  badge: extensions.badge,
  scope: extensions.scope,
  funcCat: extensions.funcCat,
  subCat: extensions.subCat,
  l2: extensions.l2,
  deptId: extensions.deptId,
  iconEmoji: extensions.iconEmoji,
  iconColor: extensions.iconColor,
  name: extensions.name,
  nameZh: extensions.nameZh,
  description: extensions.description,
  descriptionZh: extensions.descriptionZh,
  downloadsCount: extensions.downloadsCount,
  starsAvg: extensions.starsAvg,
  tagIds: sql<string[]>`coalesce(array_agg(${extensionTags.tagId}) FILTER (WHERE ${extensionTags.tagId} IS NOT NULL), '{}')`,
}

export async function listExtensions(filters: Filters, userDeptId?: string) {
  const db = useDb()
  const where = buildExtensionWhere(db, filters, userDeptId)
  const order = buildExtensionOrder(filters.sort)

  return db
    .select(listSelect)
    .from(extensions)
    .leftJoin(extensionTags, eq(extensionTags.extensionId, extensions.id))
    .where(where)
    .groupBy(extensions.id)
    .orderBy(...order)
    .limit(PAGE_SIZE)
    .offset(pageOffset(filters.page))
}

export async function countFilteredExtensions(
  filters: Filters,
  userDeptId?: string,
) {
  const db = useDb()
  const where = buildExtensionWhere(db, filters, userDeptId)
  const [row] = await db
    .select({ count: count() })
    .from(extensions)
    .where(where)
  return Number(row?.count ?? 0)
}

export async function getFeaturedExtension() {
  const db = useDb()
  const [row] = await db
    .select(listSelect)
    .from(extensions)
    .leftJoin(extensionTags, eq(extensionTags.extensionId, extensions.id))
    .where(eq(extensions.visibility, "published"))
    .groupBy(extensions.id)
    .orderBy(sql`${extensions.downloadsCount} DESC`)
    .limit(1)
  return row ?? null
}
