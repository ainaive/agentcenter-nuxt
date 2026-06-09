import {
  isSuperAdmin,
  listCellsForUser,
  listMatrix,
} from "~~/server/repositories/admins"
import { listAllProductLines } from "~~/server/repositories/productLines"
import { categoryAncestors } from "~~/shared/taxonomy"

// Returns the matrix plus per-cell `canEdit` annotations and the
// productLine list, so the admin UI can render the unified table and
// grey non-editable cells in one round-trip. The access gate widens
// from "super-admin only" to "super-admin OR any matrix admin" — a
// non-super viewer sees the full read-only matrix and can only mutate
// cells whose covering shadow they're in (see `requireCellAdmin`).
//
// `canEdit` is derived in-memory from `viewer.coveringCells` rather
// than via a per-row `findCoveringAdmin` query. The cover relation is
// applied row-side: each matrix row asks whether any of the viewer's
// covering cells is one of its ≤6 cover-ancestors. The covering set
// is tiny in practice (one cell per assignment a person holds), so
// the per-row cost is bounded and doesn't grow with matrix size.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = useDb()
  const [superAdmin, coveringCells, productLines] = await Promise.all([
    isSuperAdmin(db, user.id),
    listCellsForUser(db, user.id),
    listAllProductLines(db),
  ])
  if (!superAdmin && coveringCells.length === 0) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" })
  }

  const admins = await listMatrix(db)
  const annotated = admins.map((r) => ({
    ...r,
    canEdit: superAdmin || rowCoveredBy(r, coveringCells),
  }))

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

// Mirrors `findCoveringAdmin` (server/repositories/admins.ts) but
// evaluated in JS against the viewer's already-loaded covering set.
// Cross-extensionCategory authority does not exist; the column-tier
// asymmetry is the same `(company, null) ⊇ (productLine, X)` rule;
// the category dim uses the standard `categoryAncestors` walk.
function rowCoveredBy(
  row: {
    extensionCategory: string
    tier: "company" | "productLine"
    productLineId: string | null
    categoryLevel: "all" | "macro" | "micro"
    categoryKey: string
  },
  coveringCells: ReadonlyArray<{
    extensionCategory: string
    tier: "company" | "productLine"
    productLineId: string | null
    categoryLevel: "all" | "macro" | "micro"
    categoryKey: string
  }>,
): boolean {
  const catAncestors = categoryAncestors(row.categoryLevel, row.categoryKey)
  for (const c of coveringCells) {
    if (c.extensionCategory !== row.extensionCategory) continue
    const colOk =
      (c.tier === "company" && c.productLineId === null) ||
      (c.tier === row.tier && c.productLineId === row.productLineId)
    if (!colOk) continue
    if (
      catAncestors.some(
        (a) => a.level === c.categoryLevel && a.key === c.categoryKey,
      )
    ) {
      return true
    }
  }
  return false
}
