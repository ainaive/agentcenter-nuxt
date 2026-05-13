import { eq } from "drizzle-orm"

import { files } from "~~/shared/db/schema"

import type { Transactable } from "./types"

// `files` table accessor. Used by the scan-bundle job (read the row to
// know where to download from) and by the scan-result orchestrator (write
// the scan outcome).

export interface FileRow {
  id: string
  extensionVersionId: string | null
  r2Key: string
  size: bigint
  checksumSha256: string
  mimeType: string | null
  scanStatus: "pending" | "clean" | "flagged"
  scanReport: unknown
  createdAt: Date
}

export async function findById(
  db: Transactable,
  id: string,
): Promise<FileRow | null> {
  const [row] = await db.select().from(files).where(eq(files.id, id)).limit(1)
  return row ?? null
}

export type ScanStatusUpdate =
  | { scanStatus: "clean"; scanReport: unknown; checksumSha256: string }
  | { scanStatus: "flagged"; scanReport: unknown }

export async function updateScanStatus(
  db: Transactable,
  fileId: string,
  payload: ScanStatusUpdate,
): Promise<void> {
  await db.update(files).set(payload).where(eq(files.id, fileId))
}
