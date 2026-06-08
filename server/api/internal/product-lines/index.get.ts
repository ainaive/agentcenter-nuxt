import { listAllProductLines } from "~~/server/repositories/productLines"

// Read-only enumeration of the seeded product lines. Consumed by the
// publish dialog's productLine picker, the admin matrix UI, AND the
// listing-page product-line pill — and the listing page renders for
// anonymous browsers. The list itself is non-sensitive (it's the same
// company-wide labels the badge text already exposes on every detail
// page), so we drop the auth gate; the trade-off is a tiny extra
// surface for an unauthenticated caller to enumerate at most four
// kebab-case ids, which is not a leak worth gating.
export default defineEventHandler(async () => {
  return { ok: true, productLines: await listAllProductLines(useDb()) }
})
