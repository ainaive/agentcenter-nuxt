import { describe, expect, it } from "vitest"
import { z } from "zod"

// Shape contract for POST /api/v1/installs (docs/api.md §169–208).

const installRequestSchema = z.object({
  extensionSlug: z.string(),
  version: z.string().optional(),
  agentName: z.string().optional(),
  agentVersion: z.string().optional(),
})

const installResponseSchema = z.object({
  ok: z.literal(true),
  installId: z.string(),
  isFirstInstall: z.boolean(),
  version: z.string(),
})

const DOCUMENTED_REQUEST = {
  extensionSlug: "web-search",
  version: "1.2.0",
  agentName: "claude",
  agentVersion: "1.0.4",
}

const DOCUMENTED_RESPONSE = {
  ok: true,
  installId: "9f2d…",
  isFirstInstall: true,
  version: "1.2.0",
}

describe("contract: POST /api/v1/installs", () => {
  it("documented request payload parses", () => {
    const parsed = installRequestSchema.safeParse(DOCUMENTED_REQUEST)
    expect(parsed.success).toBe(true)
  })

  it("documented response payload parses", () => {
    const parsed = installResponseSchema.safeParse(DOCUMENTED_RESPONSE)
    expect(parsed.success).toBe(true)
  })

  it("accepts a request with only the required extensionSlug", () => {
    const parsed = installRequestSchema.safeParse({ extensionSlug: "web-search" })
    expect(parsed.success).toBe(true)
  })

  it("rejects a request missing the required extensionSlug", () => {
    const parsed = installRequestSchema.safeParse({ version: "1.0.0" })
    expect(parsed.success).toBe(false)
  })

  it("rejects a response with ok=false (the success literal is fixed at true)", () => {
    const parsed = installResponseSchema.safeParse({
      ...DOCUMENTED_RESPONSE,
      ok: false,
    })
    expect(parsed.success).toBe(false)
  })
})
