import { z } from "zod"

import * as collectionsRepo from "~~/server/repositories/collections"

const MembershipQuery = z.object({
  extensionId: z.string().trim().min(1),
})

// Returns the ids of the signed-in user's collections that already contain
// the given extension. Powers the save-to-collection popover's checkbox
// state without a separate per-collection round-trip.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const parsed = MembershipQuery.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: "extensionId_required" })
  }

  const ids = await collectionsRepo.membershipForExtension(useDb(), {
    userId: user.id,
    extensionId: parsed.data.extensionId,
  })
  return { collectionIds: ids }
})
