import { z } from "zod"
import { discardDraft } from "~~/server/utils/publish"

const bodySchema = z.object({
  extensionId: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readValidatedBody(event, (raw) => bodySchema.parse(raw))
  const result = await discardDraft(user.id, body.extensionId)
  if (!result.ok) {
    const status = result.error === "not_found" ? 404 : 409
    throw createError({ statusCode: status, statusMessage: result.error })
  }
  return result
})
