import { ManifestFormSchema } from "~~/shared/validators/manifest"
import { createDraftExtension } from "~~/server/utils/publish"

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readValidatedBody(event, (raw) => ManifestFormSchema.parse(raw))
  const result = await createDraftExtension(user.id, body)
  if (!result.ok) {
    throw createError({
      statusCode: result.error === "slug_taken" ? 409 : 400,
      statusMessage: result.error,
      data: result,
    })
  }
  return result
})
