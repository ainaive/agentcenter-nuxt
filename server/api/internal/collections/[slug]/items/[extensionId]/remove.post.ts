import * as collectionsRepo from "~~/server/repositories/collections"

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const slug = getRouterParam(event, "slug")
  const extensionId = getRouterParam(event, "extensionId")
  if (!slug || !extensionId) {
    throw createError({ statusCode: 400, statusMessage: "missing_params" })
  }

  try {
    await collectionsRepo.removeItemBySlug(useDb(), {
      slug,
      ownerUserId: user.id,
      extensionId,
    })
    return { ok: true as const }
  } catch (err) {
    throw mapCollectionError(err)
  }
})
