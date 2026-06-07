import {
  deleteReviewer,
  findReviewerById,
} from "~~/server/repositories/reviewers"
import { UnassignReviewerSchema } from "~~/shared/validators/approvals"

// Load the row first so the cell-aware gate authorises against the row's
// own (tier, subCat, productLineId), not against anything the caller
// supplies. Without this, a company admin of subCat X could uncover the
// id of a company-tier reviewer in any subCat by guessing — the request
// body alone can't tell us which cell the id belongs to.
export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, (raw) =>
    UnassignReviewerSchema.parse(raw),
  )
  const row = await findReviewerById(useDb(), body.id)
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: "reviewer_not_found" })
  }
  await requireCellAdmin(event, {
    tier: row.tier,
    subCat: row.subCat,
    productLineId: row.productLineId,
  })
  await deleteReviewer(useDb(), body.id)
  return { ok: true }
})
