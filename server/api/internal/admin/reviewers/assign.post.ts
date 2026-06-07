import { insertReviewer } from "~~/server/repositories/reviewers"
import { AssignReviewerSchema } from "~~/shared/validators/approvals"

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const body = await readValidatedBody(event, (raw) =>
    AssignReviewerSchema.parse(raw),
  )

  await insertReviewer(useDb(), {
    id: crypto.randomUUID(),
    tier: body.tier,
    subCat: body.subCat,
    userId: body.userId,
  })
  return { ok: true }
})
