import { describe, expect, it } from "vitest"
import { z } from "zod"

// Shape contract for GET /api/v1/extensions/:slug/bundle (docs/api.md §156–166).
// Not a JSON response — the success case is a 302 redirect; only the
// error envelope is JSON. Both shapes are part of the contract.

const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
})

describe("contract: GET /api/v1/extensions/:slug/bundle", () => {
  it("404 not_found error envelope parses", () => {
    const parsed = errorResponseSchema.safeParse({
      error: "not_found",
      message: "Extension not found.",
    })
    expect(parsed.success).toBe(true)
  })

  it("503 bundle_unavailable error envelope parses", () => {
    const parsed = errorResponseSchema.safeParse({
      error: "bundle_unavailable",
      message: "Bundle not available yet.",
    })
    expect(parsed.success).toBe(true)
  })

  it("rejects an error envelope missing the message field", () => {
    const parsed = errorResponseSchema.safeParse({ error: "not_found" })
    expect(parsed.success).toBe(false)
  })
})
