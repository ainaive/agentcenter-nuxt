import { getExtensionBySlug } from "~~/server/utils/queries/extension-detail"

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, "slug")
  if (!slug) apiError(event, "slug required", 400, "invalid_request")

  try {
    const ext = await getExtensionBySlug(slug)
    if (!ext) apiError(event, "Extension not found.", 404, "not_found")

    setHeader(
      event,
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300",
    )

    return {
      slug: ext.slug,
      name: ext.name,
      nameZh: ext.nameZh,
      category: ext.category,
      scope: ext.scope,
      badge: ext.badge,
      tagline: ext.tagline,
      description: ext.description,
      descriptionZh: ext.descriptionZh,
      tags: ext.tagIds,
      funcCat: ext.funcCat,
      subCat: ext.subCat,
      l2: ext.l2,
      license: ext.licenseSpdx,
      homepageUrl: ext.homepageUrl,
      repoUrl: ext.repoUrl,
      compatibilityJson: ext.compatibilityJson,
      downloadsCount: ext.downloadsCount,
      starsAvg: Number(ext.starsAvg).toFixed(1),
      ratingsCount: ext.ratingsCount,
      publishedAt: ext.publishedAt,
      version: "latest",
      bundleUrl: `/api/v1/extensions/${ext.slug}/bundle`,
    }
  } catch (err) {
    if (err && typeof err === "object" && "statusCode" in err) throw err
    console.error("[api/v1/extensions/:slug] db error:", err)
    apiError(event, "Failed to fetch extension.", 500, "server_error")
  }
})
