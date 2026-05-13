import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("~~/server/repositories/collections", () => ({
  getOrCreateSystem: vi.fn(),
  addItem: vi.fn(),
}))
vi.mock("~~/server/repositories/extensions", () => ({
  findById: vi.fn(),
  findBySlug: vi.fn(),
  incrementDownloads: vi.fn(),
}))
vi.mock("~~/server/repositories/installs", () => ({
  findByUserAndExtension: vi.fn(),
  insertInstall: vi.fn(),
}))
vi.mock("~~/server/repositories/versions", () => ({
  listLatestReadyForExtension: vi.fn(),
}))

const TX = { __tag: "tx" } as const
const DB = {
  __tag: "db",
  transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb(TX)),
} as const

vi.mock("./db", () => ({ useDb: () => DB }))

const collectionsRepo = await import("~~/server/repositories/collections")
const extensionsRepo = await import("~~/server/repositories/extensions")
const installsRepo = await import("~~/server/repositories/installs")
const versionsRepo = await import("~~/server/repositories/versions")
const { recordInstall, InstallError } = await import("./installs")

const EXT_ROW = {
  id: "ext-1",
  slug: "ext-1",
  category: "skills",
  scope: "personal",
  visibility: "published",
  // The orchestrator only reads `id`; other fields are stand-ins for the
  // detail-select shape `extensionsRepo.findById/findBySlug` returns.
}

beforeEach(() => {
  vi.clearAllMocks()
  DB.transaction.mockImplementation(async (cb) => cb(TX))

  // Common defaults — individual tests override.
  vi.mocked(collectionsRepo.getOrCreateSystem).mockResolvedValue({ id: "col-1" })
  vi.mocked(installsRepo.findByUserAndExtension).mockResolvedValue(null)
})

describe("recordInstall — extension resolution", () => {
  it("looks up by id when params.extension has `id`", async () => {
    vi.mocked(extensionsRepo.findById).mockResolvedValue(EXT_ROW as never)
    vi.mocked(versionsRepo.listLatestReadyForExtension).mockResolvedValue([
      { version: "1.0.0", publishedAt: null, createdAt: new Date() },
    ])

    await recordInstall({
      userId: "u-1",
      extension: { id: "ext-1" },
      source: "web",
    })

    expect(extensionsRepo.findById).toHaveBeenCalledWith(DB, "ext-1")
    expect(extensionsRepo.findBySlug).not.toHaveBeenCalled()
  })

  it("looks up by slug when params.extension has `slug`", async () => {
    vi.mocked(extensionsRepo.findBySlug).mockResolvedValue(EXT_ROW as never)
    vi.mocked(versionsRepo.listLatestReadyForExtension).mockResolvedValue([
      { version: "1.0.0", publishedAt: null, createdAt: new Date() },
    ])

    await recordInstall({
      userId: "u-1",
      extension: { slug: "ext-1" },
      source: "cli",
    })

    expect(extensionsRepo.findBySlug).toHaveBeenCalledWith(DB, "ext-1")
    expect(extensionsRepo.findById).not.toHaveBeenCalled()
  })

  it("throws InstallError(extension_not_found) when the extension is missing", async () => {
    vi.mocked(extensionsRepo.findById).mockResolvedValue(null)

    await expect(
      recordInstall({
        userId: "u-1",
        extension: { id: "ext-missing" },
        source: "web",
      }),
    ).rejects.toBeInstanceOf(InstallError)
    expect(DB.transaction).not.toHaveBeenCalled()
  })
})

describe("recordInstall — version selection", () => {
  beforeEach(() => {
    vi.mocked(extensionsRepo.findById).mockResolvedValue(EXT_ROW as never)
  })

  it("uses params.version verbatim without loading candidates", async () => {
    await recordInstall({
      userId: "u-1",
      extension: { id: "ext-1" },
      source: "web",
      version: "2.5.0",
    })

    expect(versionsRepo.listLatestReadyForExtension).not.toHaveBeenCalled()
    expect(installsRepo.insertInstall).toHaveBeenCalledWith(
      TX,
      expect.objectContaining({ version: "2.5.0" }),
    )
  })

  it("picks the first candidate when no version is requested", async () => {
    vi.mocked(versionsRepo.listLatestReadyForExtension).mockResolvedValue([
      { version: "2.0.0", publishedAt: null, createdAt: new Date() },
      { version: "1.0.0", publishedAt: null, createdAt: new Date() },
    ])

    const result = await recordInstall({
      userId: "u-1",
      extension: { id: "ext-1" },
      source: "web",
    })

    expect(result.version).toBe("2.0.0")
  })

  it("throws no_published_version when there are no candidates and no version requested", async () => {
    vi.mocked(versionsRepo.listLatestReadyForExtension).mockResolvedValue([])

    await expect(
      recordInstall({
        userId: "u-1",
        extension: { id: "ext-1" },
        source: "web",
      }),
    ).rejects.toBeInstanceOf(InstallError)
    expect(DB.transaction).not.toHaveBeenCalled()
  })
})

describe("recordInstall — transactional writes", () => {
  beforeEach(() => {
    vi.mocked(extensionsRepo.findById).mockResolvedValue(EXT_ROW as never)
  })

  it("writes install row, adds collection item, and increments downloads — all on tx", async () => {
    await recordInstall({
      userId: "u-1",
      extension: { id: "ext-1" },
      source: "web",
      version: "1.0.0",
    })

    expect(installsRepo.insertInstall).toHaveBeenCalledWith(TX, {
      id: expect.any(String),
      userId: "u-1",
      extensionId: "ext-1",
      version: "1.0.0",
      source: "web",
    })
    expect(collectionsRepo.addItem).toHaveBeenCalledWith(TX, "col-1", "ext-1")
    expect(extensionsRepo.incrementDownloads).toHaveBeenCalledWith(TX, "ext-1")
  })

  it("isFirstInstall=true when findByUserAndExtension returns null", async () => {
    vi.mocked(installsRepo.findByUserAndExtension).mockResolvedValue(null)
    const result = await recordInstall({
      userId: "u-1",
      extension: { id: "ext-1" },
      source: "web",
      version: "1.0.0",
    })
    expect(result.isFirstInstall).toBe(true)
  })

  it("isFirstInstall=false when a prior install exists", async () => {
    vi.mocked(installsRepo.findByUserAndExtension).mockResolvedValue({ id: "prev" })
    const result = await recordInstall({
      userId: "u-1",
      extension: { id: "ext-1" },
      source: "web",
      version: "1.0.0",
    })
    expect(result.isFirstInstall).toBe(false)
  })
})
