import { and, desc, eq, isNull, sql } from "drizzle-orm"

import { useDb } from "~~/server/utils/db"
import { installs, ratings } from "~~/shared/db/schema/activity"
import { collectionItems, collections } from "~~/shared/db/schema/collection"
import { extensionVersions, extensions } from "~~/shared/db/schema/extension"

export interface ProfileInstalledRow {
  extensionId: string
  slug: string
  name: string
  category: string
  iconColor: string | null
  installedVersion: string
  installedAt: Date
}

export interface ProfileSavedRow {
  extensionId: string
  slug: string
  name: string
  category: string
  iconColor: string | null
  savedAt: Date
}

export interface ProfileDraftRow {
  extensionId: string
  slug: string
  name: string
  category: string
  iconColor: string | null
  updatedAt: Date
  latestStatus: string | null
}

export interface ProfilePublishedRow {
  extensionId: string
  slug: string
  name: string
  category: string
  iconColor: string | null
  latestVersion: string | null
  downloadsCount: number
  starsAvg: string
  ratingsCount: number
}

export type ProfileActivityEvent =
  | { kind: "installed"; at: Date; extensionId: string; slug: string; name: string; version: string }
  | { kind: "published"; at: Date; extensionId: string; slug: string; name: string; version: string }
  | { kind: "rated"; at: Date; extensionId: string; slug: string; name: string; stars: number }

export interface ProfileStats {
  installedCount: number
  publishedCount: number
  totalInstallsOfMine: number
  avgRatingOfMine: number | null
}

const ACTIVITY_LIMIT = 20

export async function getInstalledForUser(userId: string): Promise<ProfileInstalledRow[]> {
  // Active installs only — uninstalledAt IS NULL.
  const db = useDb()
  return db
    .select({
      extensionId: extensions.id,
      slug: extensions.slug,
      name: extensions.name,
      category: extensions.category,
      iconColor: extensions.iconColor,
      installedVersion: installs.version,
      installedAt: installs.installedAt,
    })
    .from(installs)
    .innerJoin(extensions, eq(extensions.id, installs.extensionId))
    .where(and(eq(installs.userId, userId), isNull(installs.uninstalledAt)))
    .orderBy(desc(installs.installedAt))
}

export async function getSavedForUser(userId: string): Promise<ProfileSavedRow[]> {
  const db = useDb()
  return db
    .select({
      extensionId: extensions.id,
      slug: extensions.slug,
      name: extensions.name,
      category: extensions.category,
      iconColor: extensions.iconColor,
      savedAt: collectionItems.addedAt,
    })
    .from(collectionItems)
    .innerJoin(
      collections,
      and(
        eq(collections.id, collectionItems.collectionId),
        eq(collections.ownerUserId, userId),
        eq(collections.systemKind, "saved"),
      ),
    )
    .innerJoin(extensions, eq(extensions.id, collectionItems.extensionId))
    .orderBy(desc(collectionItems.addedAt))
}

export async function getDraftsForUser(userId: string): Promise<ProfileDraftRow[]> {
  const db = useDb()
  const rows = await db
    .select({
      extensionId: extensions.id,
      slug: extensions.slug,
      name: extensions.name,
      category: extensions.category,
      iconColor: extensions.iconColor,
      updatedAt: extensions.updatedAt,
      latestStatus: extensionVersions.status,
    })
    .from(extensions)
    .leftJoin(extensionVersions, eq(extensionVersions.extensionId, extensions.id))
    .where(and(eq(extensions.publisherUserId, userId), eq(extensions.visibility, "draft")))
    .orderBy(desc(extensions.updatedAt), desc(extensionVersions.createdAt))

  const seen = new Set<string>()
  const out: ProfileDraftRow[] = []
  for (const r of rows) {
    if (seen.has(r.extensionId)) continue
    seen.add(r.extensionId)
    out.push(r)
  }
  return out
}

export async function getPublishedForUser(userId: string): Promise<ProfilePublishedRow[]> {
  // Latest published version per extension. Drizzle doesn't expose DISTINCT
  // ON cleanly, so we ORDER BY publishedAt desc and collapse duplicates
  // client-side.
  const db = useDb()
  const rows = await db
    .select({
      extensionId: extensions.id,
      slug: extensions.slug,
      name: extensions.name,
      category: extensions.category,
      iconColor: extensions.iconColor,
      latestVersion: extensionVersions.version,
      downloadsCount: extensions.downloadsCount,
      starsAvg: extensions.starsAvg,
      ratingsCount: extensions.ratingsCount,
    })
    .from(extensions)
    .leftJoin(
      extensionVersions,
      and(eq(extensionVersions.extensionId, extensions.id), eq(extensionVersions.status, "ready")),
    )
    .where(and(eq(extensions.publisherUserId, userId), eq(extensions.visibility, "published")))
    .orderBy(desc(extensions.publishedAt), desc(extensionVersions.publishedAt))

  const seen = new Set<string>()
  const out: ProfilePublishedRow[] = []
  for (const r of rows) {
    if (seen.has(r.extensionId)) continue
    seen.add(r.extensionId)
    out.push(r)
  }
  return out
}

