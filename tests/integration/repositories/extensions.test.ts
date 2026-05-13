import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import * as extensionsRepo from "~~/server/repositories/extensions"
import { extensions, extensionTags, organizations, tags } from "~~/shared/db/schema"
import { parseFilters } from "~~/shared/validators/filters"

import { setupDb, type TestDb } from "../helpers/db"

describe("extensions repository", () => {
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
    await db.insert(tags).values([
      { id: "automation", labelEn: "Automation", labelZh: "自动化" },
      { id: "k8s", labelEn: "Kubernetes", labelZh: "K8s" },
    ])
  })

  afterAll(async () => {
    await cleanup()
  })

  beforeEach(async () => {
    // Each test gets a clean extensions table so list assertions are
    // independent. We don't need to clear orgs/tags — those are stable seed.
    await db.delete(extensionTags)
    await db.delete(extensions)
  })

  async function seedExtension(overrides: Partial<typeof extensions.$inferInsert> = {}) {
    const row: typeof extensions.$inferInsert = {
      id: "ext-1",
      slug: "kubernetes-helper",
      category: "skills",
      scope: "personal",
      ownerOrgId: "org-1",
      name: "Kubernetes Helper",
      description: "A helper for kubernetes",
      visibility: "published",
      downloadsCount: 10,
      ...overrides,
    }
    await db.insert(extensions).values(row)
    return row.id!
  }

  describe("findBySlug", () => {
    it("returns a published extension by slug with tag ids aggregated", async () => {
      await seedExtension()
      await db.insert(extensionTags).values([
        { extensionId: "ext-1", tagId: "automation" },
        { extensionId: "ext-1", tagId: "k8s" },
      ])

      const ext = await extensionsRepo.findBySlug(db, "kubernetes-helper")
      expect(ext).not.toBeNull()
      expect(ext!.slug).toBe("kubernetes-helper")
      expect([...(ext!.tagIds ?? [])].sort()).toEqual(["automation", "k8s"])
    })

    it("returns null for a draft extension when onlyPublished is implicit (true)", async () => {
      await seedExtension({ visibility: "draft" })
      const ext = await extensionsRepo.findBySlug(db, "kubernetes-helper")
      expect(ext).toBeNull()
    })

    it("returns a draft extension when onlyPublished is false", async () => {
      await seedExtension({ visibility: "draft" })
      const ext = await extensionsRepo.findBySlug(
        db,
        "kubernetes-helper",
        { onlyPublished: false },
      )
      expect(ext).not.toBeNull()
      expect(ext!.visibility).toBe("draft")
    })

    it("returns null when no extension matches", async () => {
      const ext = await extensionsRepo.findBySlug(db, "nonexistent")
      expect(ext).toBeNull()
    })
  })

  describe("findById", () => {
    it("returns an extension by id regardless of visibility", async () => {
      await seedExtension({ visibility: "draft" })
      const ext = await extensionsRepo.findById(db, "ext-1")
      expect(ext?.id).toBe("ext-1")
    })

    it("returns null for an unknown id", async () => {
      const ext = await extensionsRepo.findById(db, "nope")
      expect(ext).toBeNull()
    })
  })

  describe("findManyForList + countFiltered", () => {
    it("returns only published extensions and counts them", async () => {
      await seedExtension({ id: "ext-1", slug: "a", visibility: "published" })
      await seedExtension({ id: "ext-2", slug: "b", visibility: "published" })
      await seedExtension({ id: "ext-3", slug: "c", visibility: "draft" })

      const filters = parseFilters({ sort: "recent", dept: "__all" })
      const rows = await extensionsRepo.findManyForList(db, filters)
      const total = await extensionsRepo.countFiltered(db, filters)
      expect(rows.map((r) => r.slug).sort()).toEqual(["a", "b"])
      expect(total).toBe(2)
    })
  })

  describe("findFeatured", () => {
    it("returns the published extension with the most downloads", async () => {
      await seedExtension({ id: "ext-low", slug: "low", downloadsCount: 5 })
      await seedExtension({ id: "ext-high", slug: "high", downloadsCount: 50 })
      await seedExtension({
        id: "ext-draft",
        slug: "draft",
        downloadsCount: 999,
        visibility: "draft",
      })

      const featured = await extensionsRepo.findFeatured(db)
      expect(featured?.slug).toBe("high")
    })

    it("returns null when nothing is published", async () => {
      await seedExtension({ visibility: "draft" })
      const featured = await extensionsRepo.findFeatured(db)
      expect(featured).toBeNull()
    })
  })

  describe("findRelated", () => {
    it("returns up to 4 published extensions of the same category, excluding self", async () => {
      await seedExtension({ id: "ext-1", slug: "self", category: "skills" })
      await seedExtension({ id: "ext-2", slug: "p1", category: "skills", downloadsCount: 30 })
      await seedExtension({ id: "ext-3", slug: "p2", category: "skills", downloadsCount: 20 })
      await seedExtension({ id: "ext-4", slug: "mcp1", category: "mcp" })
      await seedExtension({
        id: "ext-5",
        slug: "draft1",
        category: "skills",
        visibility: "draft",
      })

      const related = await extensionsRepo.findRelated(db, "ext-1", "skills")
      const slugs = related.map((r) => r.slug)
      expect(slugs).toEqual(["p1", "p2"])
    })
  })

  describe("updateVisibility", () => {
    it("flips a draft to published with publishedAt set", async () => {
      await seedExtension({ visibility: "draft" })
      const now = new Date("2026-01-01T00:00:00Z")
      await extensionsRepo.updateVisibility(db, "ext-1", {
        visibility: "published",
        publishedAt: now,
      })
      const ext = await extensionsRepo.findById(db, "ext-1")
      expect(ext?.visibility).toBe("published")
      expect(ext?.publishedAt?.toISOString()).toBe(now.toISOString())
    })
  })

  describe("incrementDownloads", () => {
    it("adds 1 to downloads_count atomically — concurrent calls don't lose updates", async () => {
      await seedExtension({ downloadsCount: 0 })
      // SQL-level `+ 1` is what makes this safe under contention; the
      // assertion would fail if the function were implemented as
      // "read, increment in JS, write" rather than `set ... = ... + 1`.
      await Promise.all(
        Array.from({ length: 20 }, () =>
          extensionsRepo.incrementDownloads(db, "ext-1"),
        ),
      )
      const ext = await extensionsRepo.findById(db, "ext-1")
      expect(ext?.downloadsCount).toBe(20)
    })
  })
})
