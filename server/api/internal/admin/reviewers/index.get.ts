import {
  isSuperAdmin,
  listCompanySubCatsForUser,
  listMatrix,
} from "~~/server/repositories/reviewers"
import { listAllProductLines } from "~~/server/repositories/productLines"

// Returns the reviewer matrix plus per-cell `canEdit` annotations and the
// productLine list, so the admin UI can render the productLine grid and
// grey non-editable cells in one round-trip. The access gate widens from
// "super-admin only" to "super-admin OR any company-tier reviewer" — the
// non-super viewer sees the full read-only matrix and can only mutate
// productLine cells in their own subCats (see requireCellAdmin).
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = useDb()
  const [superAdmin, companySubCats] = await Promise.all([
    isSuperAdmin(db, user.id),
    listCompanySubCatsForUser(db, user.id),
  ])
  const isCompanyAdmin = companySubCats.length > 0
  if (!superAdmin && !isCompanyAdmin) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" })
  }

  const editableSubCats = new Set(companySubCats)
  const [reviewers, productLines] = await Promise.all([
    listMatrix(db),
    listAllProductLines(db),
  ])

  return {
    ok: true,
    productLines,
    reviewers: reviewers.map((r) => ({
      ...r,
      canEdit:
        superAdmin ||
        (r.tier === "productLine" && editableSubCats.has(r.subCat)),
    })),
    viewer: {
      isSuperAdmin: superAdmin,
      companySubCats,
    },
  }
})
