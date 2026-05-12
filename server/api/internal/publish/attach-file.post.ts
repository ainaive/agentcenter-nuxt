import { z } from "zod"
import { attachFile } from "~~/server/utils/publish"

const bodySchema = z.object({
  versionId: z.string().uuid(),
  r2Key: z.string().min(1),
  size: z.number().int().positive(),
  checksumSha256: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const body = await readValidatedBody(event, (raw) => bodySchema.parse(raw))
  const result = await attachFile(body.versionId, body.r2Key, body.size, body.checksumSha256)
  if (!result.ok) {
    throw createError({ statusCode: 500, statusMessage: result.error })
  }
  return result
})
