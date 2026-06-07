import {
  ApprovalError,
  submitRequest,
} from "~~/server/utils/approvals"
import { SubmitApprovalSchema } from "~~/shared/validators/approvals"

const ERROR_STATUS: Record<string, number> = {
  extension_not_found: 404,
  not_publisher_owner: 403,
  extension_not_published: 409,
  duplicate_pending_request: 409,
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readValidatedBody(event, (raw) =>
    SubmitApprovalSchema.parse(raw),
  )

  try {
    const row = await submitRequest({
      extensionId: body.extensionId,
      requestedTier: body.requestedTier,
      subCat: body.subCat,
      userId: user.id,
      reason: body.reason,
    })
    return { ok: true, request: row }
  } catch (err) {
    if (err instanceof ApprovalError) {
      const status = ERROR_STATUS[err.code] ?? 400
      throw createError({ statusCode: status, statusMessage: err.code })
    }
    console.error("internal submitRequest failed", err)
    throw createError({
      statusCode: 500,
      statusMessage: "approval_submit_failed",
    })
  }
})
