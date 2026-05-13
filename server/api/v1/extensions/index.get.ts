import * as extensionsRepo from "~~/server/repositories/extensions"
import {
  PAGE_SIZE,
  parseFilters,
  searchParamsToInput,
} from "~~/shared/validators/filters"

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  const filters = parseFilters({
    ...searchParamsToInput(url.searchParams),
    dept: "__all",
  })

  try {
    const db = useDb()
    const [items, total] = await Promise.all([
      extensionsRepo.findManyForList(db, filters),
      extensionsRepo.countFiltered(db, filters),
    ])

    setHeader(
      event,
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300",
    )

    return {
      items: items.map((ext) => ({
        slug: ext.slug,
        name: ext.name,
        nameZh: ext.nameZh,
        category: ext.category,
        scope: ext.scope,
        badge: ext.badge,
        description: ext.description,
        descriptionZh: ext.descriptionZh,
        tags: ext.tagIds,
        funcCat: ext.funcCat,
        subCat: ext.subCat,
        l2: ext.l2,
        downloadsCount: ext.downloadsCount,
        starsAvg: ext.starsAvg != null ? Number(ext.starsAvg).toFixed(1) : "0.0",
      })),
      total,
      page: filters.page,
      pageSize: PAGE_SIZE,
    }
  } catch (err) {
    console.error("[api/v1/extensions] db error:", err)
    apiError(event, "Failed to fetch extensions.", 500, "server_error")
  }
})
