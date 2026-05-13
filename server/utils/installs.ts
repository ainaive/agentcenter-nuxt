import { and, desc, eq, sql } from "drizzle-orm"

import * as collectionsRepo from "~~/server/repositories/collections"
import { installs } from "~~/shared/db/schema/activity"
import { collectionItems } from "~~/shared/db/schema/collection"
import { extensions, extensionVersions } from "~~/shared/db/schema/extension"

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

export async function recordInstall(params: RecordInstallParams): Promise<InstallRecord> {
  const { userId, extension, source } = params
  const db = useDb()

  const extWhere =
    "id" in extension
      ? eq(extensions.id, extension.id)
      : eq(extensions.slug, extension.slug)

  const [ext] = await db
    .select({ id: extensions.id })
    .from(extensions)
    .where(extWhere)
    .limit(1)
  if (!ext) throw new InstallError("extension_not_found")
  const extensionId = ext.id

  let version = params.version
  if (!version) {
    const [latest] = await db
      .select({ version: extensionVersions.version })
      .from(extensionVersions)
      .where(
        and(
          eq(extensionVersions.extensionId, extensionId),
          eq(extensionVersions.status, "ready"),
        ),
      )
      .orderBy(
        desc(extensionVersions.publishedAt),
        desc(extensionVersions.createdAt),
      )
      .limit(1)
    if (!latest) throw new InstallError("no_published_version")
    version = latest.version
  }

  const { id: installedColId } = await collectionsRepo.getOrCreateSystem(
    db,
    userId,
    "installed",
  )
  const installId = crypto.randomUUID()
  const resolvedVersion = version

  const isFirstInstall = await db.transaction(async (tx) => {
    const prior = await tx
      .select({ id: installs.id })
      .from(installs)
      .where(and(eq(installs.userId, userId), eq(installs.extensionId, extensionId)))
      .limit(1)
    const isFirst = prior.length === 0

    await tx.insert(installs).values({
      id: installId,
      userId,
      extensionId,
      version: resolvedVersion,
      source,
    })

    await tx
      .insert(collectionItems)
      .values({ collectionId: installedColId, extensionId })
      .onConflictDoNothing()

    await tx
      .update(extensions)
      .set({ downloadsCount: sql`${extensions.downloadsCount} + 1` })
      .where(eq(extensions.id, extensionId))

    return isFirst
  })

  return { installId, isFirstInstall, version: resolvedVersion }
}
