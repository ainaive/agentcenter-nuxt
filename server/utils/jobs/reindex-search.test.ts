import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("~~/server/repositories/versions", () => ({
  findByIdWithScope: vi.fn(),
}))
vi.mock("../extensions-state", () => ({
  publishVersion: vi.fn(),
  VersionStateError: class VersionStateError extends Error {},
}))
vi.mock("../db", () => ({ useDb: () => ({ __tag: "db" }) }))
// Avoid pulling the Inngest runtime / client init at import time.
vi.mock("../inngest", () => ({
  inngest: { createFunction: () => ({}) },
}))

const versionsRepo = await import("~~/server/repositories/versions")
const { publishVersion } = await import("../extensions-state")
const { reindexPublish } = await import("./reindex-search")

function fakeStep() {
  return {
    run: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn()),
    sendEvent: vi.fn(async () => ({})),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("reindexPublish", () => {
  it("personal: publishes the version and fires the published notify", async () => {
    vi.mocked(versionsRepo.findByIdWithScope).mockResolvedValue({
      status: "ready",
      extensionId: "ext-1",
      scope: "personal",
    })
    vi.mocked(publishVersion).mockResolvedValue({ extensionId: "ext-1" })

    const step = fakeStep()
    const result = await reindexPublish("ver-1", step)

    expect(publishVersion).toHaveBeenCalledWith("ver-1")
    expect(step.sendEvent).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ ok: true, extensionId: "ext-1" })
  })

  it("org: gated — does NOT publish or notify", async () => {
    vi.mocked(versionsRepo.findByIdWithScope).mockResolvedValue({
      status: "ready",
      extensionId: "ext-1",
      scope: "org",
    })

    const step = fakeStep()
    const result = await reindexPublish("ver-1", step)

    expect(publishVersion).not.toHaveBeenCalled()
    expect(step.sendEvent).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: true, gated: true, scope: "org" })
  })

  it("enterprise: gated — does NOT publish or notify", async () => {
    vi.mocked(versionsRepo.findByIdWithScope).mockResolvedValue({
      status: "ready",
      extensionId: "ext-2",
      scope: "enterprise",
    })

    const step = fakeStep()
    const result = await reindexPublish("ver-2", step)

    expect(publishVersion).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: true, gated: true, scope: "enterprise" })
  })
})
