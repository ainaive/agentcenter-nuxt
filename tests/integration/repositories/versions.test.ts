import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import * as versionsRepo from "~~/server/repositories/versions"
import {
  extensions,
  extensionVersions,
  files,
  organizations,
} from "~~/shared/db/schema"

import { setupDb, type TestDb } from "../helpers/db"

describe("versions repository", () => {
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
  })

  afterAll(async () => {
    await cleanup()
  })

  beforeEach(async () => {
    await db.delete(files)
    await db.delete(extensionVersions)
    await db.delete(extensions)
  })

  async function seedExtension(
    id: string,
    overrides: Partial<typeof extensions.$inferInsert> = {},
  ) {
    await db.insert(extensions).values({
      id,
      slug: id,
      category: "skills",
      scope: "personal",
      ownerOrgId: "org-1",
      name: id,
      visibility: "published",
      ...overrides,
    })
  }

  async function seedVersion(
    overrides: Partial<typeof extensionVersions.$inferInsert> = {},
  ) {
    const row: typeof extensionVersions.$inferInsert = {
      id: "ver-1",
      extensionId: "ext-1",
      version: "1.0.0",
      status: "pending",
      ...overrides,
    }
    await db.insert(extensionVersions).values(row)
    return row.id!
  }

  describe("findByIdWithScope", () => {
    it("joins the parent extension and returns its scope alongside the version status", async () => {
      await seedExtension("ext-1", { scope: "org" })
      await seedVersion({ status: "scanning" })

      const row = await versionsRepo.findByIdWithScope(db, "ver-1")
      expect(row).not.toBeNull()
      expect(row!.status).toBe("scanning")
      expect(row!.extensionId).toBe("ext-1")
      expect(row!.scope).toBe("org")
    })

    it("returns null when the version does not exist", async () => {
      const row = await versionsRepo.findByIdWithScope(db, "ver-missing")
      expect(row).toBeNull()
    })
  })

  describe("findById", () => {
    it("returns minimal version fields for a known id", async () => {
      await seedExtension("ext-1")
      await seedVersion()
      const row = await versionsRepo.findById(db, "ver-1")
      expect(row?.id).toBe("ver-1")
      expect(row?.extensionId).toBe("ext-1")
    })

    it("returns null for an unknown id", async () => {
      const row = await versionsRepo.findById(db, "nope")
      expect(row).toBeNull()
    })
  })

  describe("listForExtension", () => {
    it("orders versions by publishedAt desc nulls last", async () => {
      await seedExtension("ext-1")
      await seedVersion({
        id: "ver-old",
        version: "1.0.0",
        status: "ready",
        publishedAt: new Date("2026-01-01T00:00:00Z"),
      })
      await seedVersion({
        id: "ver-new",
        version: "2.0.0",
        status: "ready",
        publishedAt: new Date("2026-03-01T00:00:00Z"),
      })
      await seedVersion({ id: "ver-pending", version: "3.0.0", status: "pending" })

      const rows = await versionsRepo.listForExtension(db, "ext-1")
      expect(rows.map((r) => r.id)).toEqual(["ver-new", "ver-old", "ver-pending"])
    })
  })

  describe("listLatestReadyForExtension", () => {
    it("returns only `ready` candidates ordered newest first", async () => {
      await seedExtension("ext-1")
      await seedVersion({
        id: "v-rejected",
        version: "0.1.0",
        status: "rejected",
      })
      await seedVersion({
        id: "v-old",
        version: "1.0.0",
        status: "ready",
        publishedAt: new Date("2026-01-01T00:00:00Z"),
      })
      await seedVersion({
        id: "v-new",
        version: "2.0.0",
        status: "ready",
        publishedAt: new Date("2026-03-01T00:00:00Z"),
      })

      const cands = await versionsRepo.listLatestReadyForExtension(db, "ext-1")
      expect(cands.map((c) => c.version)).toEqual(["2.0.0", "1.0.0"])
    })

    it("returns an empty list when no ready candidate exists", async () => {
      await seedExtension("ext-1")
      await seedVersion({ status: "scanning" })
      const cands = await versionsRepo.listLatestReadyForExtension(db, "ext-1")
      expect(cands).toEqual([])
    })
  })

  describe("findLatestReadyBundleBySlug", () => {
    it("returns the r2Key of the latest ready bundle", async () => {
      await seedExtension("ext-1", { slug: "my-skill" })
      await seedVersion({
        id: "v-old",
        version: "1.0.0",
        status: "ready",
        publishedAt: new Date("2026-01-01T00:00:00Z"),
        bundleFileId: "file-old",
      })
      await seedVersion({
        id: "v-new",
        version: "2.0.0",
        status: "ready",
        publishedAt: new Date("2026-03-01T00:00:00Z"),
        bundleFileId: "file-new",
      })
      await db.insert(files).values([
        {
          id: "file-old",
          r2Key: "bundles/my-skill/1.0.0/bundle.zip",
          size: 100n,
          checksumSha256: "abc",
        },
        {
          id: "file-new",
          r2Key: "bundles/my-skill/2.0.0/bundle.zip",
          size: 200n,
          checksumSha256: "def",
        },
      ])

      const bundle = await versionsRepo.findLatestReadyBundleBySlug(db, "my-skill")
      expect(bundle?.r2Key).toBe("bundles/my-skill/2.0.0/bundle.zip")
    })

    it("returns null when there's no ready version with a bundle", async () => {
      await seedExtension("ext-1", { slug: "my-skill" })
      await seedVersion({ status: "scanning" })
      const bundle = await versionsRepo.findLatestReadyBundleBySlug(db, "my-skill")
      expect(bundle).toBeNull()
    })
  })

  describe("updateStatus", () => {
    it("sets status and publishedAt together", async () => {
      await seedExtension("ext-1")
      await seedVersion({ status: "scanning" })
      const now = new Date("2026-04-01T00:00:00Z")

      await versionsRepo.updateStatus(db, "ver-1", { status: "ready", publishedAt: now })

      const rows = await db.select().from(extensionVersions)
      expect(rows[0]?.status).toBe("ready")
      expect(rows[0]?.publishedAt?.toISOString()).toBe(now.toISOString())
    })
  })

  describe("updateStatusGuarded", () => {
    it("transitions when the current status matches the `from` list and reports updated=true", async () => {
      await seedExtension("ext-1")
      await seedVersion({ status: "pending" })

      const result = await versionsRepo.updateStatusGuarded(db, "ver-1", {
        from: ["pending", "scanning"],
        to: "scanning",
      })
      expect(result.updated).toBe(true)
      const rows = await db.select().from(extensionVersions)
      expect(rows[0]?.status).toBe("scanning")
    })

    it("reports updated=false when the current status is not in the `from` list", async () => {
      await seedExtension("ext-1")
      await seedVersion({ status: "ready" })

      const result = await versionsRepo.updateStatusGuarded(db, "ver-1", {
        from: ["pending", "scanning"],
        to: "scanning",
      })
      expect(result.updated).toBe(false)
      const rows = await db.select().from(extensionVersions)
      expect(rows[0]?.status).toBe("ready")
    })

    it("reports updated=false when the version does not exist", async () => {
      const result = await versionsRepo.updateStatusGuarded(db, "nope", {
        from: ["pending"],
        to: "scanning",
      })
      expect(result.updated).toBe(false)
    })
  })
})
