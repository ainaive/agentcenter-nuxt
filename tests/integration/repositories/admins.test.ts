import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import * as adminsRepo from "~~/server/repositories/admins"
import {
  approvalAdmins,
  memberships,
  organizations,
  users,
} from "~~/shared/db/schema"

import { setupDb, type TestDb } from "../helpers/db"

describe("admins repository", () => {
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
    await db.delete(approvalAdmins)
    await db.delete(memberships)
  })

  describe("insertAdmin + listMatrix", () => {
    it("persists assignments and joins with user display fields", async () => {
      await adminsRepo.insertAdmin(db, {
        id: "adm-1",
        extensionCategory: "skills",
        tier: "productLine",
        productLineId: "wireless",
        categoryLevel: "macro",
        categoryKey: "softDev",
        userId: "u-alice",
      })
      await adminsRepo.insertAdmin(db, {
        id: "adm-2",
        extensionCategory: "mcp",
        tier: "company",
        productLineId: null,
        categoryLevel: "all",
        categoryKey: "*",
        userId: "u-bob",
      })

      const matrix = await adminsRepo.listMatrix(db)
      expect(matrix).toHaveLength(2)
      const cells = matrix.map((r) => ({
        extensionCategory: r.extensionCategory,
        tier: r.tier,
        productLineId: r.productLineId,
        categoryLevel: r.categoryLevel,
        categoryKey: r.categoryKey,
        userEmail: r.userEmail,
        userName: r.userName,
      }))
      expect(cells).toContainEqual({
        extensionCategory: "skills",
        tier: "productLine",
        productLineId: "wireless",
        categoryLevel: "macro",
        categoryKey: "softDev",
        userEmail: "alice@example.com",
        userName: "Alice",
      })
      expect(cells).toContainEqual({
        extensionCategory: "mcp",
        tier: "company",
        productLineId: null,
        categoryLevel: "all",
        categoryKey: "*",
        userEmail: "bob@example.com",
        userName: "Bob",
      })
    })

    it("is a no-op on identical cell+user conflict for productLine cells", async () => {
      await adminsRepo.insertAdmin(db, {
        id: "adm-1",
        extensionCategory: "skills",
        tier: "productLine",
        productLineId: "wireless",
        categoryLevel: "macro",
        categoryKey: "softDev",
        userId: "u-alice",
      })
      await adminsRepo.insertAdmin(db, {
        id: "adm-2",
        extensionCategory: "skills",
        tier: "productLine",
        productLineId: "wireless",
        categoryLevel: "macro",
        categoryKey: "softDev",
        userId: "u-alice",
      })
      const matrix = await adminsRepo.listMatrix(db)
      expect(matrix).toHaveLength(1)
      expect(matrix[0]?.id).toBe("adm-1")
    })

    it("is a no-op on identical cell+user conflict for company cells", async () => {
      await adminsRepo.insertAdmin(db, {
        id: "adm-1",
        extensionCategory: "skills",
        tier: "company",
        productLineId: null,
        categoryLevel: "all",
        categoryKey: "*",
        userId: "u-alice",
      })
      await adminsRepo.insertAdmin(db, {
        id: "adm-2",
        extensionCategory: "skills",
        tier: "company",
        productLineId: null,
        categoryLevel: "all",
        categoryKey: "*",
        userId: "u-alice",
      })
      const matrix = await adminsRepo.listMatrix(db)
      expect(matrix).toHaveLength(1)
    })

    it("treats different extensionCategory as distinct cells for the same row otherwise", async () => {
      await adminsRepo.insertAdmin(db, {
        id: "adm-1",
        extensionCategory: "skills",
        tier: "company",
        productLineId: null,
        categoryLevel: "macro",
        categoryKey: "softDev",
        userId: "u-alice",
      })
      await adminsRepo.insertAdmin(db, {
        id: "adm-2",
        extensionCategory: "mcp",
        tier: "company",
        productLineId: null,
        categoryLevel: "macro",
        categoryKey: "softDev",
        userId: "u-alice",
      })
      expect(await adminsRepo.listMatrix(db)).toHaveLength(2)
    })
  })

  describe("listCellsForUser", () => {
    it("returns the 5-coord cells the user holds", async () => {
      await adminsRepo.insertAdmin(db, {
        id: "adm-1",
        extensionCategory: "skills",
        tier: "productLine",
        productLineId: "wireless",
        categoryLevel: "macro",
        categoryKey: "softDev",
        userId: "u-alice",
      })
      await adminsRepo.insertAdmin(db, {
        id: "adm-2",
        extensionCategory: "skills",
        tier: "company",
        productLineId: null,
        categoryLevel: "micro",
        categoryKey: "reqAnalysis",
        userId: "u-alice",
      })
      await adminsRepo.insertAdmin(db, {
        id: "adm-3",
        extensionCategory: "mcp",
        tier: "company",
        productLineId: null,
        categoryLevel: "all",
        categoryKey: "*",
        userId: "u-bob",
      })
      const cells = await adminsRepo.listCellsForUser(db, "u-alice")
      expect(cells).toHaveLength(2)
      expect(cells).toContainEqual({
        extensionCategory: "skills",
        tier: "productLine",
        productLineId: "wireless",
        categoryLevel: "macro",
        categoryKey: "softDev",
      })
      expect(cells).toContainEqual({
        extensionCategory: "skills",
        tier: "company",
        productLineId: null,
        categoryLevel: "micro",
        categoryKey: "reqAnalysis",
      })
    })

    it("returns empty for a user with no assignments", async () => {
      expect(await adminsRepo.listCellsForUser(db, "u-alice")).toEqual([])
    })
  })

  describe("findCoveringAdmin", () => {
    // The cover relation has two independent axes:
    //   column-tier: (company, null) ⊇ (productLine, X) ⊇ self
    //   category:    (all, *) ⊇ (macro, l1) ⊇ (micro, l2-under-l1)
    // Cross-extensionCategory authority does not exist.

    beforeEach(async () => {
      // Spread admin rows so we can target each axis from different starting
      // points without inter-test bleed.
      await adminsRepo.insertAdmin(db, {
        id: "adm-co-all",
        extensionCategory: "skills",
        tier: "company",
        productLineId: null,
        categoryLevel: "all",
        categoryKey: "*",
        userId: "u-alice",
      })
      await adminsRepo.insertAdmin(db, {
        id: "adm-pl-macro",
        extensionCategory: "skills",
        tier: "productLine",
        productLineId: "wireless",
        categoryLevel: "macro",
        categoryKey: "softDev",
        userId: "u-bob",
      })
      await adminsRepo.insertAdmin(db, {
        id: "adm-co-micro",
        extensionCategory: "skills",
        tier: "company",
        productLineId: null,
        categoryLevel: "micro",
        categoryKey: "reqAnalysis",
        userId: "u-carol",
      })
    })

    it("(company, all) covers any descendant cell in the same ext category", async () => {
      // The wildcard root covers every (tier × column × level × key) below it.
      expect(
        await adminsRepo.findCoveringAdmin(db, "u-alice", {
          extensionCategory: "skills",
          tier: "productLine",
          productLineId: "datacom",
          categoryLevel: "micro",
          categoryKey: "frontend",
        }),
      ).toBe(true)
    })

    it("(company, all) does not cross extensionCategory boundaries", async () => {
      expect(
        await adminsRepo.findCoveringAdmin(db, "u-alice", {
          extensionCategory: "mcp",
          tier: "company",
          productLineId: null,
          categoryLevel: "macro",
          categoryKey: "softDev",
        }),
      ).toBe(false)
    })

    it("(productLine, wireless × macro=softDev) covers its three l2 children but not siblings", async () => {
      // l2=backend lives under l1=softDev — covered.
      expect(
        await adminsRepo.findCoveringAdmin(db, "u-bob", {
          extensionCategory: "skills",
          tier: "productLine",
          productLineId: "wireless",
          categoryLevel: "micro",
          categoryKey: "backend",
        }),
      ).toBe(true)
      // l2=reqAnalysis lives under l1=systemDesign — sibling l1, NOT covered.
      expect(
        await adminsRepo.findCoveringAdmin(db, "u-bob", {
          extensionCategory: "skills",
          tier: "productLine",
          productLineId: "wireless",
          categoryLevel: "micro",
          categoryKey: "reqAnalysis",
        }),
      ).toBe(false)
    })

    it("(productLine, wireless) does NOT cover a different product line", async () => {
      expect(
        await adminsRepo.findCoveringAdmin(db, "u-bob", {
          extensionCategory: "skills",
          tier: "productLine",
          productLineId: "datacom",
          categoryLevel: "macro",
          categoryKey: "softDev",
        }),
      ).toBe(false)
    })

    it("(productLine, wireless) does NOT cover the company-tier cell of the same category", async () => {
      // The cover relation is asymmetric: a PL admin can't reach upward
      // into the company column.
      expect(
        await adminsRepo.findCoveringAdmin(db, "u-bob", {
          extensionCategory: "skills",
          tier: "company",
          productLineId: null,
          categoryLevel: "macro",
          categoryKey: "softDev",
        }),
      ).toBe(false)
    })

    it("(company, micro=reqAnalysis) covers only itself", async () => {
      expect(
        await adminsRepo.findCoveringAdmin(db, "u-carol", {
          extensionCategory: "skills",
          tier: "company",
          productLineId: null,
          categoryLevel: "micro",
          categoryKey: "reqAnalysis",
        }),
      ).toBe(true)
      // Sibling micro under the same l1 — NOT covered.
      expect(
        await adminsRepo.findCoveringAdmin(db, "u-carol", {
          extensionCategory: "skills",
          tier: "company",
          productLineId: null,
          categoryLevel: "micro",
          categoryKey: "funcDesign",
        }),
      ).toBe(false)
    })

    it("returns false when the user has no admin rows at all", async () => {
      expect(
        await adminsRepo.findCoveringAdmin(db, "u-bob", {
          extensionCategory: "mcp",
          tier: "company",
          productLineId: null,
          categoryLevel: "all",
          categoryKey: "*",
        }),
      ).toBe(false)
    })
  })

  describe("isAdminCoveringRequest", () => {
    beforeEach(async () => {
      await adminsRepo.insertAdmin(db, {
        id: "adm-pl-all",
        extensionCategory: "skills",
        tier: "productLine",
        productLineId: "wireless",
        categoryLevel: "all",
        categoryKey: "*",
        userId: "u-alice",
      })
      await adminsRepo.insertAdmin(db, {
        id: "adm-co-macro",
        extensionCategory: "mcp",
        tier: "company",
        productLineId: null,
        categoryLevel: "macro",
        categoryKey: "softDev",
        userId: "u-bob",
      })
    })

    it("(productLine, wireless, all) covers a wireless l2 request", async () => {
      expect(
        await adminsRepo.isAdminCoveringRequest(db, "u-alice", {
          extensionCategory: "skills",
          tier: "productLine",
          productLineId: "wireless",
          subCat: "systemDesign",
          l2: "reqAnalysis",
        }),
      ).toBe(true)
    })

    it("(productLine, wireless) does NOT cover a datacom request", async () => {
      expect(
        await adminsRepo.isAdminCoveringRequest(db, "u-alice", {
          extensionCategory: "skills",
          tier: "productLine",
          productLineId: "datacom",
          subCat: "softDev",
          l2: null,
        }),
      ).toBe(false)
    })

    it("(company, macro=softDev) covers a softDev request even when l2 is null", async () => {
      expect(
        await adminsRepo.isAdminCoveringRequest(db, "u-bob", {
          extensionCategory: "mcp",
          tier: "company",
          productLineId: null,
          subCat: "softDev",
          l2: null,
        }),
      ).toBe(true)
    })

    it("(company, macro=softDev) does NOT cover a sibling subCat", async () => {
      expect(
        await adminsRepo.isAdminCoveringRequest(db, "u-bob", {
          extensionCategory: "mcp",
          tier: "company",
          productLineId: null,
          subCat: "testing",
          l2: null,
        }),
      ).toBe(false)
    })
  })

  describe("findAdminById + deleteAdmin", () => {
    it("findAdminById returns the row with user display fields, then deleteAdmin removes it", async () => {
      await adminsRepo.insertAdmin(db, {
        id: "adm-1",
        extensionCategory: "skills",
        tier: "productLine",
        productLineId: "wireless",
        categoryLevel: "macro",
        categoryKey: "softDev",
        userId: "u-alice",
      })
      const row = await adminsRepo.findAdminById(db, "adm-1")
      expect(row).toMatchObject({
        id: "adm-1",
        extensionCategory: "skills",
        tier: "productLine",
        productLineId: "wireless",
        categoryLevel: "macro",
        categoryKey: "softDev",
        userEmail: "alice@example.com",
        userName: "Alice",
      })

      await adminsRepo.deleteAdmin(db, "adm-1")
      expect(await adminsRepo.findAdminById(db, "adm-1")).toBeNull()
    })

    it("findAdminById returns null for an unknown id", async () => {
      expect(await adminsRepo.findAdminById(db, "nope")).toBeNull()
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
      expect(await adminsRepo.isSuperAdmin(db, "u-alice")).toBe(true)
    })

    it("returns false for a user with only non-superAdmin memberships", async () => {
      await db.insert(memberships).values({
        id: "m-1",
        userId: "u-bob",
        orgId: "org-1",
        role: "admin",
      })
      expect(await adminsRepo.isSuperAdmin(db, "u-bob")).toBe(false)
    })

    it("returns false for a user with no memberships", async () => {
      expect(await adminsRepo.isSuperAdmin(db, "u-carol")).toBe(false)
    })
  })
})
