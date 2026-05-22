import { listPublicPaged } from "~~/server/utils/queries/collections"

const DEFAULT_PAGE_SIZE = 24
const MAX_PAGE_SIZE = 60
// Cap on the anonymous browse depth — sky-high page numbers force deep
// offsets and degrade query perf for no gain (we don't have millions of
// public collections, and a real human would re-search before paging
// past a few hundred).
const MAX_PAGE = 10_000

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Math.min(
    MAX_PAGE,
    Math.max(1, Number.parseInt(String(query.page ?? "1"), 10) || 1),
  )
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(
      1,
      Number.parseInt(String(query.pageSize ?? DEFAULT_PAGE_SIZE), 10)
        || DEFAULT_PAGE_SIZE,
    ),
  )

  const { rows, total } = await listPublicPaged({ page, pageSize })
  return {
    items: rows.map((r) => ({
      ...r,
      publishedAt: r.publishedAt?.toISOString() ?? null,
    })),
    total,
    page,
    pageSize,
  }
})
