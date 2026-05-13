import * as extensionsRepo from "~~/server/repositories/extensions"
import * as filesRepo from "~~/server/repositories/files"
import * as versionsRepo from "~~/server/repositories/versions"
import {
  decidePublishOutcome,
  decideScanOutcome,
  type ScanResult,
} from "~~/shared/extensions/state"

import { useDb } from "./db"

// Orchestrators over the extensions/versions/files repositories. The
// branching ("personal scope auto-publishes; org/enterprise waits for
// admin") lives in `shared/extensions/state.ts` as pure decision
// functions; this file just loads rows, opens transactions, and applies
// the decision via the repos.

export type { ScanResult }

export class VersionStateError extends Error {
  readonly code: "version_not_found"
  constructor(code: "version_not_found") {
    super(code)
    this.code = code
    this.name = "VersionStateError"
  }
}

// Move a version from `pending|scanning` → `scanning`. Idempotent for those
// two start states so a queue retry doesn't get stuck.
export async function submit(versionId: string): Promise<void> {
  const db = useDb()
  const { updated } = await versionsRepo.updateStatusGuarded(db, versionId, {
    from: ["pending", "scanning"],
    to: "scanning",
  })
  if (!updated) throw new VersionStateError("version_not_found")
}

// Apply the bundle scan outcome via `decideScanOutcome`.
export async function recordScanResult(
  versionId: string,
  fileId: string,
  result: ScanResult,
): Promise<void> {
  const db = useDb()
  const version = await versionsRepo.findByIdWithScope(db, versionId)
  if (!version || version.status !== "scanning") {
    throw new VersionStateError("version_not_found")
  }

  const decision = decideScanOutcome({
    scope: version.scope,
    result,
    now: new Date(),
  })

  await db.transaction(async (tx) => {
    await filesRepo.updateScanStatus(tx, fileId, decision.file)
    await versionsRepo.updateStatus(tx, versionId, decision.version)
    if (decision.extension) {
      await extensionsRepo.updateVisibility(
        tx,
        version.extensionId,
        decision.extension,
      )
    }
  })
}

// Admin-driven flip from `ready` → `published`. Stamps `publishedAt` on
// both rows with the same `now` via `decidePublishOutcome`.
export async function publishVersion(
  versionId: string,
): Promise<{ extensionId: string }> {
  const db = useDb()
  const row = await versionsRepo.findById(db, versionId)
  if (!row || row.status !== "ready") {
    throw new VersionStateError("version_not_found")
  }

  const decision = decidePublishOutcome(new Date())

  await db.transaction(async (tx) => {
    await extensionsRepo.updateVisibility(
      tx,
      row.extensionId,
      decision.extension,
    )
    await versionsRepo.updatePublishedAt(
      tx,
      versionId,
      decision.version.publishedAt,
    )
  })

  return { extensionId: row.extensionId }
}
