// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock the admins repo so we can dictate what isSuperAdmin /
// findCoveringAdmin return.
vi.mock("~~/server/repositories/admins", () => ({
  isSuperAdmin: vi.fn(),
  findCoveringAdmin: vi.fn(),
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

const adminsRepo = await import("~~/server/repositories/admins")
const { requireCellAdmin, requireSuperAdmin } = await import("./auth")

const SKILLS_COMPANY_MACRO = {
  extensionCategory: "skills" as const,
  tier: "company" as const,
  productLineId: null,
  categoryLevel: "macro" as const,
  categoryKey: "softDev",
}

const FAKE_EVENT = {
  context: {},
  node: { req: { headers: {} } },
} as unknown as Parameters<typeof requireSuperAdmin>[0]

beforeEach(() => {
  getSessionMock.mockReset()
  vi.mocked(adminsRepo.isSuperAdmin).mockReset()
  vi.mocked(adminsRepo.findCoveringAdmin).mockReset()
})

describe("requireSuperAdmin", () => {
  it("throws 401 Unauthenticated when there is no session", async () => {
    getSessionMock.mockResolvedValue(null)
    await expect(requireSuperAdmin(FAKE_EVENT)).rejects.toMatchObject({
      statusCode: 401,
    })
    // Short-circuits before touching the membership check.
    expect(adminsRepo.isSuperAdmin).not.toHaveBeenCalled()
  })

  it("throws 403 Forbidden when the session exists but the user is not a super-admin", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u-1", email: "a@x" } })
    vi.mocked(adminsRepo.isSuperAdmin).mockResolvedValue(false)
    await expect(requireSuperAdmin(FAKE_EVENT)).rejects.toMatchObject({
      statusCode: 403,
    })
    expect(adminsRepo.isSuperAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ __tag: "db" }),
      "u-1",
    )
  })

  it("returns the session user when isSuperAdmin resolves true", async () => {
    const user = { id: "u-super", email: "amy@example.test" }
    getSessionMock.mockResolvedValue({ user })
    vi.mocked(adminsRepo.isSuperAdmin).mockResolvedValue(true)
    const out = await requireSuperAdmin(FAKE_EVENT)
    expect(out).toEqual(user)
  })
})

describe("requireCellAdmin", () => {
  it("throws 401 when there is no session", async () => {
    getSessionMock.mockResolvedValue(null)
    await expect(
      requireCellAdmin(FAKE_EVENT, SKILLS_COMPANY_MACRO),
    ).rejects.toMatchObject({ statusCode: 401 })
    // Short-circuits before any repo call.
    expect(adminsRepo.isSuperAdmin).not.toHaveBeenCalled()
    expect(adminsRepo.findCoveringAdmin).not.toHaveBeenCalled()
  })

  it("returns the user when they are a super-admin (no covering probe needed)", async () => {
    const user = { id: "u-super", email: "amy@example.test" }
    getSessionMock.mockResolvedValue({ user })
    vi.mocked(adminsRepo.isSuperAdmin).mockResolvedValue(true)
    const out = await requireCellAdmin(FAKE_EVENT, SKILLS_COMPANY_MACRO)
    expect(out).toEqual(user)
    expect(adminsRepo.findCoveringAdmin).not.toHaveBeenCalled()
  })

  it("returns the user when they hold an admin row covering the target cell", async () => {
    const user = { id: "u-1", email: "a@x" }
    getSessionMock.mockResolvedValue({ user })
    vi.mocked(adminsRepo.isSuperAdmin).mockResolvedValue(false)
    vi.mocked(adminsRepo.findCoveringAdmin).mockResolvedValue(true)
    const out = await requireCellAdmin(FAKE_EVENT, SKILLS_COMPANY_MACRO)
    expect(out).toEqual(user)
    expect(adminsRepo.findCoveringAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ __tag: "db" }),
      "u-1",
      SKILLS_COMPANY_MACRO,
    )
  })

  it("throws 403 not_authorized when no covering row exists", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u-1", email: "a@x" } })
    vi.mocked(adminsRepo.isSuperAdmin).mockResolvedValue(false)
    vi.mocked(adminsRepo.findCoveringAdmin).mockResolvedValue(false)
    await expect(
      requireCellAdmin(FAKE_EVENT, SKILLS_COMPANY_MACRO),
    ).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: "not_authorized",
    })
  })
})
