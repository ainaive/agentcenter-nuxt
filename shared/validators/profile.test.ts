import { describe, expect, it } from "vitest"

import {
  PROFILE_BIO_MAX,
  PROFILE_DEPT_ID_MAX,
  PROFILE_NAME_MAX,
  ProfileFormSchema,
} from "./profile"

describe("ProfileFormSchema", () => {
  it("accepts a minimal valid profile (just name)", () => {
    const parsed = ProfileFormSchema.safeParse({ name: "Alice" })
    expect(parsed.success).toBe(true)
    expect(parsed.data?.defaultDeptId).toBe("")
    expect(parsed.data?.bio).toBe("")
  })

  it("accepts all fields populated", () => {
    const parsed = ProfileFormSchema.safeParse({
      name: "Alice",
      defaultDeptId: "eng.cloud.infra",
      bio: "Loves SREing.",
    })
    expect(parsed.success).toBe(true)
  })

  it("rejects an empty name", () => {
    const parsed = ProfileFormSchema.safeParse({ name: "" })
    expect(parsed.success).toBe(false)
  })

  it("rejects a name over the max length", () => {
    const parsed = ProfileFormSchema.safeParse({
      name: "x".repeat(PROFILE_NAME_MAX + 1),
    })
    expect(parsed.success).toBe(false)
  })

  it("rejects a defaultDeptId over the max length", () => {
    const parsed = ProfileFormSchema.safeParse({
      name: "Alice",
      defaultDeptId: "x".repeat(PROFILE_DEPT_ID_MAX + 1),
    })
    expect(parsed.success).toBe(false)
  })

  it("rejects a bio over the max length", () => {
    const parsed = ProfileFormSchema.safeParse({
      name: "Alice",
      bio: "x".repeat(PROFILE_BIO_MAX + 1),
    })
    expect(parsed.success).toBe(false)
  })

  it("rejects a missing name field entirely", () => {
    const parsed = ProfileFormSchema.safeParse({ defaultDeptId: "eng" })
    expect(parsed.success).toBe(false)
  })
})
