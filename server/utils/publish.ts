import { and, desc, eq } from "drizzle-orm"
import {
  extensions,
  extensionVersions,
  extensionTags,
  files,
} from "~~/shared/db/schema"
import {
  ManifestFormSchema,
  type ManifestFormValues,
} from "~~/shared/validators/manifest"
import { submit, VersionStateError } from "~~/server/utils/extensions-state"

const DEFAULT_ORG_ID = "default"

function emptyToNull(v: string | undefined | null): string | null {
  return v == null || v === "" ? null : v
}

function defaultClassification(category: ManifestFormValues["category"]): {
  funcCat: "tools" | "workTask" | "business"
  subCat: string
} {
  switch (category) {
    case "mcp":
      return { funcCat: "tools", subCat: "integrations" }
    case "slash":
      return { funcCat: "tools", subCat: "commands" }
    default:
      return { funcCat: "tools", subCat: "general" }
  }
}

export type CreateDraftResult =
  | { ok: true; extensionId: string; versionId: string }
  | { ok: false; error: string; detail?: string }

export async function createDraftExtension(
  userId: string,
  raw: ManifestFormValues,
): Promise<CreateDraftResult> {
  const parsed = ManifestFormSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      detail: parsed.error.issues.map((i) => i.message).join("; "),
    }
  }
  const data = parsed.data
  const cls = defaultClassification(data.category)
  const extensionId = crypto.randomUUID()
  const versionId = crypto.randomUUID()
  const db = useDb()

  try {
    await db.transaction(async (tx) => {
      await tx.insert(extensions).values({
        id: extensionId,
        slug: data.slug,
        name: data.name,
        nameZh: emptyToNull(data.nameZh),
        tagline: data.summary,
        taglineZh: emptyToNull(data.taglineZh),
        category: data.category,
        scope: data.scope,
        funcCat: cls.funcCat,
        subCat: cls.subCat,
        deptId: emptyToNull(data.deptId),
        iconColor: data.iconColor,
        readmeMd: emptyToNull(data.readmeMd ?? ""),
        permissions: data.permissions ?? {},
        publisherUserId: userId,
        ownerOrgId: DEFAULT_ORG_ID,
        visibility: "draft",
      })
      await tx.insert(extensionVersions).values({
        id: versionId,
        extensionId,
        version: data.version,
        status: "pending",
        sourceMethod: data.sourceMethod,
      })
      if (data.tagIds.length > 0) {
        await tx.insert(extensionTags).values(
          data.tagIds.map((tagId) => ({ extensionId, tagId })),
        )
      }
    })
  } catch (err) {
    console.error("[publish] createDraftExtension failed", err)
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes("extensions_slug_unique") || message.includes("duplicate key")) {
      return { ok: false, error: "slug_taken" }
    }
    return { ok: false, error: "db_error", detail: message }
  }
  return { ok: true, extensionId, versionId }
}

export type UpdateDraftResult =
  | { ok: true; extensionId: string; versionId: string }
  | { ok: false; error: string; detail?: string }

/**
 * Update an existing draft extension. Slug and version are immutable once
 * the draft is created (the upload pipeline keys off them), so this only
 * touches the mutable wizard fields. tagIds are diff-replaced.
 */
