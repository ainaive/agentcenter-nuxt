import * as extensionsRepo from "~~/server/repositories/extensions"
import * as versionsRepo from "~~/server/repositories/versions"

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const slug = typeof query.slug === "string" ? query.slug : null
  if (!slug) throw createError({ statusCode: 400, statusMessage: "slug required" })

  const db = useDb()
  const ext = await extensionsRepo.findBySlug(db, slug)
  if (!ext) throw createError({ statusCode: 404, statusMessage: "not_found" })

  const [versions, related] = await Promise.all([
    versionsRepo.listForExtension(db, ext.id),
    extensionsRepo.findRelated(db, ext.id, ext.category),
  ])

  return { ext, versions, related }
})
