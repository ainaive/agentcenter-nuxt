import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("~~/server/repositories/approvals", () => ({
  insertRequest: vi.fn(),
  findById: vi.fn(),
  findPendingByExtension: vi.fn(),
  listForPublisher: vi.fn(),
  listPendingForCells: vi.fn(),
  applyDecision: vi.fn(),
  applyWithdraw: vi.fn(),
  setExtensionOfficialTier: vi.fn(),
  applyRevocation: vi.fn(),
  isReviewerForCell: vi.fn(),
}))
vi.mock("~~/server/repositories/reviewers", () => ({
  isSuperAdmin: vi.fn(),
  listCellsForUser: vi.fn(),
  listMatrix: vi.fn(),
}))
vi.mock("~~/server/repositories/extensions", () => ({
  findById: vi.fn(),
}))

const TX = { __tag: "tx" } as const
const DB = {
  __tag: "db",
  transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb(TX)),
} as const

vi.mock("./db", () => ({ useDb: () => DB }))

const sendEvent = vi.fn(async () => undefined)
// `safeSend` shares the same spy so existing `expect(sendEvent).…`
// assertions continue to observe approval-side event sends. The real
// `safeSend` wraps `inngest.send` in try/catch; the orchestrator's
// behavior under a rejected send is covered by the dedicated test below.
vi.mock("./inngest", () => ({
  inngest: { send: sendEvent },
  safeSend: async (event: unknown) => {
    try {
      await sendEvent(event as Parameters<typeof sendEvent>[0])
    } catch (error) {
      console.error("[inngest] safeSend failed", error)
    }
  },
}))

const approvalsRepo = await import("~~/server/repositories/approvals")
const reviewersRepo = await import("~~/server/repositories/reviewers")
const extensionsRepo = await import("~~/server/repositories/extensions")
const {
  submitRequest,
  decideRequest,
  withdrawRequest,
  listReviewerQueue,
  revokeTier,
  ApprovalError,
} = await import("./approvals")

// Minimal stand-in for `extensionsRepo.findById`'s detailSelect row — the
// orchestrator only reads publisherUserId, visibility, and id.
const EXT_PUBLISHED = {
  id: "ext-1",
  publisherUserId: "u-pub",
  visibility: "published" as const,
}

const PENDING_ROW = {
  id: "req-1",
  extensionId: "ext-1",
  requestedTier: "company" as const,
  subCat: "softDev",
  productLineId: null as string | null,
  requestedByUserId: "u-pub",
  reason: null,
  status: "pending" as const,
  decidedByUserId: null,
  decidedAt: null,
  reviewerNote: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
  DB.transaction.mockImplementation(async (cb) => cb(TX))
})

