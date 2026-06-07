import { insertReviewer } from "~~/server/repositories/reviewers"
import { AssignReviewerSchema } from "~~/shared/validators/approvals"

// Per-cell authorisation: super-admins anywhere, company admins of subCat X
// may assign productLine reviewers for subCat X (any productLine), and
// company-tier cells stay super-admin-only. The validator's iff-rule
// already guarantees productLineId is present iff tier='productLine'.
export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, (raw) =>
    AssignReviewerSchema.parse(raw),
  )
  await requireCellAdmin(event, {
    tier: body.tier,
    subCat: body.subCat,
    productLineId: body.productLineId ?? null,
  })

  await insertReviewer(useDb(), {
    id: crypto.randomUUID(),
    tier: body.tier,
    subCat: body.subCat,
    productLineId: body.productLineId ?? null,
    userId: body.userId,
  })
  return { ok: true }
})
