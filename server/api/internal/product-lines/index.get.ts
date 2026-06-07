import { listAllProductLines } from "~~/server/repositories/productLines"

// Read-only enumeration of the seeded product lines, used by the publish
// dialog's productLine picker, the admin matrix UI, and the listing-page
// product-line pill. Signed-in users only — the list itself is not
// sensitive but the endpoint sits under /api/internal so unauthenticated
// callers cannot poke at internal IDs.
export default defineEventHandler(async (event) => {
  await requireUser(event)
  return { ok: true, productLines: await listAllProductLines(useDb()) }
})
