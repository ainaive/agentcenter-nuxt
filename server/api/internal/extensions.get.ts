import * as extensionsRepo from "~~/server/repositories/extensions"
import {
  parseFilters,
  searchParamsToInput,
} from "~~/shared/validators/filters"

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  const filters = parseFilters(searchParamsToInput(url.searchParams))

  try {
    const db = useDb()
    const [items, total] = await Promise.all([
      extensionsRepo.findManyForList(db, filters),
      extensionsRepo.countFiltered(db, filters),
    ])
    return { items, total, filters }
  } catch (err) {
    console.error("[api/internal/extensions] db error:", err)
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to load extensions",
    })
  }
})
