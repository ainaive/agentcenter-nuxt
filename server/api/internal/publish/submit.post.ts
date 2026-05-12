import { z } from "zod"
import { submitForReview } from "~~/server/utils/publish"

const bodySchema = z.object({
  versionId: z.string().uuid(),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readValidatedBody(event, (raw) => bodySchema.parse(raw))
  const result = await submitForReview(user.id, body.versionId)
  if (!result.ok) {
    const status =
      result.error === "not_found" ? 404 :
      result.error === "no_bundle" ? 400 :
      result.error === "version_not_submittable" ? 409 :
      result.error === "scan_queue_unavailable" ? 503 : 500
    throw createError({ statusCode: status, statusMessage: result.error })
  }
  return result
})
