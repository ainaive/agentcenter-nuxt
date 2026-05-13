import { z } from "zod"
import { ManifestFormSchema } from "~~/shared/validators/manifest"
import { updateDraftExtension } from "~~/server/utils/publish"

const Body = z.object({
  extensionId: z.string().min(1),
  values: ManifestFormSchema,
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readValidatedBody(event, (raw) => Body.parse(raw))
  const result = await updateDraftExtension(user.id, body.extensionId, body.values)
  if (!result.ok) {
    const statusCode =
      result.error === "not_found"
        ? 404
        : result.error === "slug_immutable" || result.error === "version_immutable"
          ? 409
          : result.error === "not_editable"
            ? 409
            : 400
    throw createError({
      statusCode,
      statusMessage: result.error,
      data: result,
    })
  }
  return result
})
