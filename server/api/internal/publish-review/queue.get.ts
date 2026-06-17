import { listPublishReviewQueue } from "~~/server/utils/queries/publish-review"

// Super-admin-only: lists org/enterprise extensions that scanned to `ready`
// but are still `draft`, awaiting a publish decision.
export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const rows = await listPublishReviewQueue()
  return { ok: true, rows }
})
