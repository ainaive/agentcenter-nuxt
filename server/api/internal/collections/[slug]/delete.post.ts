import * as collectionsRepo from "~~/server/repositories/collections"

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const slug = getRouterParam(event, "slug")
  if (!slug) throw createError({ statusCode: 400, statusMessage: "slug_required" })

  try {
    await collectionsRepo.remove(useDb(), { slug, ownerUserId: user.id })
    return { ok: true as const }
  } catch (err) {
    throw mapCollectionError(err)
  }
})
