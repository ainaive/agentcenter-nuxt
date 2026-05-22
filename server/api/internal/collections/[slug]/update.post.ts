import * as collectionsRepo from "~~/server/repositories/collections"
import { UpdateCollectionInput } from "~~/shared/validators/collection"

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const slug = getRouterParam(event, "slug")
  if (!slug) throw createError({ statusCode: 400, statusMessage: "slug_required" })

  const body = await readValidatedBody(event, (raw) =>
    UpdateCollectionInput.parse(raw),
  )

  try {
    const updated = await collectionsRepo.update(useDb(), {
      slug,
      ownerUserId: user.id,
      input: body,
    })
    return {
      ok: true as const,
      slug: updated.slug,
      visibility: updated.visibility,
      publishedAt: updated.publishedAt?.toISOString() ?? null,
    }
  } catch (err) {
    throw mapCollectionError(err)
  }
})
