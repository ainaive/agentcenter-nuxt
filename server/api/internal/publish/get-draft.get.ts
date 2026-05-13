import { getDraftExtension } from "~~/server/utils/publish"

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const extensionId = getQuery(event).extensionId
  if (typeof extensionId !== "string" || !extensionId) {
    throw createError({ statusCode: 400, statusMessage: "extensionId required" })
  }
  const result = await getDraftExtension(user.id, extensionId)
  if (!result.ok) {
    throw createError({
      statusCode: result.error === "not_found" ? 404 : 409,
      statusMessage: result.error,
      data: result,
    })
  }
  return result.draft
})
