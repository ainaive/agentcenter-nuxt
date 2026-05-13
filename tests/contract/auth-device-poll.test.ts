import { describe, expect, it } from "vitest"
import { z } from "zod"

// Shape contract for POST /api/v1/auth/device/poll (docs/api.md §35–64).
//
// Response is a discriminated union over `status`:
// - pending: just { status: "pending" }
// - authorized: { status: "authorized", token: string } — token is returned
//   exactly once before the row is deleted; CLI must persist it immediately.
// - expired: just { status: "expired" }

const pollRequestSchema = z.object({
  deviceCode: z.string(),
})

const pollResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("pending") }),
  z.object({ status: z.literal("authorized"), token: z.string() }),
  z.object({ status: z.literal("expired") }),
])

describe("contract: POST /api/v1/auth/device/poll", () => {
  it("documented request payload parses", () => {
    const parsed = pollRequestSchema.safeParse({ deviceCode: "f9b6c63a-…" })
    expect(parsed.success).toBe(true)
  })

  it("response variant `pending` parses", () => {
    const parsed = pollResponseSchema.safeParse({ status: "pending" })
    expect(parsed.success).toBe(true)
  })

  it("response variant `authorized` parses with a non-empty token", () => {
    const parsed = pollResponseSchema.safeParse({
      status: "authorized",
      token: "<session-token>",
    })
    expect(parsed.success).toBe(true)
  })

  it("response variant `expired` parses", () => {
    const parsed = pollResponseSchema.safeParse({ status: "expired" })
    expect(parsed.success).toBe(true)
  })

  it("rejects `authorized` without a token (load-bearing — CLI cannot proceed without it)", () => {
    const parsed = pollResponseSchema.safeParse({ status: "authorized" })
    expect(parsed.success).toBe(false)
  })

  it("rejects an unknown status", () => {
    const parsed = pollResponseSchema.safeParse({ status: "unknown" })
    expect(parsed.success).toBe(false)
  })
})
