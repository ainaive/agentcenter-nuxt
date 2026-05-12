import { and, eq, inArray } from "drizzle-orm"
import { extensions, extensionVersions, files } from "~~/shared/db/schema"

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

export async function submit(versionId: string): Promise<void> {
  const db = useDb()
  const updated = await db
    .update(extensionVersions)
    .set({ status: "scanning" })
    .where(
      and(
        eq(extensionVersions.id, versionId),
        inArray(extensionVersions.status, ["pending", "scanning"]),
      ),
    )
    .returning({ id: extensionVersions.id })
  if (updated.length === 0) throw new VersionStateError("version_not_found")
}

export async function recordScanResult(
  versionId: string,
  fileId: string,
  result: ScanResult,
): Promise<void> {
  const db = useDb()
  const [version] = await db
    .select({
      status: extensionVersions.status,
      extensionId: extensionVersions.extensionId,
      scope: extensions.scope,
    })
    .from(extensionVersions)
    .innerJoin(extensions, eq(extensions.id, extensionVersions.extensionId))
    .where(eq(extensionVersions.id, versionId))
    .limit(1)
  if (!version || version.status !== "scanning") {
    throw new VersionStateError("version_not_found")
  }

  await db.transaction(async (tx) => {
    if (result.ok) {
      const isPersonal = version.scope === "personal"
      const now = isPersonal ? new Date() : null

      await tx
        .update(files)
        .set({
          scanStatus: "clean",
          scanReport: result.scanReport,
          checksumSha256: result.checksum,
        })
        .where(eq(files.id, fileId))
      await tx
        .update(extensionVersions)
        .set(
          isPersonal
            ? { status: "ready", publishedAt: now }
            : { status: "ready" },
        )
        .where(eq(extensionVersions.id, versionId))
      if (isPersonal) {
        await tx
          .update(extensions)
          .set({ visibility: "published", publishedAt: now })
          .where(eq(extensions.id, version.extensionId))
      }
    } else {
      await tx
        .update(files)
        .set({ scanStatus: "flagged", scanReport: result.scanReport })
        .where(eq(files.id, fileId))
      await tx
        .update(extensionVersions)
        .set({ status: "rejected" })
        .where(eq(extensionVersions.id, versionId))
    }
  })
}

export async function publishVersion(versionId: string): Promise<{ extensionId: string }> {
  const db = useDb()
  const [row] = await db
    .select({
      extensionId: extensionVersions.extensionId,
      status: extensionVersions.status,
    })
    .from(extensionVersions)
    .where(eq(extensionVersions.id, versionId))
    .limit(1)

  if (!row || row.status !== "ready") {
    throw new VersionStateError("version_not_found")
  }

  const { extensionId } = row
  const now = new Date()

  await db.transaction(async (tx) => {
    await tx
      .update(extensions)
      .set({ visibility: "published", publishedAt: now })
      .where(eq(extensions.id, extensionId))
    await tx
      .update(extensionVersions)
      .set({ publishedAt: now })
      .where(eq(extensionVersions.id, versionId))
  })

  return { extensionId }
}
