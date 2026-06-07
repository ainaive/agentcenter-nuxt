import { listMatrix } from "~~/server/repositories/reviewers"

// Super-admin-only matrix view. Returns reviewer assignments joined with
// user display fields so the matrix UI renders chips without a second
// round-trip.
export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  return { ok: true, reviewers: await listMatrix(useDb()) }
})