describe("submitRequest", () => {
  beforeEach(() => {
    vi.mocked(extensionsRepo.findById).mockResolvedValue(EXT_PUBLISHED as never)
    vi.mocked(approvalsRepo.findPendingByExtension).mockResolvedValue(null)
    vi.mocked(approvalsRepo.insertRequest).mockResolvedValue(PENDING_ROW)
  })

  it("inserts a pending request on the transaction and emits the requested event", async () => {
    await submitRequest({
      extensionId: "ext-1",
      requestedTier: "company",
      subCat: "softDev",
      productLineId: null,
      userId: "u-pub",
      reason: "lots of usage",
    })

    expect(approvalsRepo.insertRequest).toHaveBeenCalledWith(
      TX,
      expect.objectContaining({
        extensionId: "ext-1",
        requestedTier: "company",
        subCat: "softDev",
        productLineId: null,
        requestedByUserId: "u-pub",
        reason: "lots of usage",
      }),
    )
    expect(sendEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "extension/approval.requested",
        data: expect.objectContaining({
          requestId: "req-1",
          extensionId: "ext-1",
          requestedTier: "company",
          subCat: "softDev",
        }),
      }),
    )
  })

  it("still resolves with the row when the inngest send rejects", async () => {
    sendEvent.mockRejectedValueOnce(new Error("fetch failed"))
    const row = await submitRequest({
      extensionId: "ext-1",
      requestedTier: "company",
      subCat: "softDev",
      productLineId: null,
      userId: "u-pub",
      reason: undefined,
    })
    expect(row).toEqual(PENDING_ROW)
    expect(approvalsRepo.insertRequest).toHaveBeenCalledTimes(1)
    expect(sendEvent).toHaveBeenCalledTimes(1)
  })

  it("maps undefined reason to null on the insert row", async () => {
    await submitRequest({
      extensionId: "ext-1",
      requestedTier: "productLine",
      subCat: "docs",
      productLineId: "wireless",
      userId: "u-pub",
      reason: undefined,
    })
    expect(approvalsRepo.insertRequest).toHaveBeenCalledWith(
      TX,
      expect.objectContaining({ reason: null }),
    )
  })

  it("throws missing_product_line when productLine tier omits productLineId", async () => {
    await expect(
      submitRequest({
        extensionId: "ext-1",
        requestedTier: "productLine",
        subCat: "docs",
        productLineId: null,
        userId: "u-pub",
        reason: undefined,
      }),
    ).rejects.toMatchObject({ code: "missing_product_line" })
    expect(DB.transaction).not.toHaveBeenCalled()
  })

  it("throws unexpected_product_line when company tier carries a productLineId", async () => {
    await expect(
      submitRequest({
        extensionId: "ext-1",
        requestedTier: "company",
        subCat: "docs",
        productLineId: "wireless",
        userId: "u-pub",
        reason: undefined,
      }),
    ).rejects.toMatchObject({ code: "unexpected_product_line" })
    expect(DB.transaction).not.toHaveBeenCalled()
  })

  it("throws extension_not_found when the extension is missing", async () => {
    vi.mocked(extensionsRepo.findById).mockResolvedValue(null)
    await expect(
      submitRequest({
        extensionId: "ext-x",
        requestedTier: "company",
        subCat: "docs",
        productLineId: null,
        userId: "u-pub",
        reason: undefined,
      }),
    ).rejects.toMatchObject({
      name: "ApprovalError",
      code: "extension_not_found",
    })
    expect(DB.transaction).not.toHaveBeenCalled()
  })

  it("throws not_publisher_owner when the caller did not publish it", async () => {
    vi.mocked(extensionsRepo.findById).mockResolvedValue({
      ...EXT_PUBLISHED,
      publisherUserId: "u-other",
    } as never)
    await expect(
      submitRequest({
        extensionId: "ext-1",
        requestedTier: "company",
        subCat: "docs",
        productLineId: null,
        userId: "u-pub",
        reason: undefined,
      }),
    ).rejects.toMatchObject({ code: "not_publisher_owner" })
  })

  it("throws extension_not_published when the extension is still a draft", async () => {
    vi.mocked(extensionsRepo.findById).mockResolvedValue({
      ...EXT_PUBLISHED,
      visibility: "draft",
    } as never)
    await expect(
      submitRequest({
        extensionId: "ext-1",
        requestedTier: "company",
        subCat: "docs",
        productLineId: null,
        userId: "u-pub",
        reason: undefined,
      }),
    ).rejects.toMatchObject({ code: "extension_not_published" })
  })

  it("throws duplicate_pending_request when an open request already exists", async () => {
    vi.mocked(approvalsRepo.findPendingByExtension).mockResolvedValue(
      PENDING_ROW,
    )
    await expect(
      submitRequest({
        extensionId: "ext-1",
        requestedTier: "company",
        subCat: "docs",
        productLineId: null,
        userId: "u-pub",
        reason: undefined,
      }),
    ).rejects.toMatchObject({ code: "duplicate_pending_request" })
    expect(approvalsRepo.insertRequest).not.toHaveBeenCalled()
  })

  it("checks for duplicates inside the transaction, not before it", async () => {
    // Capture the order: the first call to findPendingByExtension must
    // receive TX (the transaction handle), not DB, so a concurrent insert
    // committed after the orchestrator's pre-transaction read can still be
    // detected.
    await submitRequest({
      extensionId: "ext-1",
      requestedTier: "company",
      subCat: "docs",
      productLineId: null,
      userId: "u-pub",
      reason: undefined,
    })
    expect(approvalsRepo.findPendingByExtension).toHaveBeenCalledWith(
      TX,
      "ext-1",
    )
  })
})

