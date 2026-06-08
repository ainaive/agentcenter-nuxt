import {
  isSuperAdmin,
  listCellsForUser,
} from "~~/server/repositories/reviewers"

// Lightweight "what can I do in the admin surface" probe — backs the
// require-reviewer / require-super-admin client middleware so the pages
// can fail fast with 403 → redirect rather than rendering and then
// hitting an empty page.
//
// Returns safe `false`/`false` defaults for anonymous callers rather
// than 401, because the detail page renders for anonymous browsers too
// and needs to read this endpoint without bailing out — the gates on
// the actual admin pages still throw 401 separately.
export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) return { isSuperAdmin: false, isReviewer: false }
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
