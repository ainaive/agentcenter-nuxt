import { asc, eq } from "drizzle-orm"

import { productLines } from "~~/shared/db/schema"

import type { Transactable } from "./types"

// Read accessor for the seeded `product_lines` lookup table. Used by the
// publisher submit dialog, the reviewer matrix UI, and the listing-page
// product-line filter pill. The list is small (4 rows today) and changes
// rarely, so callers can safely cache the result for the request lifetime.

export interface ProductLineRow {
  id: string
  labelEn: string
  labelZh: string
  sortOrder: number
}

export async function listAllProductLines(
  db: Transactable,
): Promise<ProductLineRow[]> {
  return db
    .select({
      id: productLines.id,
      labelEn: productLines.labelEn,
      labelZh: productLines.labelZh,
      sortOrder: productLines.sortOrder,
    })
    .from(productLines)
    .orderBy(asc(productLines.sortOrder), asc(productLines.id))
}

// Existence check for validators that have already pattern-matched the id
// but still need to confirm membership against the seeded set.
export async function existsProductLine(
  db: Transactable,
  id: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: productLines.id })
    .from(productLines)
    .where(eq(productLines.id, id))
    .limit(1)
  return !!row
}