describe("decideRequest", () => {
  beforeEach(() => {
    vi.mocked(approvalsRepo.findById).mockResolvedValue(PENDING_ROW)
    vi.mocked(reviewersRepo.isSuperAdmin).mockResolvedValue(false)
    vi.mocked(approvalsRepo.isReviewerForCell).mockResolvedValue(true)
    // Default the optimistic-locking return to 1 (success). Tests that
    // exercise the race-loss path override this to 0.
    vi.mocked(approvalsRepo.applyDecision).mockResolvedValue(1)
  })

  it("approves: stamps the request and the extension tier on the tx", async () => {
    vi.mocked(approvalsRepo.findById)
      .mockResolvedValueOnce(PENDING_ROW)
      .mockResolvedValueOnce({ ...PENDING_ROW, status: "approved" })

    await decideRequest({
      requestId: "req-1",
      action: { decision: "approve" },
      reviewerUserId: "u-rev",
    })

    expect(approvalsRepo.applyDecision).toHaveBeenCalledWith(
      TX,
      "req-1",
      expect.objectContaining({ status: "approved", decidedByUserId: "u-rev" }),
    )
    expect(approvalsRepo.setExtensionOfficialTier).toHaveBeenCalledWith(
      TX,
      "ext-1",
      "company",
      null,
    )
    expect(sendEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "extension/approval.decided",
        data: expect.objectContaining({ decision: "approved" }),
      }),
    )
  })

  it("rejects: stamps the request only, no extension write", async () => {
    vi.mocked(approvalsRepo.findById)
      .mockResolvedValueOnce(PENDING_ROW)
      .mockResolvedValueOnce({ ...PENDING_ROW, status: "rejected" })

    await decideRequest({
      requestId: "req-1",
      action: { decision: "reject", note: "needs a license" },
      reviewerUserId: "u-rev",
    })

    expect(approvalsRepo.applyDecision).toHaveBeenCalledWith(
      TX,
      "req-1",
      expect.objectContaining({
        status: "rejected",
        reviewerNote: "needs a license",
      }),
    )
    expect(approvalsRepo.setExtensionOfficialTier).not.toHaveBeenCalled()
  })

  it("super-admins bypass the reviewer-cell check", async () => {
    vi.mocked(reviewersRepo.isSuperAdmin).mockResolvedValue(true)
    vi.mocked(approvalsRepo.isReviewerForCell).mockResolvedValue(false)
    vi.mocked(approvalsRepo.findById)
      .mockResolvedValueOnce(PENDING_ROW)
      .mockResolvedValueOnce({ ...PENDING_ROW, status: "approved" })

    await decideRequest({
      requestId: "req-1",
      action: { decision: "approve" },
      reviewerUserId: "u-super",
    })
    expect(approvalsRepo.applyDecision).toHaveBeenCalled()
  })

  it("throws not_reviewer when neither super-admin nor an assigned reviewer", async () => {
    vi.mocked(reviewersRepo.isSuperAdmin).mockResolvedValue(false)
    vi.mocked(approvalsRepo.isReviewerForCell).mockResolvedValue(false)

    await expect(
      decideRequest({
        requestId: "req-1",
        action: { decision: "approve" },
        reviewerUserId: "u-other",
      }),
    ).rejects.toMatchObject({ code: "not_reviewer" })
    expect(DB.transaction).not.toHaveBeenCalled()
  })

  it("throws request_not_found when the request is missing", async () => {
    vi.mocked(approvalsRepo.findById).mockResolvedValue(null)
    await expect(
      decideRequest({
        requestId: "req-x",
        action: { decision: "approve" },
        reviewerUserId: "u-rev",
      }),
    ).rejects.toMatchObject({ code: "request_not_found" })
  })

  it("throws request_not_pending when the request was already decided", async () => {
    vi.mocked(approvalsRepo.findById).mockResolvedValue({
      ...PENDING_ROW,
      status: "approved",
    })
    await expect(
      decideRequest({
        requestId: "req-1",
        action: { decision: "approve" },
        reviewerUserId: "u-rev",
      }),
    ).rejects.toMatchObject({ code: "request_not_pending" })
  })

  it("throws request_not_pending when the optimistic-lock UPDATE affects zero rows (race lost)", async () => {
    // Pre-check sees pending; a concurrent reviewer commits between the
    // pre-check and the orchestrator's transaction; the repo's WHERE
    // clause filters us out and `applyDecision` returns 0.
    vi.mocked(approvalsRepo.findById).mockResolvedValue(PENDING_ROW)
    vi.mocked(approvalsRepo.applyDecision).mockResolvedValue(0)

    await expect(
      decideRequest({
        requestId: "req-1",
        action: { decision: "approve" },
        reviewerUserId: "u-rev",
      }),
    ).rejects.toMatchObject({ code: "request_not_pending" })
    expect(approvalsRepo.setExtensionOfficialTier).not.toHaveBeenCalled()
    expect(sendEvent).not.toHaveBeenCalled()
  })
})

