import * as extensionsRepo from "~~/server/repositories/extensions"
import * as filesRepo from "~~/server/repositories/files"
import * as versionsRepo from "~~/server/repositories/versions"

// Orchestrators over the extensions/versions/files repositories. The
// branching logic ("personal scope auto-publishes; org/enterprise waits for
// admin") still lives inline here; commit 7 extracts it into the pure
// `shared/extensions/state.ts` decision module. The Drizzle imports that
// used to live in this file moved to the repos in commit 3.

export type ScanResult =
  | { ok: true; checksum: string; scanReport: unknown }
  | { ok: false; reason: string; scanReport: unknown }

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

// Apply the bundle scan outcome. Personal-scope extensions auto-publish on
// success; org/enterprise versions land in `ready` and wait for an admin to
// call `publishVersion`.
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

  await db.transaction(async (tx) => {
    if (result.ok) {
      const isPersonal = version.scope === "personal"
      const now = isPersonal ? new Date() : null

      await filesRepo.updateScanStatus(tx, fileId, {
        scanStatus: "clean",
        scanReport: result.scanReport,
        checksumSha256: result.checksum,
      })
      await versionsRepo.updateStatus(tx, versionId, {
        status: "ready",
        publishedAt: now,
      })
      if (isPersonal && now) {
        await extensionsRepo.updateVisibility(tx, version.extensionId, {
          visibility: "published",
          publishedAt: now,
        })
      }
    } else {
      await filesRepo.updateScanStatus(tx, fileId, {
        scanStatus: "flagged",
        scanReport: result.scanReport,
      })
      await versionsRepo.updateStatus(tx, versionId, { status: "rejected" })
    }
  })
}

// Admin-driven flip from `ready` → `published`. Stamps `publishedAt` on
// both the extension and the version with the same `now` so they line up.
export async function publishVersion(
  versionId: string,
): Promise<{ extensionId: string }> {
  const db = useDb()
  const row = await versionsRepo.findById(db, versionId)
  if (!row || row.status !== "ready") {
    throw new VersionStateError("version_not_found")
  }

  const { extensionId } = row
  const now = new Date()

  await db.transaction(async (tx) => {
    await extensionsRepo.updateVisibility(tx, extensionId, {
      visibility: "published",
      publishedAt: now,
    })
    await versionsRepo.updatePublishedAt(tx, versionId, now)
  })

  return { extensionId }
}
