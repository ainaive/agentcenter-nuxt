import * as collectionsRepo from "~~/server/repositories/collections"
import { AddItemInput } from "~~/shared/validators/collection"

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const slug = getRouterParam(event, "slug")
  if (!slug) throw createError({ statusCode: 400, statusMessage: "slug_required" })

  const body = await readValidatedBody(event, (raw) => AddItemInput.parse(raw))

  try {
    await collectionsRepo.addItemBySlug(useDb(), {
      slug,
      ownerUserId: user.id,
      extensionId: body.extensionId,
    })
    return { ok: true as const }
  } catch (err) {
    throw mapCollectionError(err)
  }
})
