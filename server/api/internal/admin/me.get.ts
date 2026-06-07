import {
  isSuperAdmin,
  listCellsForUser,
} from "~~/server/repositories/reviewers"

// Lightweight "what can I do in the admin surface" probe — backs the
// require-reviewer / require-super-admin client middleware so the pages
// can fail fast with 403 → redirect rather than rendering and then
// hitting an empty page.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = useDb()
  const [superAdmin, cells] = await Promise.all([
    isSuperAdmin(db, user.id),
    listCellsForUser(db, user.id),
  ])
  return {
    isSuperAdmin: superAdmin,
    isReviewer: superAdmin || cells.length > 0,
  }
})
