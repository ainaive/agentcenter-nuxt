import * as collectionsRepo from "~~/server/repositories/collections"

// Returns the ids of the signed-in user's collections that already contain
// the given extension. Powers the save-to-collection popover's checkbox
// state without a separate per-collection round-trip.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const query = getQuery(event)
  const extensionId = typeof query.extensionId === "string" ? query.extensionId : null
  if (!extensionId) {
    throw createError({ statusCode: 400, statusMessage: "extensionId_required" })
  }

  const ids = await collectionsRepo.membershipForExtension(useDb(), {
    userId: user.id,
    extensionId,
  })
  return { collectionIds: ids }
})
