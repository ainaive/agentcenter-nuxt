import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("~~/server/repositories/extensions", () => ({
  updateVisibility: vi.fn(),
}))
vi.mock("~~/server/repositories/files", () => ({
  updateScanStatus: vi.fn(),
}))
vi.mock("~~/server/repositories/versions", () => ({
  findById: vi.fn(),
  findByIdWithScope: vi.fn(),
  updateStatus: vi.fn(),
  updateStatusGuarded: vi.fn(),
  updatePublishedAt: vi.fn(),
}))

const TX = { __tag: "tx" } as const
const DB = {
  __tag: "db",
  transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb(TX)),
} as const

vi.mock("./db", () => ({ useDb: () => DB }))

const extensionsRepo = await import("~~/server/repositories/extensions")
const filesRepo = await import("~~/server/repositories/files")
const versionsRepo = await import("~~/server/repositories/versions")
const {
  submit,
  recordScanResult,
  publishVersion,
  VersionStateError,
} = await import("./extensions-state")

beforeEach(() => {
  vi.clearAllMocks()
  DB.transaction.mockImplementation(async (cb) => cb(TX))
})

describe("submit", () => {
  it("calls updateStatusGuarded from pending/scanning → scanning", async () => {
    vi.mocked(versionsRepo.updateStatusGuarded).mockResolvedValue({ updated: true })

    await submit("ver-1")

    expect(versionsRepo.updateStatusGuarded).toHaveBeenCalledWith(DB, "ver-1", {
      from: ["pending", "scanning"],
      to: "scanning",
    })
  })

  it("throws VersionStateError(version_not_found) when no row was updated", async () => {
    vi.mocked(versionsRepo.updateStatusGuarded).mockResolvedValue({ updated: false })

    await expect(submit("ver-missing")).rejects.toBeInstanceOf(VersionStateError)
  })
})

describe("recordScanResult", () => {
  it("throws when the version row doesn't exist", async () => {
    vi.mocked(versionsRepo.findByIdWithScope).mockResolvedValue(null)

    await expect(
      recordScanResult("ver-1", "file-1", {
        ok: true,
        checksum: "abc",
        scanReport: {},
      }),
    ).rejects.toBeInstanceOf(VersionStateError)
    expect(DB.transaction).not.toHaveBeenCalled()
  })

  it("throws when the version status is not 'scanning'", async () => {
    vi.mocked(versionsRepo.findByIdWithScope).mockResolvedValue({
      status: "ready",
      extensionId: "ext-1",
      scope: "personal",
    })

    await expect(
      recordScanResult("ver-1", "file-1", {
        ok: true,
        checksum: "abc",
        scanReport: {},
      }),
    ).rejects.toBeInstanceOf(VersionStateError)
  })

  it("personal + ok: updates file/version and flips extension to published inside one tx", async () => {
    vi.mocked(versionsRepo.findByIdWithScope).mockResolvedValue({
      status: "scanning",
      extensionId: "ext-1",
      scope: "personal",
    })

    await recordScanResult("ver-1", "file-1", {
      ok: true,
      checksum: "deadbeef",
      scanReport: { manifestOk: true },
    })

    expect(DB.transaction).toHaveBeenCalledTimes(1)
    expect(filesRepo.updateScanStatus).toHaveBeenCalledWith(TX, "file-1", {
      scanStatus: "clean",
      scanReport: { manifestOk: true },
      checksumSha256: "deadbeef",
    })
    expect(versionsRepo.updateStatus).toHaveBeenCalledWith(TX, "ver-1", {
      status: "ready",
      publishedAt: expect.any(Date),
    })
    expect(extensionsRepo.updateVisibility).toHaveBeenCalledWith(TX, "ext-1", {
      visibility: "published",
      publishedAt: expect.any(Date),
    })
  })

  it("org + ok: updates file/version with publishedAt:null but does NOT flip the extension", async () => {
    vi.mocked(versionsRepo.findByIdWithScope).mockResolvedValue({
      status: "scanning",
      extensionId: "ext-1",
      scope: "org",
    })

    await recordScanResult("ver-1", "file-1", {
      ok: true,
      checksum: "abc",
      scanReport: {},
    })

    expect(versionsRepo.updateStatus).toHaveBeenCalledWith(TX, "ver-1", {
      status: "ready",
      publishedAt: null,
    })
    expect(extensionsRepo.updateVisibility).not.toHaveBeenCalled()
  })

  it("fail: flags the file, rejects the version, and never touches the extension", async () => {
    vi.mocked(versionsRepo.findByIdWithScope).mockResolvedValue({
      status: "scanning",
      extensionId: "ext-1",
      scope: "personal",
    })

    await recordScanResult("ver-1", "file-1", {
      ok: false,
      reason: "missing_manifest",
      scanReport: { manifestOk: false },
    })

    expect(filesRepo.updateScanStatus).toHaveBeenCalledWith(TX, "file-1", {
      scanStatus: "flagged",
      scanReport: { manifestOk: false },
    })
    expect(versionsRepo.updateStatus).toHaveBeenCalledWith(TX, "ver-1", {
      status: "rejected",
    })
    expect(extensionsRepo.updateVisibility).not.toHaveBeenCalled()
  })
})

describe("publishVersion", () => {
  it("throws when the version doesn't exist", async () => {
    vi.mocked(versionsRepo.findById).mockResolvedValue(null)
    await expect(publishVersion("ver-1")).rejects.toBeInstanceOf(VersionStateError)
    expect(DB.transaction).not.toHaveBeenCalled()
  })

  it("throws when the version is not 'ready'", async () => {
    vi.mocked(versionsRepo.findById).mockResolvedValue({
      id: "ver-1",
      extensionId: "ext-1",
      status: "scanning",
    })
    await expect(publishVersion("ver-1")).rejects.toBeInstanceOf(VersionStateError)
  })

  it("flips extension to published and stamps version publishedAt inside one tx", async () => {
    vi.mocked(versionsRepo.findById).mockResolvedValue({
      id: "ver-1",
      extensionId: "ext-1",
      status: "ready",
    })

    const result = await publishVersion("ver-1")
    expect(result).toEqual({ extensionId: "ext-1" })

    expect(DB.transaction).toHaveBeenCalledTimes(1)
    expect(extensionsRepo.updateVisibility).toHaveBeenCalledWith(TX, "ext-1", {
      visibility: "published",
      publishedAt: expect.any(Date),
    })
    expect(versionsRepo.updatePublishedAt).toHaveBeenCalledWith(
      TX,
      "ver-1",
      expect.any(Date),
    )
  })
})
