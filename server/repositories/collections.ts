import { and, eq } from "drizzle-orm"

import { collectionItems, collections } from "~~/shared/db/schema"

import type { Transactable } from "./types"

// `collections` + `collection_items` table accessor. The install
// orchestrator uses these to make sure every install also drops a row into
// the user's "Installed" system collection.

export type SystemKind = "installed" | "saved"

const SYSTEM_KIND_LABEL: Record<SystemKind, string> = {
  installed: "Installed",
  saved: "Saved",
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
): Promise<{ id: string }> {
  const existing = await db
    .select({ id: collections.id })
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
  await db.insert(collections).values({
    id,
    ownerUserId: userId,
    name: SYSTEM_KIND_LABEL[kind],
    systemKind: kind,
  })
  return { id }
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
