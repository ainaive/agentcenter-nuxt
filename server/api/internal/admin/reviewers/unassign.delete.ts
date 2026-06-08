import {
  deleteAdmin,
  findAdminById,
} from "~~/server/repositories/admins"
import { UnassignAdminSchema } from "~~/shared/validators/approvals"

// Load the row first so the cell-aware gate authorises against the
// row's own 5-coord cell, not against anything the caller supplies.
// Without this, a non-super admin could uncover the id of any row by
// guessing — the request body alone can't tell us which cell the id
// belongs to.
export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, (raw) =>
    UnassignAdminSchema.parse(raw),
  )
  const row = await findAdminById(useDb(), body.id)
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: "admin_not_found" })
  }
  await requireCellAdmin(event, {
    extensionCategory: row.extensionCategory,
    tier: row.tier,
    productLineId: row.productLineId,
    categoryLevel: row.categoryLevel,
    categoryKey: row.categoryKey,
  })
  await deleteAdmin(useDb(), body.id)
  return { ok: true }
})
