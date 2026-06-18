import { describe, expect, it } from "vitest"
import { z } from "zod"

// Shape contract for GET /api/v1/me (docs/api.md "User"). The CLI's
// fetchMe() reads { id, email, name } — name may be null.

const meResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
})

const DOCUMENTED_RESPONSE = {
  id: "user-amy",
  email: "amy@agentcenter.dev",
  name: "Amy Chen",
}

describe("contract: GET /api/v1/me", () => {
  it("documented response payload parses", () => {
    expect(meResponseSchema.safeParse(DOCUMENTED_RESPONSE).success).toBe(true)
  })

  it("accepts a null name", () => {
    expect(
      meResponseSchema.safeParse({ ...DOCUMENTED_RESPONSE, name: null }).success,
    ).toBe(true)
  })

  it("rejects a response missing the required id", () => {
    const { id: _id, ...rest } = DOCUMENTED_RESPONSE
    expect(meResponseSchema.safeParse(rest).success).toBe(false)
  })
})
