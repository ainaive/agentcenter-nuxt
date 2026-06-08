import { eq, sql } from "drizzle-orm"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import * as approvalsRepo from "~~/server/repositories/approvals"
import {
  approvalRequests,
  approvalReviewers,
  extensions,
  organizations,
  users,
} from "~~/shared/db/schema"

import { setupDb, type TestDb } from "../helpers/db"

describe("approvals repository", () => {
  let db: TestDb
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const handle = await setupDb()
    db = handle.db
    cleanup = handle.cleanup

    await db.insert(organizations).values({
      id: "org-1",
      slug: "org-1",
      name: "Org One",
    })
    await db.insert(users).values([
      { id: "u-pub", email: "pub@example.com", name: "Pub", emailVerified: true },
      { id: "u-rev", email: "rev@example.com", name: "Rev", emailVerified: true },
      { id: "u-other", email: "other@example.com", name: "Other", emailVerified: true },
    ])
    await db.insert(extensions).values([
      {
        id: "ext-a",
        slug: "ext-a",
        category: "skills",
        scope: "personal",
        ownerOrgId: "org-1",
        publisherUserId: "u-pub",
        subCat: "softDev",
        name: "Ext A",
        visibility: "published",
      },
      {
        id: "ext-b",
        slug: "ext-b",
        category: "skills",
        scope: "personal",
        ownerOrgId: "org-1",
        publisherUserId: "u-pub",
        subCat: "docs",
        name: "Ext B",
        visibility: "published",
      },
    ])
  })

  afterAll(async () => {
    await cleanup()
  })

  beforeEach(async () => {
    await db.delete(approvalRequests)
    await db.delete(approvalReviewers)
    // Reset officialTier between specs so the bulk-lookup test starts clean.
    // No `.where(...)` would also wipe everything but Drizzle requires the
    // clause; sql`1=1` is the standard "match every row" pattern.
    await db.update(extensions).set({ officialTier: null }).where(sql`1 = 1`)
  })

  describe("insertRequest + findById", () => {
    it("persists a pending request with snapshotted tier and subCat", async () => {
      const row = await approvalsRepo.insertRequest(db, {
        id: "req-1",
        extensionId: "ext-a",
        requestedTier: "company",
        subCat: "softDev",
        requestedByUserId: "u-pub",
        reason: "Used by 5 teams.",
      })

      expect(row.status).toBe("pending")
      expect(row.requestedTier).toBe("company")
      expect(row.subCat).toBe("softDev")
      expect(row.reason).toBe("Used by 5 teams.")
      expect(row.decidedByUserId).toBeNull()
      expect(row.decidedAt).toBeNull()
      expect(row.reviewerNote).toBeNull()
      expect(row.createdAt).toBeInstanceOf(Date)
    })
  })

  describe("findPendingByExtension", () => {
    it("returns the pending request when one exists", async () => {
      await approvalsRepo.insertRequest(db, {
        id: "req-1",
        extensionId: "ext-a",
        requestedTier: "productLine",
        subCat: "softDev",
        productLineId: "wireless",
        requestedByUserId: "u-pub",
        reason: null,
      })
      const found = await approvalsRepo.findPendingByExtension(db, "ext-a")
      expect(found?.id).toBe("req-1")
    })

    it("returns null when no pending request exists", async () => {
      expect(
        await approvalsRepo.findPendingByExtension(db, "ext-a"),
      ).toBeNull()
    })

    it("ignores withdrawn / approved / rejected requests", async () => {
      await approvalsRepo.insertRequest(db, {
        id: "req-1",
        extensionId: "ext-a",
        requestedTier: "productLine",
        subCat: "softDev",
        productLineId: "wireless",
        requestedByUserId: "u-pub",
        reason: null,
      })
      await approvalsRepo.applyWithdraw(db, "req-1", new Date())
      expect(
        await approvalsRepo.findPendingByExtension(db, "ext-a"),
      ).toBeNull()
    })
  })

  describe("listForPublisher", () => {
    it("returns the user's requests ordered by createdAt desc", async () => {
      await approvalsRepo.insertRequest(db, {
        id: "req-old",
        extensionId: "ext-a",
        requestedTier: "productLine",
        subCat: "softDev",
        productLineId: "wireless",
        requestedByUserId: "u-pub",
        reason: null,
      })
      // Spread createdAt by hand so the desc order is unambiguous regardless
      // of wall-clock resolution.
      await db
        .update(approvalRequests)
        .set({ createdAt: new Date("2026-06-01T10:00:00Z") })
        .where(eq(approvalRequests.id, "req-old"))

      await approvalsRepo.insertRequest(db, {
        id: "req-new",
        extensionId: "ext-b",
        requestedTier: "company",
        subCat: "docs",
        productLineId: null,
        requestedByUserId: "u-pub",
        reason: null,
      })
      await db
        .update(approvalRequests)
        .set({ createdAt: new Date("2026-06-02T10:00:00Z") })
        .where(eq(approvalRequests.id, "req-new"))

      const rows = await approvalsRepo.listForPublisher(db, "u-pub")
      expect(rows.map((r) => r.id)).toEqual(["req-new", "req-old"])
    })

    it("does not return another publisher's requests", async () => {
      await approvalsRepo.insertRequest(db, {
        id: "req-other",
        extensionId: "ext-a",
        requestedTier: "company",
        subCat: "softDev",
        productLineId: null,
        requestedByUserId: "u-other",
        reason: null,
      })
      const rows = await approvalsRepo.listForPublisher(db, "u-pub")
      expect(rows).toHaveLength(0)
    })
  })

  describe("listPendingForCells", () => {
    beforeEach(async () => {
      await approvalsRepo.insertRequest(db, {
        id: "req-pl-softDev",
        extensionId: "ext-a",
        requestedTier: "productLine",
        subCat: "softDev",
        productLineId: "wireless",
        requestedByUserId: "u-pub",
        reason: null,
      })
      await approvalsRepo.insertRequest(db, {
        id: "req-co-docs",
        extensionId: "ext-b",
        requestedTier: "company",
        subCat: "docs",
        productLineId: null,
        requestedByUserId: "u-pub",
        reason: null,
      })
      // A decided row should NOT be returned even if its cell matches.
      await approvalsRepo.insertRequest(db, {
        id: "req-decided",
        extensionId: "ext-a",
        requestedTier: "productLine",
        subCat: "softDev",
        productLineId: "wireless",
        requestedByUserId: "u-pub",
        reason: null,
      })
      await approvalsRepo.applyDecision(db, "req-decided", {
        status: "approved",
        decidedByUserId: "u-rev",
        decidedAt: new Date(),
        reviewerNote: null,
      })
    })

    it("returns empty when the cell list is empty", async () => {
      expect(await approvalsRepo.listPendingForCells(db, [])).toEqual([])
    })

    it("returns only pending requests in the matching cells", async () => {
      const rows = await approvalsRepo.listPendingForCells(db, [
        { tier: "productLine", subCat: "softDev", productLineId: "wireless" },
      ])
      expect(rows.map((r) => r.id)).toEqual(["req-pl-softDev"])
    })

    it("matches multiple cells via an OR", async () => {
      const rows = await approvalsRepo.listPendingForCells(db, [
        { tier: "productLine", subCat: "softDev", productLineId: "wireless" },
        { tier: "company", subCat: "docs", productLineId: null },
      ])
      expect(rows.map((r) => r.id).sort()).toEqual(
        ["req-co-docs", "req-pl-softDev"].sort(),
      )
    })

    it("returns nothing when the cells don't match any pending requests", async () => {
      const rows = await approvalsRepo.listPendingForCells(db, [
        { tier: "company", subCat: "softDev", productLineId: null },
      ])
      expect(rows).toHaveLength(0)
    })

    it("does not leak a productLine request to a same-subCat company cell", async () => {
      const rows = await approvalsRepo.listPendingForCells(db, [
        { tier: "company", subCat: "softDev", productLineId: null },
      ])
      // req-pl-softDev is productLine-tier; the company cell must not match it.
      expect(rows.map((r) => r.id)).not.toContain("req-pl-softDev")
    })

    it("treats different product lines as distinct cells", async () => {
      // The productLine-softDev fixture is in 'wireless'; a 'datacom' cell
      // should not surface it.
      const rows = await approvalsRepo.listPendingForCells(db, [
        { tier: "productLine", subCat: "softDev", productLineId: "datacom" },
      ])
      expect(rows.map((r) => r.id)).not.toContain("req-pl-softDev")
    })
  })

  describe("applyDecision", () => {
    it("flips a pending request to approved with the patch fields", async () => {
      await approvalsRepo.insertRequest(db, {
        id: "req-1",
        extensionId: "ext-a",
        requestedTier: "company",
        subCat: "softDev",
        productLineId: null,
        requestedByUserId: "u-pub",
        reason: null,
      })
      const decidedAt = new Date("2026-06-07T12:00:00Z")
      await approvalsRepo.applyDecision(db, "req-1", {
        status: "approved",
        decidedByUserId: "u-rev",
        decidedAt,
        reviewerNote: null,
      })
      const after = await approvalsRepo.findById(db, "req-1")
      expect(after?.status).toBe("approved")
      expect(after?.decidedByUserId).toBe("u-rev")
      expect(after?.decidedAt?.toISOString()).toBe(decidedAt.toISOString())
    })

    it("stores a reviewer note on reject", async () => {
      await approvalsRepo.insertRequest(db, {
        id: "req-1",
        extensionId: "ext-a",
        requestedTier: "company",
        subCat: "softDev",
        productLineId: null,
        requestedByUserId: "u-pub",
        reason: null,
      })
      await approvalsRepo.applyDecision(db, "req-1", {
        status: "rejected",
        decidedByUserId: "u-rev",
        decidedAt: new Date(),
        reviewerNote: "Needs a maintainer.",
      })
      const after = await approvalsRepo.findById(db, "req-1")
      expect(after?.status).toBe("rejected")
      expect(after?.reviewerNote).toBe("Needs a maintainer.")
    })

    it("returns 0 affected rows when the request is no longer pending (race lost)", async () => {
      await approvalsRepo.insertRequest(db, {
        id: "req-1",
        extensionId: "ext-a",
        requestedTier: "company",
        subCat: "softDev",
        productLineId: null,
        requestedByUserId: "u-pub",
        reason: null,
      })
      // First reviewer's UPDATE lands the decision.
      const first = await approvalsRepo.applyDecision(db, "req-1", {
        status: "approved",
        decidedByUserId: "u-rev",
        decidedAt: new Date(),
        reviewerNote: null,
      })
      expect(first).toBe(1)

      // Second reviewer's UPDATE filters out — the WHERE clause requires
      // status='pending' and the row is now approved.
      const second = await approvalsRepo.applyDecision(db, "req-1", {
        status: "rejected",
        decidedByUserId: "u-other-rev",
        decidedAt: new Date(),
        reviewerNote: null,
      })
      expect(second).toBe(0)

      const after = await approvalsRepo.findById(db, "req-1")
      expect(after?.status).toBe("approved")
      expect(after?.decidedByUserId).toBe("u-rev")
    })
  })

  describe("applyWithdraw", () => {
    it("flips a pending request to withdrawn", async () => {
      await approvalsRepo.insertRequest(db, {
        id: "req-1",
        extensionId: "ext-a",
        requestedTier: "productLine",
        subCat: "softDev",
        productLineId: "wireless",
        requestedByUserId: "u-pub",
        reason: null,
      })
      const at = new Date("2026-06-07T12:00:00Z")
      const affected = await approvalsRepo.applyWithdraw(db, "req-1", at)
      expect(affected).toBe(1)
      const after = await approvalsRepo.findById(db, "req-1")
      expect(after?.status).toBe("withdrawn")
      expect(after?.decidedAt?.toISOString()).toBe(at.toISOString())
      expect(after?.decidedByUserId).toBeNull()
    })

    it("returns 0 affected rows for a request that's already decided", async () => {
      await approvalsRepo.insertRequest(db, {
        id: "req-1",
        extensionId: "ext-a",
        requestedTier: "productLine",
        subCat: "softDev",
        productLineId: "wireless",
        requestedByUserId: "u-pub",
        reason: null,
      })
      await approvalsRepo.applyDecision(db, "req-1", {
        status: "approved",
        decidedByUserId: "u-rev",
        decidedAt: new Date(),
        reviewerNote: null,
      })
      const affected = await approvalsRepo.applyWithdraw(
        db,
        "req-1",
        new Date(),
      )
      expect(affected).toBe(0)
    })
  })

  describe("setExtensionOfficialTier + findTiersForExtensions", () => {
    it("stamps the tier on the extension", async () => {
      await approvalsRepo.setExtensionOfficialTier(db, "ext-a", "company", null)
      const [row] = await db
        .select({ officialTier: extensions.officialTier })
        .from(extensions)
        .where(eq(extensions.id, "ext-a"))
      expect(row?.officialTier).toBe("company")
    })

    it("stamps tier + productLineId together for the productLine tier", async () => {
      await approvalsRepo.setExtensionOfficialTier(
        db,
        "ext-a",
        "productLine",
        "wireless",
      )
      const [row] = await db
        .select({
          officialTier: extensions.officialTier,
          productLineId: extensions.productLineId,
        })
        .from(extensions)
        .where(eq(extensions.id, "ext-a"))
      expect(row?.officialTier).toBe("productLine")
      expect(row?.productLineId).toBe("wireless")
    })

    it("returns a map of ext id → tier or null", async () => {
      await approvalsRepo.setExtensionOfficialTier(
        db,
        "ext-a",
        "productLine",
        "wireless",
      )
      const map = await approvalsRepo.findTiersForExtensions(db, [
        "ext-a",
        "ext-b",
      ])
      expect(map.get("ext-a")).toBe("productLine")
      expect(map.get("ext-b")).toBeNull()
    })

    it("returns an empty map for an empty input", async () => {
      const map = await approvalsRepo.findTiersForExtensions(db, [])
      expect(map.size).toBe(0)
    })
  })

  describe("isReviewerForCell", () => {
    it("returns true when the user is assigned to the productLine cell", async () => {
      await db.insert(approvalReviewers).values({
        id: "rev-1",
        tier: "productLine",
        subCat: "softDev",
        productLineId: "wireless",
        userId: "u-rev",
      })
      expect(
        await approvalsRepo.isReviewerForCell(
          db,
          "u-rev",
          "productLine",
          "softDev",
          "wireless",
        ),
      ).toBe(true)
    })

    it("returns false for a different productLine on the same subCat", async () => {
      await db.insert(approvalReviewers).values({
        id: "rev-1",
        tier: "productLine",
        subCat: "softDev",
        productLineId: "wireless",
        userId: "u-rev",
      })
      expect(
        await approvalsRepo.isReviewerForCell(
          db,
          "u-rev",
          "productLine",
          "softDev",
          "datacom",
        ),
      ).toBe(false)
    })

    it("returns false for a company cell when the user is a productLine reviewer", async () => {
      await db.insert(approvalReviewers).values({
        id: "rev-1",
        tier: "productLine",
        subCat: "softDev",
        productLineId: "wireless",
        userId: "u-rev",
      })
      expect(
        await approvalsRepo.isReviewerForCell(
          db,
          "u-rev",
          "company",
          "softDev",
          null,
        ),
      ).toBe(false)
    })
  })
})
