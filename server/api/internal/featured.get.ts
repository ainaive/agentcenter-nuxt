import * as extensionsRepo from "~~/server/repositories/extensions"

export default defineEventHandler(async (event) => {
  try {
    const db = useDb()
    const featured = await extensionsRepo.findFeatured(db)
    setHeader(
      event,
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300",
    )
    return { featured }
  } catch (err) {
    console.error("[api/internal/featured] db error:", err)
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to load featured extension",
    })
  }
})
