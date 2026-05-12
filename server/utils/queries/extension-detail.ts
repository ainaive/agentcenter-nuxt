import { and, eq, ne, sql } from "drizzle-orm"
import {
  extensions,
  extensionTags,
  extensionVersions,
} from "~~/shared/db/schema"

export async function getExtensionBySlug(slug: string) {
  const db = useDb()
  const [row] = await db
    .select({
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
      tagIds: sql<string[]>`coalesce(array_agg(${extensionTags.tagId}) FILTER (WHERE ${extensionTags.tagId} IS NOT NULL), '{}')`,
    })
    .from(extensions)
    .leftJoin(extensionTags, eq(extensionTags.extensionId, extensions.id))
    .where(
      and(eq(extensions.slug, slug), eq(extensions.visibility, "published")),
    )
    .groupBy(extensions.id)
  return row ?? null
}

export async function getRelatedExtensions(
  extensionId: string,
  category: "skills" | "mcp" | "slash" | "plugins",
) {
  const db = useDb()
  return db
    .select({
      id: extensions.id,
      slug: extensions.slug,
      name: extensions.name,
      nameZh: extensions.nameZh,
      iconEmoji: extensions.iconEmoji,
      iconColor: extensions.iconColor,
      downloadsCount: extensions.downloadsCount,
    })
    .from(extensions)
    .where(
      and(
        eq(extensions.category, category),
        eq(extensions.visibility, "published"),
        ne(extensions.id, extensionId),
      ),
    )
    .orderBy(sql`${extensions.downloadsCount} DESC`)
    .limit(4)
}

export async function listExtensionVersions(extensionId: string) {
  const db = useDb()
  return db
    .select({
      id: extensionVersions.id,
      version: extensionVersions.version,
      changelog: extensionVersions.changelog,
      status: extensionVersions.status,
      publishedAt: extensionVersions.publishedAt,
    })
    .from(extensionVersions)
    .where(eq(extensionVersions.extensionId, extensionId))
    .orderBy(sql`${extensionVersions.publishedAt} DESC NULLS LAST`)
}
