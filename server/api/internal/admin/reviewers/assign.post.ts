import { insertAdmin } from "~~/server/repositories/admins"
import { AssignAdminSchema } from "~~/shared/validators/approvals"

// Per-cell authorisation via the redesigned `requireCellAdmin` gate:
// super-admins everywhere, plus any user whose admin shadow covers the
// target cell. Coverage is computed in one indexed query — see
// `findCoveringAdmin` in `server/repositories/admins.ts`. The
// validator's refines already guarantee the (level, key) keyspace and
// the productLineId iff-rule, so any failure past this point would be
// a true 23514 not a Zod error.
export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, (raw) =>
    AssignAdminSchema.parse(raw),
  )
  await requireCellAdmin(event, {
    extensionCategory: body.extensionCategory,
    tier: body.tier,
    productLineId: body.productLineId ?? null,
    categoryLevel: body.categoryLevel,
    categoryKey: body.categoryKey,
  })

  await insertAdmin(useDb(), {
    id: crypto.randomUUID(),
    extensionCategory: body.extensionCategory,
    tier: body.tier,
    productLineId: body.productLineId ?? null,
    categoryLevel: body.categoryLevel,
    categoryKey: body.categoryKey,
    userId: body.userId,
  })
  return { ok: true }
})
