import { count, desc, eq, sql } from "drizzle-orm"

import { useDb } from "~~/server/utils/db"
import { users } from "~~/shared/db/schema/auth"
import { extensions, extensionTags, tags } from "~~/shared/db/schema/extension"
import { organizations } from "~~/shared/db/schema/org"
import type { CreatorFacet, PublisherFacet, TagFacet } from "~~/shared/types"

export type { CreatorFacet, PublisherFacet, TagFacet }

export async function listPublishedCreators(): Promise<CreatorFacet[]> {
  const db = useDb()
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      count: count(extensions.id),
    })
    .from(extensions)
    .innerJoin(users, eq(users.id, extensions.publisherUserId))
    .where(eq(extensions.visibility, "published"))
    .groupBy(users.id)
    .orderBy(desc(count(extensions.id)), users.email)
}

export async function listPublishedPublishers(): Promise<PublisherFacet[]> {
  const db = useDb()
  return db
    .select({
      id: organizations.id,
      name: organizations.name,
      nameZh: organizations.nameZh,
      slug: organizations.slug,
      count: count(extensions.id),
    })
    .from(extensions)
    .innerJoin(organizations, eq(organizations.id, extensions.ownerOrgId))
    .where(eq(extensions.visibility, "published"))
    .groupBy(organizations.id)
    .orderBy(desc(count(extensions.id)), organizations.name)
}

export async function listTagsWithCounts(): Promise<TagFacet[]> {
  const db = useDb()
  const rows = await db
    .select({
      id: tags.id,
      labelEn: tags.labelEn,
      labelZh: tags.labelZh,
      count: sql<number>`count(${extensionTags.extensionId})::int`,
    })
    .from(tags)
    .leftJoin(extensionTags, eq(extensionTags.tagId, tags.id))
    .leftJoin(extensions, eq(extensions.id, extensionTags.extensionId))
    .where(
      sql`${extensions.id} IS NULL OR ${extensions.visibility} = 'published'`,
    )
    .groupBy(tags.id)
    .orderBy(desc(sql`count(${extensionTags.extensionId})`))

  // Drop tags with zero usage from the picker.
  return rows.filter((r) => r.count > 0)
}
