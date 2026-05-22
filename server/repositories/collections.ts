import { and, eq, inArray, isNull, sql } from "drizzle-orm"

import { generateUniqueShortcode } from "~~/server/utils/collections/shortcode"
import { collectionItems, collections } from "~~/shared/db/schema"
import type {
  CollectionVisibility,
  CreateCollectionInput,
  UpdateCollectionInput,
} from "~~/shared/validators/collection"

import type { Transactable } from "./types"

// `collections` + `collection_items` table accessor. The install
// orchestrator uses these to make sure every install also drops a row into
// the user's "Installed" system collection; the user-facing collections
// feature reuses the same primitives.

export type SystemKind = "installed" | "saved"

const SYSTEM_KIND_LABEL: Record<SystemKind, string> = {
  installed: "Installed",
  saved: "Saved",
}

export type CollectionErrorCode =
  | "not_found"
  | "forbidden"
  | "system_collection_locked"

export class CollectionError extends Error {
  readonly code: CollectionErrorCode
  constructor(code: CollectionErrorCode) {
    super(code)
    this.code = code
    this.name = "CollectionError"
  }
}

// Look up (or create) the per-user system collection of the given kind.
// Idempotent: safe to call concurrently — the worst case is two rows of
// the same kind for the same user, which the install flow then both
// `addItem`s into without breakage. If that race ever shows up in prod,
// add a partial unique index on (owner_user_id, system_kind).
export async function getOrCreateSystem(
  db: Transactable,
  userId: string,
  kind: SystemKind,
): Promise<{ id: string; slug: string }> {
  const existing = await db
    .select({ id: collections.id, slug: collections.slug })
    .from(collections)
    .where(
      and(
        eq(collections.ownerUserId, userId),
        eq(collections.systemKind, kind),
      ),
    )
    .limit(1)
  if (existing[0]) return existing[0]

  const id = crypto.randomUUID()
  const slug = await generateUniqueShortcode(db)
  await db.insert(collections).values({
    id,
    slug,
    ownerUserId: userId,
    name: SYSTEM_KIND_LABEL[kind],
    systemKind: kind,
  })
  return { id, slug }
}

export async function addItem(
  db: Transactable,
  collectionId: string,
  extensionId: string,
): Promise<void> {
  await db
    .insert(collectionItems)
    .values({ collectionId, extensionId })
    .onConflictDoNothing()
}

// User-facing CRUD below — used by the /api/internal/collections routes.

