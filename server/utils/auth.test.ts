// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock the reviewers repo so we can dictate what isSuperAdmin returns.
vi.mock("~~/server/repositories/reviewers", () => ({
  isSuperAdmin: vi.fn(),
}))

// Mock useDb so auth.ts doesn't reach for a real postgres connection.
vi.mock("./db", () => ({ useDb: () => ({ __tag: "db" }) }))

// Mock better-auth so makeAuth() returns a stub whose getSession we can drive.
const getSessionMock = vi.fn()
vi.mock("better-auth", () => ({
  betterAuth: () => ({ api: { getSession: getSessionMock } }),
}))
vi.mock("better-auth/adapters/drizzle", () => ({
  drizzleAdapter: () => ({}),
}))

const reviewersRepo = await import("~~/server/repositories/reviewers")
const { requireSuperAdmin } = await import("./auth")

const FAKE_EVENT = {
  context: {},
  node: { req: { headers: {} } },
} as unknown as Parameters<typeof requireSuperAdmin>[0]

beforeEach(() => {
  getSessionMock.mockReset()
  vi.mocked(reviewersRepo.isSuperAdmin).mockReset()
})

describe("requireSuperAdmin", () => {
  it("throws 401 Unauthenticated when there is no session", async () => {
    getSessionMock.mockResolvedValue(null)
    await expect(requireSuperAdmin(FAKE_EVENT)).rejects.toMatchObject({
      statusCode: 401,
    })
    // Short-circuits before touching the membership check.
    expect(reviewersRepo.isSuperAdmin).not.toHaveBeenCalled()
  })

  it("throws 403 Forbidden when the session exists but the user is not a super-admin", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u-1", email: "a@x" } })
    vi.mocked(reviewersRepo.isSuperAdmin).mockResolvedValue(false)
    await expect(requireSuperAdmin(FAKE_EVENT)).rejects.toMatchObject({
      statusCode: 403,
    })
    expect(reviewersRepo.isSuperAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ __tag: "db" }),
      "u-1",
    )
  })

  it("returns the session user when isSuperAdmin resolves true", async () => {
    const user = { id: "u-super", email: "amy@example.test" }
    getSessionMock.mockResolvedValue({ user })
    vi.mocked(reviewersRepo.isSuperAdmin).mockResolvedValue(true)
    const out = await requireSuperAdmin(FAKE_EVENT)
    expect(out).toEqual(user)
  })
})
