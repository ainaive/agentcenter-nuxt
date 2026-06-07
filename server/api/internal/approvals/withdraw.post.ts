import {
  ApprovalError,
  withdrawRequest,
} from "~~/server/utils/approvals"
import { WithdrawApprovalSchema } from "~~/shared/validators/approvals"

const ERROR_STATUS: Record<string, number> = {
  request_not_found: 404,
  not_requester: 403,
  request_not_pending: 409,
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readValidatedBody(event, (raw) =>
    WithdrawApprovalSchema.parse(raw),
  )

  try {
    const row = await withdrawRequest({
      requestId: body.requestId,
      userId: user.id,
    })
    return { ok: true, request: row }
  } catch (err) {
    if (err instanceof ApprovalError) {
      const status = ERROR_STATUS[err.code] ?? 400
      throw createError({ statusCode: status, statusMessage: err.code })
    }
    console.error("internal withdrawRequest failed", err)
    throw createError({
      statusCode: 500,
      statusMessage: "approval_withdraw_failed",
    })
  }
})