export interface CollectionRow {
  id: string
  slug: string
  ownerUserId: string
  name: string
  nameZh: string | null
  description: string | null
  descriptionZh: string | null
  systemKind: SystemKind | null
  visibility: CollectionVisibility
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

const fullSelect = {
  id: collections.id,
  slug: collections.slug,
  ownerUserId: collections.ownerUserId,
  name: collections.name,
  nameZh: collections.nameZh,
  description: collections.description,
  descriptionZh: collections.descriptionZh,
  systemKind: collections.systemKind,
  visibility: collections.visibility,
  publishedAt: collections.publishedAt,
  createdAt: collections.createdAt,
  updatedAt: collections.updatedAt,
}

export async function findById(
  db: Transactable,
  id: string,
): Promise<CollectionRow | null> {
  const [row] = await db
    .select(fullSelect)
    .from(collections)
    .where(eq(collections.id, id))
    .limit(1)
  return row ?? null
}

export async function findBySlug(
  db: Transactable,
  slug: string,
): Promise<CollectionRow | null> {
  const [row] = await db
    .select(fullSelect)
    .from(collections)
    .where(eq(collections.slug, slug))
    .limit(1)
  return row ?? null
}

export async function findByIdsForUser(
  db: Transactable,
  collectionIds: string[],
  userId: string,
): Promise<string[]> {
  // Returns the subset that belongs to the given user — used by the
  // for-extension membership query so we never leak another user's
  // collection ids back to the client.
  if (collectionIds.length === 0) return []
  const rows = await db
    .select({ id: collections.id })
    .from(collections)
    .where(
      and(
        inArray(collections.id, collectionIds),
        eq(collections.ownerUserId, userId),
      ),
    )
  return rows.map((r) => r.id)
}

export async function create(
  db: Transactable,
  params: { ownerUserId: string; input: CreateCollectionInput },
): Promise<CollectionRow> {
  const { ownerUserId, input } = params
  const id = crypto.randomUUID()
  const slug = await generateUniqueShortcode(db)
  const visibility = input.visibility ?? "private"
  const now = new Date()
  await db.insert(collections).values({
    id,
    slug,
    ownerUserId,
    name: input.name,
    nameZh: input.nameZh ?? null,
    description: input.description ?? null,
    descriptionZh: input.descriptionZh ?? null,
    visibility,
    publishedAt: visibility === "public" ? now : null,
    createdAt: now,
    updatedAt: now,
  })
  const created = await findById(db, id)
  if (!created) throw new Error("collection insert vanished")
  return created
}

export async function update(
  db: Transactable,
  params: {
    slug: string
    ownerUserId: string
    input: UpdateCollectionInput
  },
): Promise<CollectionRow> {
  const existing = await findBySlug(db, params.slug)
  if (!existing) throw new CollectionError("not_found")
  if (existing.ownerUserId !== params.ownerUserId) {
    throw new CollectionError("forbidden")
  }
  if (existing.systemKind !== null) {
    throw new CollectionError("system_collection_locked")
  }

  const patch: Partial<typeof collections.$inferInsert> = { updatedAt: new Date() }
  const { input } = params
  if (input.name !== undefined) patch.name = input.name
  if (input.nameZh !== undefined) patch.nameZh = input.nameZh ?? null
  if (input.description !== undefined) {
    patch.description = input.description ?? null
  }
  if (input.descriptionZh !== undefined) {
    patch.descriptionZh = input.descriptionZh ?? null
  }
  if (input.visibility !== undefined) {
    patch.visibility = input.visibility
    // Stamp publishedAt on the first private→public transition. Don't clear
    // it on a flip back; "ever-published" sort order stays stable.
    if (input.visibility === "public" && existing.publishedAt === null) {
      patch.publishedAt = new Date()
    }
  }

  await db.update(collections).set(patch).where(eq(collections.id, existing.id))
  const after = await findById(db, existing.id)
  if (!after) throw new Error("collection vanished mid-update")
  return after
}

export async function remove(
  db: Transactable,
  params: { slug: string; ownerUserId: string },
): Promise<void> {
  const existing = await findBySlug(db, params.slug)
  if (!existing) throw new CollectionError("not_found")
  if (existing.ownerUserId !== params.ownerUserId) {
    throw new CollectionError("forbidden")
  }
  if (existing.systemKind !== null) {
    throw new CollectionError("system_collection_locked")
  }
  await db.delete(collections).where(eq(collections.id, existing.id))
}

export async function addItemBySlug(
  db: Transactable,
  params: { slug: string; ownerUserId: string; extensionId: string },
): Promise<void> {
  const existing = await findBySlug(db, params.slug)
  if (!existing) throw new CollectionError("not_found")
  if (existing.ownerUserId !== params.ownerUserId) {
    throw new CollectionError("forbidden")
  }
  await db
    .insert(collectionItems)
    .values({ collectionId: existing.id, extensionId: params.extensionId })
    .onConflictDoNothing()
  await db
    .update(collections)
    .set({ updatedAt: new Date() })
    .where(eq(collections.id, existing.id))
}

export async function removeItemBySlug(
  db: Transactable,
  params: { slug: string; ownerUserId: string; extensionId: string },
): Promise<void> {
  const existing = await findBySlug(db, params.slug)
  if (!existing) throw new CollectionError("not_found")
  if (existing.ownerUserId !== params.ownerUserId) {
    throw new CollectionError("forbidden")
  }
  await db
    .delete(collectionItems)
    .where(
      and(
        eq(collectionItems.collectionId, existing.id),
        eq(collectionItems.extensionId, params.extensionId),
      ),
    )
  await db
    .update(collections)
    .set({ updatedAt: new Date() })
    .where(eq(collections.id, existing.id))
}

// Membership lookup for the save-to-collection popover — returns the ids of
// the user's collections that already contain the given extension.
export async function membershipForExtension(
  db: Transactable,
  params: { userId: string; extensionId: string },
): Promise<string[]> {
  const rows = await db
    .select({ id: collections.id })
    .from(collectionItems)
    .innerJoin(collections, eq(collections.id, collectionItems.collectionId))
    .where(
      and(
        eq(collections.ownerUserId, params.userId),
        eq(collectionItems.extensionId, params.extensionId),
      ),
    )
  return rows.map((r) => r.id)
}

// Filter helper used by callers that want to exclude system kinds in queries.
export function systemKindIsNull() {
  return isNull(collections.systemKind)
}

// Item count subquery factory — kept here so the queries layer doesn't have
// to know schema details.
export function itemCountExpression() {
  return sql<number>`(SELECT count(*)::int FROM ${collectionItems} WHERE ${collectionItems.collectionId} = ${collections.id})`
}