export async function updateDraftExtension(
  userId: string,
  extensionId: string,
  raw: ManifestFormValues,
): Promise<UpdateDraftResult> {
  const parsed = ManifestFormSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      detail: parsed.error.issues.map((i) => i.message).join("; "),
    }
  }
  const data = parsed.data
  const cls = defaultClassification(data.category)
  const db = useDb()

  const [existing] = await db
    .select({
      publisherUserId: extensions.publisherUserId,
      visibility: extensions.visibility,
      slug: extensions.slug,
    })
    .from(extensions)
    .where(eq(extensions.id, extensionId))
    .limit(1)
  if (!existing || existing.publisherUserId !== userId) {
    return { ok: false, error: "not_found" }
  }
  if (existing.visibility !== "draft") {
    return { ok: false, error: "not_editable" }
  }
  if (existing.slug !== data.slug) {
    return { ok: false, error: "slug_immutable" }
  }

  const [latestVersion] = await db
    .select({ id: extensionVersions.id, version: extensionVersions.version })
    .from(extensionVersions)
    .where(eq(extensionVersions.extensionId, extensionId))
    .orderBy(desc(extensionVersions.createdAt))
    .limit(1)
  if (!latestVersion) return { ok: false, error: "not_found" }
  if (latestVersion.version !== data.version) {
    return { ok: false, error: "version_immutable" }
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(extensions)
        .set({
          name: data.name,
          nameZh: emptyToNull(data.nameZh),
          tagline: data.summary,
          taglineZh: emptyToNull(data.taglineZh),
          category: data.category,
          funcCat: cls.funcCat,
          subCat: cls.subCat,
          scope: data.scope,
          deptId: emptyToNull(data.deptId),
          iconColor: data.iconColor,
          readmeMd: emptyToNull(data.readmeMd ?? ""),
          permissions: data.permissions ?? {},
        })
        .where(eq(extensions.id, extensionId))
      await tx
        .delete(extensionTags)
        .where(eq(extensionTags.extensionId, extensionId))
      if (data.tagIds.length > 0) {
        await tx.insert(extensionTags).values(
          data.tagIds.map((tagId) => ({ extensionId, tagId })),
        )
      }
    })
  } catch (err) {
    console.error("[publish] updateDraftExtension failed", err)
    return { ok: false, error: "db_error", detail: err instanceof Error ? err.message : String(err) }
  }
  return { ok: true, extensionId, versionId: latestVersion.id }
}

export type GetDraftResult =
  | { ok: true; draft: DraftRehydration }
  | { ok: false; error: "not_found" | "not_editable" }

export interface DraftRehydration {
  extensionId: string
  versionId: string
  bundleUploaded: boolean
  formValues: ManifestFormValues
}

/**
 * Rehydrate a draft for the resume/edit flow. Owner-checked; only drafts
 * (not published/scanning/etc.) are returned. The form values come from
 * the same shape ManifestFormSchema produces so the wizard can drop them
 * in without remapping.
 */
export async function getDraftExtension(
  userId: string,
  extensionId: string,
): Promise<GetDraftResult> {
  const db = useDb()
  const [ext] = await db
    .select()
    .from(extensions)
    .where(eq(extensions.id, extensionId))
    .limit(1)
  if (!ext || ext.publisherUserId !== userId) {
    return { ok: false, error: "not_found" }
  }
  if (ext.visibility !== "draft") {
    return { ok: false, error: "not_editable" }
  }

  const [version] = await db
    .select()
    .from(extensionVersions)
    .where(eq(extensionVersions.extensionId, extensionId))
    .orderBy(desc(extensionVersions.createdAt))
    .limit(1)
  if (!version) return { ok: false, error: "not_found" }

  const tagRows = await db
    .select({ tagId: extensionTags.tagId })
    .from(extensionTags)
    .where(eq(extensionTags.extensionId, extensionId))

  const formValues: ManifestFormValues = {
    slug: ext.slug,
    name: ext.name,
    nameZh: ext.nameZh ?? undefined,
    version: version.version,
    category: ext.category,
    scope: ext.scope,
    summary: ext.tagline ?? "",
    taglineZh: ext.taglineZh ?? undefined,
    readmeMd: ext.readmeMd ?? undefined,
    iconColor: (ext.iconColor as ManifestFormValues["iconColor"]) ?? "indigo",
    tagIds: tagRows.map((r) => r.tagId),
    deptId: ext.deptId ?? undefined,
    permissions: (ext.permissions ?? {}) as ManifestFormValues["permissions"],
    sourceMethod: (version.sourceMethod as ManifestFormValues["sourceMethod"]) ?? "zip",
  }

  return {
    ok: true,
    draft: {
      extensionId: ext.id,
      versionId: version.id,
      bundleUploaded: Boolean(version.bundleFileId),
      formValues,
    },
  }
}

export type AttachFileResult =
  | { ok: true; fileId: string }
  | { ok: false; error: string }

