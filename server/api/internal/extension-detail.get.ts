import {
  getExtensionBySlug,
  getRelatedExtensions,
  listExtensionVersions,
} from "~~/server/utils/queries/extension-detail"

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const slug = typeof query.slug === "string" ? query.slug : null
  if (!slug) throw createError({ statusCode: 400, statusMessage: "slug required" })

  const ext = await getExtensionBySlug(slug)
  if (!ext) throw createError({ statusCode: 404, statusMessage: "not_found" })

  const [versions, related] = await Promise.all([
    listExtensionVersions(ext.id),
    getRelatedExtensions(ext.id, ext.category),
  ])

  return { ext, versions, related }
})
