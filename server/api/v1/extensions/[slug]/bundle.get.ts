import * as extensionsRepo from "~~/server/repositories/extensions"
import * as versionsRepo from "~~/server/repositories/versions"

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, "slug")
  if (!slug) apiError(event, "slug required", 400, "invalid_request")

  const db = useDb()
  const ext = await extensionsRepo.findBySlug(db, slug)
  if (!ext) apiError(event, "Extension not found.", 404, "not_found")

  const row = await versionsRepo.findLatestReadyBundleBySlug(db, slug)
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