describe("withdrawRequest", () => {
  beforeEach(() => {
    vi.mocked(approvalsRepo.applyWithdraw).mockResolvedValue(1)
  })

  it("flips the request to withdrawn when the publisher owns it and it's pending", async () => {
    vi.mocked(approvalsRepo.findById)
      .mockResolvedValueOnce(PENDING_ROW)
      .mockResolvedValueOnce({ ...PENDING_ROW, status: "withdrawn" })

    await withdrawRequest({ requestId: "req-1", userId: "u-pub" })
    expect(approvalsRepo.applyWithdraw).toHaveBeenCalledWith(
      DB,
      "req-1",
      expect.any(Date),
    )
  })

  it("throws request_not_pending when the optimistic-lock UPDATE affects zero rows", async () => {
    vi.mocked(approvalsRepo.findById).mockResolvedValue(PENDING_ROW)
    vi.mocked(approvalsRepo.applyWithdraw).mockResolvedValue(0)

    await expect(
      withdrawRequest({ requestId: "req-1", userId: "u-pub" }),
    ).rejects.toMatchObject({ code: "request_not_pending" })
  })

  it("throws not_requester when a different user tries to withdraw", async () => {
    vi.mocked(approvalsRepo.findById).mockResolvedValue(PENDING_ROW)
    await expect(
      withdrawRequest({ requestId: "req-1", userId: "u-other" }),
    ).rejects.toMatchObject({ code: "not_requester" })
  })

  it("throws request_not_pending when the request has already been decided", async () => {
    vi.mocked(approvalsRepo.findById).mockResolvedValue({
      ...PENDING_ROW,
      status: "approved",
    })
    await expect(
      withdrawRequest({ requestId: "req-1", userId: "u-pub" }),
    ).rejects.toMatchObject({ code: "request_not_pending" })
  })

  it("throws request_not_found when the request is missing", async () => {
    vi.mocked(approvalsRepo.findById).mockResolvedValue(null)
    await expect(
      withdrawRequest({ requestId: "req-x", userId: "u-pub" }),
    ).rejects.toMatchObject({ code: "request_not_found" })
  })
})

