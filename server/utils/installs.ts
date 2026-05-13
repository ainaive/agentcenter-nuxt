import * as collectionsRepo from "~~/server/repositories/collections"
import * as extensionsRepo from "~~/server/repositories/extensions"
import * as installsRepo from "~~/server/repositories/installs"
import * as versionsRepo from "~~/server/repositories/versions"
import { pickInstallVersion } from "~~/shared/installs/record"

import { useDb } from "./db"

// Orchestrator over the installs/collections/extensions/versions repos. The
// "which version to install" decision is still inline here; commit 8
// extracts it into the pure `shared/installs/record.ts` decision module.

export type ExtensionRef = { id: string } | { slug: string }
export type InstallSource = "web" | "cli"
export type InstallErrorCode = "extension_not_found" | "no_published_version"

export class InstallError extends Error {
  readonly code: InstallErrorCode
  constructor(code: InstallErrorCode) {
    super(code)
    this.code = code
    this.name = "InstallError"
  }
}

export interface RecordInstallParams {
  userId: string
  extension: ExtensionRef
  source: InstallSource
  version?: string | undefined
}

export interface InstallRecord {
  installId: string
  isFirstInstall: boolean
  version: string
}

export async function recordInstall(
  params: RecordInstallParams,
): Promise<InstallRecord> {
  const { userId, extension, source } = params
  const db = useDb()

  // Resolve the extension. `findBySlug` is `onlyPublished: true` by default,
  // which would hide drafts — the install flow is only allowed against
  // published extensions anyway, so the default is what we want.
  const ext =
    "id" in extension
      ? await extensionsRepo.findById(db, extension.id)
      : await extensionsRepo.findBySlug(db, extension.slug)
  if (!ext) throw new InstallError("extension_not_found")
  const extensionId = ext.id

  // Resolve which version to install. The orchestrator only loads the
  // candidate list when it's actually needed (`requested` is undefined).
  const candidates = params.version
    ? []
    : await versionsRepo.listLatestReadyForExtension(db, extensionId)
  const pick = pickInstallVersion({ requested: params.version, candidates })
  if (!pick.ok) throw new InstallError(pick.error)
  const version = pick.version

  const { id: installedColId } = await collectionsRepo.getOrCreateSystem(
    db,
    userId,
    "installed",
  )
  const installId = crypto.randomUUID()
  const resolvedVersion = version

  const isFirstInstall = await db.transaction(async (tx) => {
    const prior = await installsRepo.findByUserAndExtension(
      tx,
      userId,
      extensionId,
    )
    const isFirst = prior === null

    await installsRepo.insertInstall(tx, {
      id: installId,
      userId,
      extensionId,
      version: resolvedVersion,
      source,
    })
    await collectionsRepo.addItem(tx, installedColId, extensionId)
    await extensionsRepo.incrementDownloads(tx, extensionId)

    return isFirst
  })

  return { installId, isFirstInstall, version: resolvedVersion }
}
