import { eq } from "drizzle-orm"
import {
  extensions,
  extensionVersions,
  files,
} from "~~/shared/db/schema"
import { getExtensionBySlug } from "~~/server/utils/queries/extension-detail"

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, "slug")
  if (!slug) apiError(event, "slug required", 400, "invalid_request")

  const ext = await getExtensionBySlug(slug)
  if (!ext) apiError(event, "Extension not found.", 404, "not_found")

  const db = useDb()
  const [row] = await db
    .select({ r2Key: files.r2Key })
    .from(extensionVersions)
    .innerJoin(files, eq(files.id, extensionVersions.bundleFileId))
    .innerJoin(extensions, eq(extensions.id, extensionVersions.extensionId))
    .where(eq(extensions.slug, slug))
    .orderBy(extensionVersions.createdAt)
    .limit(1)

  if (!row?.r2Key) {
    apiError(event, "Bundle not available yet.", 503, "bundle_unavailable")
  }

  try {
    const storage = await useStorage()
    const url = await storage.getSignedDownloadUrl(row.r2Key)
    await sendRedirect(event, url, 302)
  } catch (err) {
    console.error("[bundle] storage error:", err)
    apiError(event, "Storage is not configured.", 503, "storage_unavailable")
  }
})
