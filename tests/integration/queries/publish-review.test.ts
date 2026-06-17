import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { extensionVersions, extensions, organizations } from "~~/shared/db/schema"

import { setupDb, type TestDb } from "../helpers/db"

// listPublishReviewQueue calls useDb() internally; mock it onto the PGlite
// handle (same pattern as queries/profile.test.ts).
const dbRef = vi.hoisted(() => ({ current: null as TestDb | null }))
vi.mock("~~/server/utils/db", () => ({
  useDb: () => dbRef.current as TestDb,
}))

const { listPublishReviewQueue } = await import(
  "~~/server/utils/queries/publish-review"
)

describe("listPublishReviewQueue", () => {
  let db: TestDb
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const handle = await setupDb()
    db = handle.db
    cleanup = handle.cleanup
    dbRef.current = db
    await db
      .insert(organizations)
      .values({ id: "org-1", slug: "org-1", name: "Org One" })
  })

  afterAll(async () => {
    await cleanup()
  })

  beforeEach(async () => {
    await db.delete(extensionVersions)
    await db.delete(extensions)
  })

  async function seed(
    ext: Partial<typeof extensions.$inferInsert> & { id: string; slug: string },
    ver?: Partial<typeof extensionVersions.$inferInsert>,
  ) {
    await db.insert(extensions).values({
      category: "skills",
      scope: "org",
      ownerOrgId: "org-1",
      name: ext.id,
      visibility: "draft",
      ...ext,
    })
    if (ver) {
      await db.insert(extensionVersions).values({
        id: `${ext.id}-v1`,
        extensionId: ext.id,
        version: "1.0.0",
        status: "ready",
        ...ver,
      })
    }
  }

  it("lists org + enterprise drafts that have a ready version", async () => {
    await seed({ id: "ext-org", slug: "ext-org", scope: "org" }, { status: "ready" })
    await seed(
      { id: "ext-ent", slug: "ext-ent", scope: "enterprise" },
      { status: "ready" },
    )

    const rows = await listPublishReviewQueue()
    expect(rows.map((r) => r.extensionId).sort()).toEqual(["ext-ent", "ext-org"])
    const org = rows.find((r) => r.extensionId === "ext-org")
    expect(org?.versionId).toBe("ext-org-v1")
    expect(org?.scope).toBe("org")
    expect(typeof org?.createdAt).toBe("string")
  })

  it("excludes personal scope (it auto-publishes)", async () => {
    await seed(
      { id: "ext-personal", slug: "ext-personal", scope: "personal" },
      { status: "ready" },
    )
    expect(await listPublishReviewQueue()).toEqual([])
  })

  it("excludes already-published extensions", async () => {
    await seed(
      { id: "ext-pub", slug: "ext-pub", scope: "org", visibility: "published" },
      { status: "ready" },
    )
    expect(await listPublishReviewQueue()).toEqual([])
  })

  it("excludes extensions whose version is not yet ready", async () => {
    await seed(
      { id: "ext-scan", slug: "ext-scan", scope: "org" },
      { status: "scanning" },
    )
    expect(await listPublishReviewQueue()).toEqual([])
  })

  it("dedupes to the latest ready version per extension", async () => {
    await db.insert(extensions).values({
      id: "ext-multi",
      slug: "ext-multi",
      category: "skills",
      scope: "org",
      ownerOrgId: "org-1",
      name: "Multi",
      visibility: "draft",
    })
    await db.insert(extensionVersions).values([
      {
        id: "v-old",
        extensionId: "ext-multi",
        version: "0.9.0",
        status: "ready",
        createdAt: new Date("2026-01-01T00:00:00Z"),
      },
      {
        id: "v-new",
        extensionId: "ext-multi",
        version: "1.0.0",
        status: "ready",
        createdAt: new Date("2026-02-01T00:00:00Z"),
      },
    ])

    const rows = await listPublishReviewQueue()
    expect(rows).toHaveLength(1)
    expect(rows[0]?.versionId).toBe("v-new")
  })
})
