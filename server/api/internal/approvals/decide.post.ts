import {
  ApprovalError,
  decideRequest,
} from "~~/server/utils/approvals"
import { DecideApprovalSchema } from "~~/shared/validators/approvals"

const ERROR_STATUS: Record<string, number> = {
  request_not_found: 404,
  request_not_pending: 409,
  not_reviewer: 403,
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readValidatedBody(event, (raw) =>
    DecideApprovalSchema.parse(raw),
  )

  try {
    // The discriminated union narrows `body` to the right branch — the
    // approve branch carries no `note`, so the orchestrator's action
    // mirrors the schema shape verbatim.
    const action =
      body.decision === "approve"
        ? { decision: "approve" as const }
        : { decision: "reject" as const, note: body.note }
    const row = await decideRequest({
      requestId: body.requestId,
      action,
      reviewerUserId: user.id,
    })
    return { ok: true, request: row }
  } catch (err) {
    if (err instanceof ApprovalError) {
      const status = ERROR_STATUS[err.code] ?? 400
      throw createError({ statusCode: status, statusMessage: err.code })
    }
    console.error("internal decideRequest failed", err)
    throw createError({
      statusCode: 500,
      statusMessage: "approval_decide_failed",
    })
  }
})
