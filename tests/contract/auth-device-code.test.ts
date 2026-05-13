import { describe, expect, it } from "vitest"
import { z } from "zod"

// Shape contract for POST /api/v1/auth/device/code (docs/api.md §18–34).

const deviceCodeResponseSchema = z.object({
  deviceCode: z.string(),
  userCode: z.string(),
  verificationUri: z.string(),
  expiresIn: z.number().int().positive(),
})

const DOCUMENTED_PAYLOAD = {
  deviceCode: "f9b6c63a-…",
  userCode: "ABCD-1234",
  verificationUri: "/cli/auth",
  expiresIn: 600,
}

describe("contract: POST /api/v1/auth/device/code", () => {
  it("documented response payload parses against the shape schema", () => {
    const parsed = deviceCodeResponseSchema.safeParse(DOCUMENTED_PAYLOAD)
    expect(parsed.success).toBe(true)
  })

  it("rejects a missing deviceCode (it's the load-bearing field — CLI polls with it)", () => {
    const parsed = deviceCodeResponseSchema.safeParse({
      ...DOCUMENTED_PAYLOAD,
      deviceCode: undefined,
    })
    expect(parsed.success).toBe(false)
  })

  it("rejects a non-positive expiresIn", () => {
    const parsed = deviceCodeResponseSchema.safeParse({
      ...DOCUMENTED_PAYLOAD,
      expiresIn: 0,
    })
    expect(parsed.success).toBe(false)
  })
})
