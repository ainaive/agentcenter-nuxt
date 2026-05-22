import { randomBytes } from "node:crypto"

import { eq } from "drizzle-orm"

import type { Transactable } from "~~/server/repositories/types"
import { collections } from "~~/shared/db/schema"

// 10 base36 characters → ~36^10 ≈ 3.6×10^15 codes. At 10^6 rows the
// birthday-collision probability is still under 10^-3 so a handful of retries
// is plenty.
export const SHORTCODE_LENGTH = 10
const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz"
const ALPHABET_LEN = ALPHABET.length

export function generateShortcode(length = SHORTCODE_LENGTH): string {
  // randomBytes is uniform; we discard bytes whose value falls in the bias
  // window (>= 252 = floor(256/36)*36). Cheap, and avoids modulo bias.
  const out: string[] = []
  while (out.length < length) {
    const buf = randomBytes(length * 2)
    for (let i = 0; i < buf.length && out.length < length; i++) {
      const b = buf[i]!
      if (b >= 252) continue
      out.push(ALPHABET[b % ALPHABET_LEN]!)
    }
  }
  return out.join("")
}

export async function generateUniqueShortcode(
  db: Transactable,
  maxAttempts = 5,
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = generateShortcode()
    const [row] = await db
      .select({ id: collections.id })
      .from(collections)
      .where(eq(collections.slug, candidate))
      .limit(1)
    if (!row) return candidate
  }
  throw new Error("could not generate a unique collection shortcode")
}
