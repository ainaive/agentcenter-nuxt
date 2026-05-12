import { z } from "zod"

const bodySchema = z.object({
  slug: z.string().trim().min(1).max(120),
  version: z.string().trim().min(1).max(60),
  contentType: z.string().trim().min(1).max(120).default("application/zip"),
})

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const body = await readValidatedBody(event, (raw) => bodySchema.parse(raw))

  try {
    const storage = await useStorage()
    const key = storage.bundleKey(body.slug, body.version)
    const url = await storage.getSignedUploadUrl(key, body.contentType)
    return { url, key }
  } catch (err) {
    console.error("[upload/sign] storage error:", err)
    apiError(event, "Storage is not configured.", 503, "storage_unavailable")
  }
})
