import {
  ApprovalError,
  revokeTier,
} from "~~/server/utils/approvals"
import { RevokeTierSchema } from "~~/shared/validators/approvals"

// Super-admin Revoke action from the extension detail page. The role
// gate sits here (requireSuperAdmin) so the orchestrator stays a pure
// state-transition function — same pattern as the assign/unassign
// endpoints. The validator's .trim().min(1) on the note caches a
// whitespace-only submission before we touch the DB.
const ERROR_STATUS: Record<string, number> = {
  extension_not_found: 404,
  extension_not_official: 409,
}

export default defineEventHandler(async (event) => {
  const user = await requireSuperAdmin(event)
  const body = await readValidatedBody(event, (raw) =>
    RevokeTierSchema.parse(raw),
  )

  try {
    const result = await revokeTier({
      extensionId: body.extensionId,
      superAdminUserId: user.id,
      note: body.note,
    })
    return { ok: true, revocation: result }
  } catch (err) {
    if (err instanceof ApprovalError) {
      const status = ERROR_STATUS[err.code] ?? 400
      throw createError({ statusCode: status, statusMessage: err.code })
    }
    console.error("internal revokeTier failed", err)
    throw createError({
      statusCode: 500,
      statusMessage: "approval_revoke_failed",
    })
  }
})
