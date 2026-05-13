import { and, count, desc, eq, ne, sql } from "drizzle-orm"

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

import type { Transactable } from "./types"

// `extensions` table accessor. Every function takes a `Transactable` as the
// first arg so it composes with `db.transaction(tx => ...)` and with the
// PGlite-backed integration test DB.

// Listing select — used by browse list, home featured, and admin list. Keeps
// tag aggregation inlined as a Postgres `array_agg`, matching the previous
// `server/utils/queries/extensions.ts` shape so consumer code is a drop-in
// rename.
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

const detailSelect = {
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
  tagline: extensions.tagline,
  taglineZh: extensions.taglineZh,
  description: extensions.description,
  descriptionZh: extensions.descriptionZh,
  readmeMd: extensions.readmeMd,
  homepageUrl: extensions.homepageUrl,
  repoUrl: extensions.repoUrl,
  licenseSpdx: extensions.licenseSpdx,
  compatibilityJson: extensions.compatibilityJson,
  permissions: extensions.permissions,
  downloadsCount: extensions.downloadsCount,
  starsAvg: extensions.starsAvg,
  ratingsCount: extensions.ratingsCount,
  publishedAt: extensions.publishedAt,
  publisherUserId: extensions.publisherUserId,
  ownerOrgId: extensions.ownerOrgId,
  visibility: extensions.visibility,
  tagIds: sql<string[]>`coalesce(array_agg(${extensionTags.tagId}) FILTER (WHERE ${extensionTags.tagId} IS NOT NULL), '{}')`,
}

const relatedSelect = {
  id: extensions.id,
  slug: extensions.slug,
  name: extensions.name,
  nameZh: extensions.nameZh,
  iconEmoji: extensions.iconEmoji,
  iconColor: extensions.iconColor,
  downloadsCount: extensions.downloadsCount,
}

export async function findManyForList(
  db: Transactable,
  filters: Filters,
  userDeptId?: string,
) {
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

export async function countFiltered(
  db: Transactable,
  filters: Filters,
  userDeptId?: string,
): Promise<number> {
  const where = buildExtensionWhere(db, filters, userDeptId)
  const [row] = await db
    .select({ count: count() })
    .from(extensions)
    .where(where)
  return Number(row?.count ?? 0)
}

export async function findFeatured(db: Transactable) {
  const [row] = await db
    .select(listSelect)
    .from(extensions)
    .leftJoin(extensionTags, eq(extensionTags.extensionId, extensions.id))
    .where(eq(extensions.visibility, "published"))
    .groupBy(extensions.id)
    .orderBy(desc(extensions.downloadsCount))
    .limit(1)
  return row ?? null
}

export async function findRelated(
  db: Transactable,
  extensionId: string,
  category: "skills" | "mcp" | "slash" | "plugins",
) {
  return db
    .select(relatedSelect)
    .from(extensions)
    .where(
      and(
        eq(extensions.category, category),
        eq(extensions.visibility, "published"),
        ne(extensions.id, extensionId),
      ),
    )
    .orderBy(desc(extensions.downloadsCount))
    .limit(4)
}

export async function findBySlug(
  db: Transactable,
  slug: string,
  opts: { onlyPublished?: boolean } = {},
) {
  const onlyPublished = opts.onlyPublished ?? true
  const where = onlyPublished
    ? and(eq(extensions.slug, slug), eq(extensions.visibility, "published"))
    : eq(extensions.slug, slug)

  const [row] = await db
    .select(detailSelect)
    .from(extensions)
    .leftJoin(extensionTags, eq(extensionTags.extensionId, extensions.id))
    .where(where)
    .groupBy(extensions.id)
  return row ?? null
}

export async function findById(db: Transactable, id: string) {
  const [row] = await db
    .select(detailSelect)
    .from(extensions)
    .leftJoin(extensionTags, eq(extensionTags.extensionId, extensions.id))
    .where(eq(extensions.id, id))
    .groupBy(extensions.id)
  return row ?? null
}

export interface VisibilityUpdate {
  visibility: "draft" | "published" | "archived"
  publishedAt: Date | null
}

export async function updateVisibility(
  db: Transactable,
  id: string,
  payload: VisibilityUpdate,
): Promise<void> {
  await db.update(extensions).set(payload).where(eq(extensions.id, id))
}

export async function incrementDownloads(
  db: Transactable,
  id: string,
): Promise<void> {
  await db
    .update(extensions)
    .set({ downloadsCount: sql`${extensions.downloadsCount} + 1` })
    .where(eq(extensions.id, id))
}