export async function getActivityForUser(userId: string): Promise<ProfileActivityEvent[]> {
  // Activity is a union of three event sources (installs, my published
  // versions, my ratings). No dedicated activity_log table yet — merge
  // in memory rather than a heavyweight UNION ALL.
  const db = useDb()
  const [installRows, pubRows, ratingRows] = await Promise.all([
    db
      .select({
        at: installs.installedAt,
        extensionId: extensions.id,
        slug: extensions.slug,
        name: extensions.name,
        version: installs.version,
      })
      .from(installs)
      .innerJoin(extensions, eq(extensions.id, installs.extensionId))
      .where(eq(installs.userId, userId))
      .orderBy(desc(installs.installedAt))
      .limit(ACTIVITY_LIMIT),
    db
      .select({
        at: extensionVersions.publishedAt,
        extensionId: extensions.id,
        slug: extensions.slug,
        name: extensions.name,
        version: extensionVersions.version,
      })
      .from(extensionVersions)
      .innerJoin(extensions, eq(extensions.id, extensionVersions.extensionId))
      // `status = ready` alone isn't enough: a ready version on a still-
      // draft extension hasn't been published publicly yet.
      .where(
        and(
          eq(extensions.publisherUserId, userId),
          eq(extensions.visibility, "published"),
          eq(extensionVersions.status, "ready"),
        ),
      )
      .orderBy(desc(extensionVersions.publishedAt))
      .limit(ACTIVITY_LIMIT),
    db
      .select({
        at: ratings.createdAt,
        extensionId: extensions.id,
        slug: extensions.slug,
        name: extensions.name,
        stars: ratings.stars,
      })
      .from(ratings)
      .innerJoin(extensions, eq(extensions.id, ratings.extensionId))
      .where(eq(ratings.userId, userId))
      .orderBy(desc(ratings.createdAt))
      .limit(ACTIVITY_LIMIT),
  ])

  const merged: ProfileActivityEvent[] = [
    ...installRows
      .filter((r): r is typeof r & { at: Date } => r.at != null)
      .map((r): ProfileActivityEvent => ({
        kind: "installed",
        at: r.at,
        extensionId: r.extensionId,
        slug: r.slug,
        name: r.name,
        version: r.version,
      })),
    ...pubRows
      .filter((r): r is typeof r & { at: Date } => r.at != null)
      .map((r): ProfileActivityEvent => ({
        kind: "published",
        at: r.at,
        extensionId: r.extensionId,
        slug: r.slug,
        name: r.name,
        version: r.version,
      })),
    ...ratingRows
      .filter((r): r is typeof r & { at: Date } => r.at != null)
      .map((r): ProfileActivityEvent => ({
        kind: "rated",
        at: r.at,
        extensionId: r.extensionId,
        slug: r.slug,
        name: r.name,
        stars: r.stars,
      })),
  ]

  merged.sort((a, b) => b.at.getTime() - a.at.getTime())
  return merged.slice(0, ACTIVITY_LIMIT)
}

export async function getProfileStats(userId: string): Promise<ProfileStats> {
  // Two small aggregates, run in parallel.
  const db = useDb()
  const [installedAgg, pubAgg] = await Promise.all([
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(installs)
      .where(and(eq(installs.userId, userId), isNull(installs.uninstalledAt))),
    db
      .select({
        count: sql<number>`count(*)::int`,
        totalInstalls: sql<number>`coalesce(sum(${extensions.downloadsCount}),0)::int`,
        // Weighted average — an extension with 100 ratings counts 100× more
        // than one with a single rating. Null when no rated extensions exist.
        weightedStars: sql<string | null>`case when sum(${extensions.ratingsCount}) = 0 then null else sum(${extensions.starsAvg}::numeric * ${extensions.ratingsCount})::numeric / sum(${extensions.ratingsCount}) end`,
      })
      .from(extensions)
      .where(and(eq(extensions.publisherUserId, userId), eq(extensions.visibility, "published"))),
  ])

  const pub = pubAgg[0] ?? { count: 0, totalInstalls: 0, weightedStars: null }
  return {
    installedCount: installedAgg[0]?.c ?? 0,
    publishedCount: pub.count,
    totalInstallsOfMine: pub.totalInstalls,
    avgRatingOfMine: pub.weightedStars != null ? Number(pub.weightedStars) : null,
  }
}