export async function attachFile(
  userId: string,
  versionId: string,
  r2Key: string,
  size: number,
  checksumSha256: string,
): Promise<AttachFileResult> {
  const fileId = crypto.randomUUID()
  const db = useDb()

  const [owner] = await db
    .select({ publisherUserId: extensions.publisherUserId })
    .from(extensionVersions)
    .innerJoin(extensions, eq(extensions.id, extensionVersions.extensionId))
    .where(eq(extensionVersions.id, versionId))
    .limit(1)
  if (!owner || owner.publisherUserId !== userId) {
    return { ok: false, error: "not_found" }
  }

  try {
    await db.transaction(async (tx) => {
      await tx.insert(files).values({
        id: fileId,
        r2Key,
        size: BigInt(size),
        checksumSha256,
        mimeType: "application/zip",
        scanStatus: "pending",
      })
      const updated = await tx
        .update(extensionVersions)
        .set({ bundleFileId: fileId })
        .where(eq(extensionVersions.id, versionId))
        .returning({ id: extensionVersions.id })
      if (updated.length === 0) throw new Error("version_disappeared")
    })
  } catch (err) {
    console.error("[publish] attachFile failed", err)
    return { ok: false, error: "db_error" }
  }
  return { ok: true, fileId }
}

export type SubmitResult =
  | { ok: true }
  | { ok: false; error: string }

export async function submitForReview(
  userId: string,
  versionId: string,
): Promise<SubmitResult> {
  const db = useDb()
  const [version] = await db
    .select({
      bundleFileId: extensionVersions.bundleFileId,
      publisherUserId: extensions.publisherUserId,
    })
    .from(extensionVersions)
    .innerJoin(extensions, eq(extensions.id, extensionVersions.extensionId))
    .where(eq(extensionVersions.id, versionId))
    .limit(1)
  if (!version || version.publisherUserId !== userId) {
    return { ok: false, error: "not_found" }
  }
  if (!version.bundleFileId) return { ok: false, error: "no_bundle" }

  try {
    await submit(versionId)
  } catch (err) {
    if (err instanceof VersionStateError) {
      return { ok: false, error: "version_not_submittable" }
    }
    console.error("[publish] submitForReview failed", err)
    return { ok: false, error: "db_error" }
  }

  try {
    const { inngest } = await import("~~/server/utils/inngest")
    await inngest.send({
      name: "extension/scan.requested",
      data: { versionId, fileId: version.bundleFileId },
    })
  } catch (err) {
    console.error("[publish] inngest.send failed", err)
    try {
      await db
        .update(extensionVersions)
        .set({ status: "pending" })
        .where(
          and(
            eq(extensionVersions.id, versionId),
            eq(extensionVersions.status, "scanning"),
          ),
        )
    } catch (rollbackErr) {
      console.error("[publish] rollback after inngest failure failed", rollbackErr)
    }
    return { ok: false, error: "scan_queue_unavailable" }
  }
  return { ok: true }
}

export async function getMyExtensions(userId: string) {
  const db = useDb()
  const rows = await db
    .select({
      id: extensions.id,
      slug: extensions.slug,
      name: extensions.name,
      category: extensions.category,
      visibility: extensions.visibility,
      createdAt: extensions.createdAt,
      latestVersionId: extensionVersions.id,
      latestVersion: extensionVersions.version,
      latestStatus: extensionVersions.status,
      latestBundleFileId: extensionVersions.bundleFileId,
    })
    .from(extensions)
    .leftJoin(
      extensionVersions,
      eq(extensionVersions.extensionId, extensions.id),
    )
    .where(eq(extensions.publisherUserId, userId))
    .orderBy(desc(extensions.createdAt), desc(extensionVersions.createdAt))

  const byExtension = new Map<string, (typeof rows)[number]>()
  for (const row of rows) {
    if (!byExtension.has(row.id)) byExtension.set(row.id, row)
  }
  return Array.from(byExtension.values())
}

export async function discardDraft(
  userId: string,
  extensionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = useDb()
  const [row] = await db
    .select({
      publisherUserId: extensions.publisherUserId,
      visibility: extensions.visibility,
    })
    .from(extensions)
    .where(eq(extensions.id, extensionId))
    .limit(1)

  if (!row || row.publisherUserId !== userId) {
    return { ok: false, error: "not_found" }
  }
  if (row.visibility !== "draft") {
    return { ok: false, error: "not_discardable" }
  }

  await db.delete(extensions).where(eq(extensions.id, extensionId))
  return { ok: true }
}
