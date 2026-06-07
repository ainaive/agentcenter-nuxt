import * as approvalsRepo from "~~/server/repositories/approvals"
import { getMyExtensions } from "~~/server/utils/publish"

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const items = await getMyExtensions(user.id)
  if (items.length === 0) return { items: [] }

  // Hydrate per-row pending-request info in one round-trip. The list view
  // shows at most one pending request per extension (the at-most-one
  // invariant the orchestrator enforces).
  const pending = await approvalsRepo.findPendingForExtensions(
    useDb(),
    items.map((i) => i.id),
  )
  return {
    items: items.map((i) => ({
      ...i,
      pendingRequest: pending.get(i.id) ?? null,
    })),
  }
})
