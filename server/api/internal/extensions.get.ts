import { parseFilters, searchParamsToInput } from "~~/shared/validators/filters"
import {
  countFilteredExtensions,
  listExtensions,
} from "~~/server/utils/queries/extensions"

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  const filters = parseFilters(searchParamsToInput(url.searchParams))

  try {
    const [items, total] = await Promise.all([
      listExtensions(filters),
      countFilteredExtensions(filters),
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
