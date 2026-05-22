import * as collectionsRepo from "~~/server/repositories/collections"
import { listForOwner } from "~~/server/utils/queries/collections"

// Lists every collection the current user owns. Lazily seeds the system
// 'Saved' row on first hit so it always appears even if the user has never
// clicked the bookmark button. Excludes the 'Installed' row.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = useDb()
  await collectionsRepo.getOrCreateSystem(db, user.id, "saved")
  const rows = await listForOwner(user.id)
  return {
    rows: rows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() })),
  }
})
