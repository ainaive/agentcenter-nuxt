import * as extensionsRepo from "~~/server/repositories/extensions"
import { listAllProductLines } from "~~/server/repositories/productLines"
import * as versionsRepo from "~~/server/repositories/versions"

// Detail endpoint adds a resolved `productLineLabel` to the response so
// the hero badge can render "Wireless Official" / "无线官方" without a
// second round-trip. The locale comes from the i18n `accept-locale`
// header set by @nuxtjs/i18n; we fall back to English when absent.
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const slug = typeof query.slug === "string" ? query.slug : null
  if (!slug) throw createError({ statusCode: 400, statusMessage: "slug required" })

  const db = useDb()
  const ext = await extensionsRepo.findBySlug(db, slug)
  if (!ext) throw createError({ statusCode: 404, statusMessage: "not_found" })

  const [versions, related, productLines] = await Promise.all([
    versionsRepo.listForExtension(db, ext.id),
    extensionsRepo.findRelated(db, ext.id, ext.category),
    ext.productLineId ? listAllProductLines(db) : Promise.resolve([]),
  ])

  const acceptLang = getRequestHeader(event, "accept-language") ?? ""
  const isZh = acceptLang.toLowerCase().startsWith("zh")
  const productLine = ext.productLineId
    ? productLines.find((l) => l.id === ext.productLineId)
    : null
  const productLineLabel = productLine
    ? isZh
      ? productLine.labelZh
      : productLine.labelEn
    : null

  return { ext: { ...ext, productLineLabel }, versions, related }
})
