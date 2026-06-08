import * as extensionsRepo from "~~/server/repositories/extensions"
import { listAllProductLines } from "~~/server/repositories/productLines"
import * as versionsRepo from "~~/server/repositories/versions"

// Detail endpoint adds a resolved `productLineLabel` so the hero badge can
// render "Wireless Official" / "无线官方" without a second round-trip. The
// page passes its i18n locale as a `?locale=` query param — locked
// decision #5 makes locales always-prefixed in URLs, so the page already
// knows the canonical locale and we don't need an accept-language parser
// here. Unknown / missing locale falls back to English.
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const slug = typeof query.slug === "string" ? query.slug : null
  if (!slug) throw createError({ statusCode: 400, statusMessage: "slug required" })
  const locale = typeof query.locale === "string" ? query.locale : "en"

  const db = useDb()
  const ext = await extensionsRepo.findBySlug(db, slug)
  if (!ext) throw createError({ statusCode: 404, statusMessage: "not_found" })

  const [versions, related, productLines] = await Promise.all([
    versionsRepo.listForExtension(db, ext.id),
    extensionsRepo.findRelated(db, ext.id, ext.category),
    ext.productLineId ? listAllProductLines(db) : Promise.resolve([]),
  ])

  const productLine = ext.productLineId
    ? productLines.find((l) => l.id === ext.productLineId)
    : null
  const productLineLabel = productLine
    ? locale === "zh"
      ? productLine.labelZh
      : productLine.labelEn
    : null

  return { ext: { ...ext, productLineLabel }, versions, related }
})
