import { and, desc, eq, inArray } from "drizzle-orm"

import { useDb } from "~~/server/utils/db"
import { extensionVersions, extensions } from "~~/shared/db/schema/extension"
import type { PublishReviewRow } from "~~/shared/types"

// Extensions awaiting a super-admin publish decision: scanned to `ready` but
// still `draft`, and org/enterprise scope (personal auto-publishes during the
// scan — see reindex-search `reindexPublish`). Deduped to the latest ready
// version per extension. Mirrors `getDraftsForUser` in queries/profile.ts.
export async function listPublishReviewQueue(): Promise<PublishReviewRow[]> {
  const db = useDb()
  const rows = await db
    .select({
      extensionId: extensions.id,
      slug: extensions.slug,
      name: extensions.name,
      category: extensions.category,
      scope: extensions.scope,
      publisherUserId: extensions.publisherUserId,
      versionId: extensionVersions.id,
      version: extensionVersions.version,
      createdAt: extensionVersions.createdAt,
    })
    .from(extensions)
    .innerJoin(
      extensionVersions,
      eq(extensionVersions.extensionId, extensions.id),
    )
    .where(
      and(
        eq(extensions.visibility, "draft"),
        inArray(extensions.scope, ["org", "enterprise"]),
        eq(extensionVersions.status, "ready"),
      ),
    )
    .orderBy(desc(extensionVersions.createdAt))

  const seen = new Set<string>()
  const out: PublishReviewRow[] = []
  for (const r of rows) {
    if (seen.has(r.extensionId)) continue
    seen.add(r.extensionId)
    out.push({ ...r, createdAt: r.createdAt.toISOString() })
  }
  return out
}
