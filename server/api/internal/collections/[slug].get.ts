import * as collectionsRepo from "~~/server/repositories/collections"
import { getOwnerName, listItems } from "~~/server/utils/queries/collections"

// Single collection. Public rows are readable by anyone (including signed-out
// visitors); private rows only by the owner.
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, "slug")
  if (!slug) throw createError({ statusCode: 400, statusMessage: "slug_required" })

  const db = useDb()
  const collection = await collectionsRepo.findBySlug(db, slug)
  if (!collection) throw createError({ statusCode: 404, statusMessage: "not_found" })

  const viewer = await getSessionUser(event)
  const isOwner = viewer?.id === collection.ownerUserId
  if (collection.visibility === "private" && !isOwner) {
    throw createError({ statusCode: 404, statusMessage: "not_found" })
  }

  const [items, ownerName] = await Promise.all([
    listItems(collection.id),
    getOwnerName(collection.ownerUserId),
  ])

  return {
    collection: {
      id: collection.id,
      slug: collection.slug,
      name: collection.name,
      nameZh: collection.nameZh,
      description: collection.description,
      descriptionZh: collection.descriptionZh,
      visibility: collection.visibility,
      systemKind: collection.systemKind,
      ownerName,
      isOwner,
      itemCount: items.length,
      publishedAt: collection.publishedAt?.toISOString() ?? null,
      createdAt: collection.createdAt.toISOString(),
      updatedAt: collection.updatedAt.toISOString(),
    },
    items: items.map((i) => ({ ...i, addedAt: i.addedAt.toISOString() })),
  }
})
