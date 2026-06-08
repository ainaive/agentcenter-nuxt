import {
  findCoveringAdmin,
  isSuperAdmin,
  listCellsForUser,
  listMatrix,
} from "~~/server/repositories/admins"
import { listAllProductLines } from "~~/server/repositories/productLines"

// Returns the matrix plus per-cell `canEdit` annotations and the
// productLine list, so the admin UI can render the unified table and
// grey non-editable cells in one round-trip. The access gate widens
// from "super-admin only" to "super-admin OR any matrix admin" — a
// non-super viewer sees the full read-only matrix and can only mutate
// cells whose covering shadow they're in (see `requireCellAdmin`).
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = useDb()
  const [superAdmin, coveringCells] = await Promise.all([
    isSuperAdmin(db, user.id),
    listCellsForUser(db, user.id),
  ])
  if (!superAdmin && coveringCells.length === 0) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" })
  }

  const [admins, productLines] = await Promise.all([
    listMatrix(db),
    listAllProductLines(db),
  ])

  // Per-row canEdit: super-admins everywhere, otherwise probe the
  // covering relation against the row's own cell coords. The probe is
  // one indexed query per row — cheap relative to the JOIN already
  // running for listMatrix.
  const annotated = await Promise.all(
    admins.map(async (r) => ({
      ...r,
      canEdit:
        superAdmin ||
        (await findCoveringAdmin(db, user.id, {
          extensionCategory: r.extensionCategory,
          tier: r.tier,
          productLineId: r.productLineId,
          categoryLevel: r.categoryLevel,
          categoryKey: r.categoryKey,
        })),
    })),
  )

  return {
    ok: true,
    productLines,
    admins: annotated,
    viewer: {
      isSuperAdmin: superAdmin,
      coveringCells,
    },
  }
})
