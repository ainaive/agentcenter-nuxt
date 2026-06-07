import { deleteReviewer } from "~~/server/repositories/reviewers"
import { UnassignReviewerSchema } from "~~/shared/validators/approvals"

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const body = await readValidatedBody(event, (raw) =>
    UnassignReviewerSchema.parse(raw),
  )
  await deleteReviewer(useDb(), body.id)
  return { ok: true }
})
