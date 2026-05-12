import { parseFilters, searchParamsToInput } from "~~/shared/validators/filters"
import {
  countFilteredExtensions,
  listExtensions,
} from "~~/server/utils/queries/extensions"

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  const filters = parseFilters(searchParamsToInput(url.searchParams))

  const [items, total] = await Promise.all([
    listExtensions(filters),
    countFilteredExtensions(filters),
  ])

  return { items, total, filters }
})
