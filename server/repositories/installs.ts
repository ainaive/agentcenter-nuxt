import { and, eq } from "drizzle-orm"

import { installs } from "~~/shared/db/schema"

import type { Transactable } from "./types"

// `installs` table accessor. Used by the install orchestrator to detect
// first-time installs (so the caller can fire a different downstream event)
// and to record each install with its source (web vs cli).

export interface InsertInstallRow {
  id: string
  userId: string
  extensionId: string
  version: string
  source: "web" | "cli"
}

export async function findByUserAndExtension(
  db: Transactable,
  userId: string,
  extensionId: string,
): Promise<{ id: string } | null> {
  const [row] = await db
    .select({ id: installs.id })
    .from(installs)
    .where(and(eq(installs.userId, userId), eq(installs.extensionId, extensionId)))
    .limit(1)
  return row ?? null
}

export async function insertInstall(
  db: Transactable,
  row: InsertInstallRow,
): Promise<void> {
  await db.insert(installs).values(row)
}
