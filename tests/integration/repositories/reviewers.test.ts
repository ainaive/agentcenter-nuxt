import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import * as reviewersRepo from "~~/server/repositories/reviewers"
import {
  approvalReviewers,
  memberships,
  organizations,
  users,
} from "~~/shared/db/schema"

import { setupDb, type TestDb } from "../helpers/db"

describe("reviewers repository", () => {
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
      { id: "u-alice", email: "alice@example.com", name: "Alice", emailVerified: true },
      { id: "u-bob", email: "bob@example.com", name: "Bob", emailVerified: true },
      { id: "u-carol", email: "carol@example.com", name: null, emailVerified: true },
    ])
  })

  afterAll(async () => {
    await cleanup()
  })

  beforeEach(async () => {
    await db.delete(approvalReviewers)
    await db.delete(memberships)
  })

  describe("insertReviewer + listMatrix", () => {
    it("persists reviewer assignments and joins with user display fields", async () => {
      await reviewersRepo.insertReviewer(db, {
        id: "rev-1",
        tier: "productLine",
        subCat: "softDev",
        productLineId: "wireless",
        userId: "u-alice",
      })
      await reviewersRepo.insertReviewer(db, {
        id: "rev-2",
        tier: "company",
        subCat: "docs",
        productLineId: null,
        userId: "u-bob",
      })

      const matrix = await reviewersRepo.listMatrix(db)
      expect(matrix).toHaveLength(2)
      const cells = matrix.map((r) => ({
        tier: r.tier,
        subCat: r.subCat,
        productLineId: r.productLineId,
        userEmail: r.userEmail,
        userName: r.userName,
      }))
      expect(cells).toContainEqual({
        tier: "productLine",
        subCat: "softDev",
        productLineId: "wireless",
        userEmail: "alice@example.com",
        userName: "Alice",
      })
      expect(cells).toContainEqual({
        tier: "company",
        subCat: "docs",
        productLineId: null,
        userEmail: "bob@example.com",
        userName: "Bob",
      })
    })

    it("orders by (tier, subCat, productLineId, email)", async () => {
      await reviewersRepo.insertReviewer(db, {
        id: "rev-1",
        tier: "productLine",
        subCat: "softDev",
        productLineId: "wireless",
        userId: "u-bob",
      })
      await reviewersRepo.insertReviewer(db, {
        id: "rev-2",
        tier: "productLine",
        subCat: "softDev",
        productLineId: "wireless",
        userId: "u-alice",
      })
      const matrix = await reviewersRepo.listMatrix(db)
      // Alice sorts before Bob within the same (tier, subCat, productLine) cell.
      expect(matrix.map((r) => r.userEmail)).toEqual([
        "alice@example.com",
        "bob@example.com",
      ])
    })

    it("is a no-op on (tier, subCat, productLineId, userId) conflict for productLine cells", async () => {
      await reviewersRepo.insertReviewer(db, {
        id: "rev-1",
        tier: "productLine",
        subCat: "softDev",
        productLineId: "wireless",
        userId: "u-alice",
      })
      // Same cell + user, different id — should be silently absorbed.
      await reviewersRepo.insertReviewer(db, {
        id: "rev-2",
        tier: "productLine",
        subCat: "softDev",
        productLineId: "wireless",
        userId: "u-alice",
      })
      const matrix = await reviewersRepo.listMatrix(db)
      expect(matrix).toHaveLength(1)
      expect(matrix[0]?.id).toBe("rev-1")
    })

    it("treats (productLine, softDev, wireless) and (productLine, softDev, datacom) as distinct cells", async () => {
      await reviewersRepo.insertReviewer(db, {
        id: "rev-1",
        tier: "productLine",
        subCat: "softDev",
        productLineId: "wireless",
        userId: "u-alice",
      })
      await reviewersRepo.insertReviewer(db, {
        id: "rev-2",
        tier: "productLine",
        subCat: "softDev",
        productLineId: "datacom",
        userId: "u-alice",
      })
      const matrix = await reviewersRepo.listMatrix(db)
      expect(matrix).toHaveLength(2)
    })
  })

  describe("listCellsForUser", () => {
    it("returns the (tier, subCat, productLineId) cells the user covers", async () => {
      await reviewersRepo.insertReviewer(db, {
        id: "rev-1",
        tier: "productLine",
        subCat: "softDev",
        productLineId: "wireless",
        userId: "u-alice",
      })
      await reviewersRepo.insertReviewer(db, {
        id: "rev-2",
        tier: "company",
        subCat: "docs",
        productLineId: null,
        userId: "u-alice",
      })
      await reviewersRepo.insertReviewer(db, {
        id: "rev-3",
        tier: "productLine",
        subCat: "softDev",
        productLineId: "wireless",
        userId: "u-bob",
      })
      const cells = await reviewersRepo.listCellsForUser(db, "u-alice")
      expect(cells.length).toBe(2)
      expect(cells).toContainEqual({
        tier: "productLine",
        subCat: "softDev",
        productLineId: "wireless",
      })
      expect(cells).toContainEqual({
        tier: "company",
        subCat: "docs",
        productLineId: null,
      })
    })

    it("returns empty for a user with no assignments", async () => {
      expect(await reviewersRepo.listCellsForUser(db, "u-alice")).toEqual([])
    })
  })

  describe("findReviewersFor", () => {
    it("returns user ids assigned to a productLine cell", async () => {
      await reviewersRepo.insertReviewer(db, {
        id: "rev-1",
        tier: "productLine",
        subCat: "softDev",
        productLineId: "wireless",
        userId: "u-alice",
      })
      await reviewersRepo.insertReviewer(db, {
        id: "rev-2",
        tier: "productLine",
        subCat: "softDev",
        productLineId: "wireless",
        userId: "u-bob",
      })
      const ids = await reviewersRepo.findReviewersFor(
        db,
        "productLine",
        "softDev",
        "wireless",
      )
      expect(ids.sort()).toEqual(["u-alice", "u-bob"])
    })

    it("returns empty when the cell has no reviewers", async () => {
      expect(
        await reviewersRepo.findReviewersFor(db, "company", "softDev", null),
      ).toEqual([])
    })
  })

  describe("deleteReviewer", () => {
    it("removes the assignment by id", async () => {
      await reviewersRepo.insertReviewer(db, {
        id: "rev-1",
        tier: "productLine",
        subCat: "softDev",
        productLineId: "wireless",
        userId: "u-alice",
      })
      await reviewersRepo.deleteReviewer(db, "rev-1")
      expect(await reviewersRepo.listMatrix(db)).toHaveLength(0)
    })
  })

  describe("isSuperAdmin", () => {
    it("returns true for a user with a superAdmin membership", async () => {
      await db.insert(memberships).values({
        id: "m-1",
        userId: "u-alice",
        orgId: "org-1",
        role: "superAdmin",
      })
      expect(await reviewersRepo.isSuperAdmin(db, "u-alice")).toBe(true)
    })

    it("returns false for a user with only non-superAdmin memberships", async () => {
      await db.insert(memberships).values({
        id: "m-1",
        userId: "u-bob",
        orgId: "org-1",
        role: "admin",
      })
      expect(await reviewersRepo.isSuperAdmin(db, "u-bob")).toBe(false)
    })

    it("returns false for a user with no memberships", async () => {
      expect(await reviewersRepo.isSuperAdmin(db, "u-carol")).toBe(false)
    })
  })
})