describe("listReviewerQueue", () => {
  it("uses the user's assigned cells when not a super-admin", async () => {
    vi.mocked(reviewersRepo.isSuperAdmin).mockResolvedValue(false)
    vi.mocked(reviewersRepo.listCellsForUser).mockResolvedValue([
      { tier: "productLine", subCat: "softDev", productLineId: "wireless" },
    ])
    vi.mocked(approvalsRepo.listPendingForCells).mockResolvedValue([])

    await listReviewerQueue("u-rev")
    expect(approvalsRepo.listPendingForCells).toHaveBeenCalledWith(DB, [
      { tier: "productLine", subCat: "softDev", productLineId: "wireless" },
    ])
  })

  it("super-admins see pending requests across every cell currently in the matrix", async () => {
    vi.mocked(reviewersRepo.isSuperAdmin).mockResolvedValue(true)
    vi.mocked(reviewersRepo.listMatrix).mockResolvedValue([
      {
        id: "rev-1",
        tier: "productLine",
        subCat: "softDev",
        productLineId: "wireless",
        userId: "u-a",
        userEmail: "a@x",
        userName: null,
        createdAt: new Date(),
      },
      {
        id: "rev-2",
        tier: "company",
        subCat: "docs",
        productLineId: null,
        userId: "u-b",
        userEmail: "b@x",
        userName: null,
        createdAt: new Date(),
      },
      // Duplicate cell with a different user — must dedupe to one cell.
      {
        id: "rev-3",
        tier: "productLine",
        subCat: "softDev",
        productLineId: "wireless",
        userId: "u-c",
        userEmail: "c@x",
        userName: null,
        createdAt: new Date(),
      },
    ])
    vi.mocked(approvalsRepo.listPendingForCells).mockResolvedValue([])

    await listReviewerQueue("u-super")
    const args = vi.mocked(approvalsRepo.listPendingForCells).mock.calls[0]
    const passed = (args![1] as Array<{
      tier: string
      subCat: string
      productLineId: string | null
    }>)
      .map((c) => `${c.tier}:${c.subCat}:${c.productLineId ?? "∅"}`)
      .sort()
    expect(passed).toEqual([
      "company:docs:∅",
      "productLine:softDev:wireless",
    ])
  })

  it("returns an empty array for a user with no cells (and not super-admin)", async () => {
    vi.mocked(reviewersRepo.isSuperAdmin).mockResolvedValue(false)
    vi.mocked(reviewersRepo.listCellsForUser).mockResolvedValue([])
    vi.mocked(approvalsRepo.listPendingForCells).mockResolvedValue([])

    const result = await listReviewerQueue("u-noone")
    expect(result).toEqual([])
    expect(approvalsRepo.listPendingForCells).toHaveBeenCalledWith(DB, [])
  })

  it("narrows the cells against tier / subCat / productLineId filters before the DB query", async () => {
    vi.mocked(reviewersRepo.isSuperAdmin).mockResolvedValue(false)
    vi.mocked(reviewersRepo.listCellsForUser).mockResolvedValue([
      { tier: "productLine", subCat: "softDev", productLineId: "wireless" },
      { tier: "productLine", subCat: "softDev", productLineId: "datacom" },
      { tier: "productLine", subCat: "docs", productLineId: "wireless" },
      { tier: "company", subCat: "softDev", productLineId: null },
    ])
    vi.mocked(approvalsRepo.listPendingForCells).mockResolvedValue([])

    await listReviewerQueue("u-rev", {
      tier: "productLine",
      productLineId: "wireless",
    })

    expect(approvalsRepo.listPendingForCells).toHaveBeenCalledWith(DB, [
      { tier: "productLine", subCat: "softDev", productLineId: "wireless" },
      { tier: "productLine", subCat: "docs", productLineId: "wireless" },
    ])
  })

  it("intersects subCat AND tier filters without leaking adjacent cells", async () => {
    vi.mocked(reviewersRepo.isSuperAdmin).mockResolvedValue(false)
    vi.mocked(reviewersRepo.listCellsForUser).mockResolvedValue([
      { tier: "productLine", subCat: "softDev", productLineId: "wireless" },
      { tier: "company", subCat: "softDev", productLineId: null },
      { tier: "company", subCat: "docs", productLineId: null },
    ])
    vi.mocked(approvalsRepo.listPendingForCells).mockResolvedValue([])

    await listReviewerQueue("u-rev", { tier: "company", subCat: "docs" })

    expect(approvalsRepo.listPendingForCells).toHaveBeenCalledWith(DB, [
      { tier: "company", subCat: "docs", productLineId: null },
    ])
  })

  it("returns [] without throwing when filters exclude every covered cell", async () => {
    vi.mocked(reviewersRepo.isSuperAdmin).mockResolvedValue(false)
    vi.mocked(reviewersRepo.listCellsForUser).mockResolvedValue([
      { tier: "productLine", subCat: "softDev", productLineId: "wireless" },
    ])
    vi.mocked(approvalsRepo.listPendingForCells).mockResolvedValue([])

    await listReviewerQueue("u-rev", { subCat: "cloud" })

    expect(approvalsRepo.listPendingForCells).toHaveBeenCalledWith(DB, [])
  })

  it("super-admin path applies the same filter against the matrix-wide cell set", async () => {
    vi.mocked(reviewersRepo.isSuperAdmin).mockResolvedValue(true)
    vi.mocked(reviewersRepo.listMatrix).mockResolvedValue([
      {
        id: "rev-1",
        tier: "productLine",
        subCat: "softDev",
        productLineId: "wireless",
        userId: "u-a",
        userEmail: "a@x",
        userName: null,
        createdAt: new Date(),
      },
      {
        id: "rev-2",
        tier: "company",
        subCat: "docs",
        productLineId: null,
        userId: "u-b",
        userEmail: "b@x",
        userName: null,
        createdAt: new Date(),
      },
    ])
    vi.mocked(approvalsRepo.listPendingForCells).mockResolvedValue([])

    await listReviewerQueue("u-super", { tier: "company" })

    expect(approvalsRepo.listPendingForCells).toHaveBeenCalledWith(DB, [
      { tier: "company", subCat: "docs", productLineId: null },
    ])
  })
})

