import {
  isSuperAdmin,
  listCellsForUser,
} from "~~/server/repositories/reviewers"

// Lightweight "what can I do in the admin surface" probe — backs the
// require-reviewer / require-super-admin client middleware so the pages
// can fail fast with 403 → redirect rather than rendering and then
// hitting an empty page.
//
// Returns safe defaults for anonymous callers rather than 401, because
// the detail page renders for anonymous browsers too and needs to read
// this endpoint without bailing out — the gates on the actual admin
// pages still throw 401 separately. `cells` is returned alongside the
// role booleans so the approvals queue page can render smart pickers
// bounded to what the viewer actually covers; an empty array means "no
// cells" rather than "any cell allowed".
export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) {
    return { isSuperAdmin: false, isReviewer: false, cells: [] }
  }
  const db = useDb()
  const [superAdmin, cells] = await Promise.all([
    isSuperAdmin(db, user.id),
    listCellsForUser(db, user.id),
  ])
  return {
    isSuperAdmin: superAdmin,
    isReviewer: superAdmin || cells.length > 0,
    cells,
  }
})