describe("revokeTier", () => {
  const EXT_OFFICIAL = {
    id: "ext-1",
    publisherUserId: "u-pub",
    visibility: "published" as const,
    officialTier: "company" as const,
    productLineId: null as string | null,
  }

  beforeEach(() => {
    vi.mocked(extensionsRepo.findById).mockResolvedValue(EXT_OFFICIAL as never)
    vi.mocked(approvalsRepo.applyRevocation).mockResolvedValue(1)
  })

  it("clears tier + writes the audit trio via applyRevocation, then emits tier.revoked", async () => {
    const result = await revokeTier({
      extensionId: "ext-1",
      superAdminUserId: "u-super",
      note: "approved by mistake",
    })

    expect(approvalsRepo.applyRevocation).toHaveBeenCalledWith(
      TX,
      "ext-1",
      expect.objectContaining({
        revokedByUserId: "u-super",
        revocationNote: "approved by mistake",
      }),
    )
    expect(sendEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "extension/tier.revoked",
        data: expect.objectContaining({
          extensionId: "ext-1",
          revokedByUserId: "u-super",
          note: "approved by mistake",
        }),
      }),
    )
    expect(result.extensionId).toBe("ext-1")
    expect(result.revokedAt).toBeInstanceOf(Date)
  })

  it("throws extension_not_found when the row is missing", async () => {
    vi.mocked(extensionsRepo.findById).mockResolvedValue(null)
    await expect(
      revokeTier({
        extensionId: "ext-x",
        superAdminUserId: "u-super",
        note: "policy",
      }),
    ).rejects.toMatchObject({ code: "extension_not_found" })
    expect(DB.transaction).not.toHaveBeenCalled()
  })

  it("throws extension_not_official when the extension is already Unofficial", async () => {
    vi.mocked(extensionsRepo.findById).mockResolvedValue({
      ...EXT_OFFICIAL,
      officialTier: null,
    } as never)
    await expect(
      revokeTier({
        extensionId: "ext-1",
        superAdminUserId: "u-super",
        note: "redundant",
      }),
    ).rejects.toMatchObject({ code: "extension_not_official" })
    expect(DB.transaction).not.toHaveBeenCalled()
  })

  it("throws extension_not_official when the race-lost CAS returns 0 affected rows", async () => {
    vi.mocked(approvalsRepo.applyRevocation).mockResolvedValue(0)
    await expect(
      revokeTier({
        extensionId: "ext-1",
        superAdminUserId: "u-super",
        note: "race",
      }),
    ).rejects.toMatchObject({ code: "extension_not_official" })
    // We did get into the transaction, but no Inngest event should fire
    // because the row didn't actually transition.
    expect(sendEvent).not.toHaveBeenCalled()
  })
})

// Sanity: the named export exists so endpoint imports don't drift.
describe("module exports", () => {
  it("exports the ApprovalError class", () => {
    expect(typeof ApprovalError).toBe("function")
  })
})

describe("listPublisherRequests", () => {
  it("delegates to approvalsRepo.listForPublisher with the user db handle and userId", async () => {
    vi.mocked(approvalsRepo.listForPublisher).mockResolvedValue([])
    const { listPublisherRequests } = await import("./approvals")
    await listPublisherRequests("u-pub")
    expect(approvalsRepo.listForPublisher).toHaveBeenCalledWith(DB, "u-pub")
  })
})
