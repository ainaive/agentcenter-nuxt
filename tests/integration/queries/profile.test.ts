import { eq } from "drizzle-orm"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import {
  approvalRequests,
  extensions,
  organizations,
  users,
} from "~~/shared/db/schema"

import { setupDb, type TestDb } from "../helpers/db"

// `getRequestsForUser` calls `useDb()` internally — that's the established
// queries-layer pattern (see every other function in
// `server/utils/queries/profile.ts`). Mock `useDb` so it returns the PGlite
// handle we set up below. `vi.hoisted` lets the mock factory close over a
// ref that's mutated from `beforeAll`.
const dbRef = vi.hoisted(() => ({ current: null as TestDb | null }))
vi.mock("~~/server/utils/db", () => ({
  useDb: () => dbRef.current as TestDb,
}))

const { getRequestsForUser } = await import("~~/server/utils/queries/profile")

describe("getRequestsForUser", () => {
  let db: TestDb
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const handle = await setupDb()
    db = handle.db
    cleanup = handle.cleanup
    dbRef.current = db

    await db.insert(organizations).values({
      id: "org-1",
      slug: "org-1",
      name: "Org One",
    })
    await db.insert(users).values([
      { id: "u-pub", email: "pub.example.test", name: "Pub", emailVerified: true },
      { id: "u-other", email: "other.example.test", name: "Other", emailVerified: true },
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
        iconColor: "#abc",
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
        iconColor: null,
        visibility: "published",
      },
    ])
  })

  afterAll(async () => {
    await cleanup()
  })

  beforeEach(async () => {
    await db.delete(approvalRequests)
  })

  it("returns the user's requests with extension display fields joined in", async () => {
    await db.insert(approvalRequests).values({
      id: "req-1",
      extensionId: "ext-a",
      requestedTier: "company",
      subCat: "softDev",
      requestedByUserId: "u-pub",
      reason: "Lots of usage.",
      status: "pending",
    })
    const rows = await getRequestsForUser("u-pub")
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      requestId: "req-1",
      extensionId: "ext-a",
      slug: "ext-a",
      name: "Ext A",
      category: "skills",
      iconColor: "#abc",
      requestedTier: "company",
      subCat: "softDev",
      status: "pending",
      reason: "Lots of usage.",
      reviewerNote: null,
      decidedAt: null,
    })
    expect(rows[0]!.createdAt).toBeInstanceOf(Date)
  })

  it("orders by createdAt desc — most recent submission first", async () => {
    await db.insert(approvalRequests).values({
      id: "req-old",
      extensionId: "ext-a",
      requestedTier: "productLine",
      subCat: "softDev",
      requestedByUserId: "u-pub",
      status: "pending",
    })
    await db
      .update(approvalRequests)
      .set({ createdAt: new Date("2026-06-01T10:00:00Z") })
      .where(approvalsIdEq("req-old"))

    await db.insert(approvalRequests).values({
      id: "req-new",
      extensionId: "ext-b",
      requestedTier: "company",
      subCat: "docs",
      requestedByUserId: "u-pub",
      status: "pending",
    })
    await db
      .update(approvalRequests)
      .set({ createdAt: new Date("2026-06-05T10:00:00Z") })
      .where(approvalsIdEq("req-new"))

    const rows = await getRequestsForUser("u-pub")
    expect(rows.map((r) => r.requestId)).toEqual(["req-new", "req-old"])
  })

  it("does not leak another user's requests", async () => {
    await db.insert(approvalRequests).values({
      id: "req-other",
      extensionId: "ext-a",
      requestedTier: "company",
      subCat: "softDev",
      // Same extension, different requester.
      requestedByUserId: "u-other",
      status: "pending",
    })
    const rows = await getRequestsForUser("u-pub")
    expect(rows).toHaveLength(0)
  })

  it("returns empty for a user with no requests", async () => {
    const rows = await getRequestsForUser("u-pub")
    expect(rows).toEqual([])
  })
})

function approvalsIdEq(id: string) {
  return eq(approvalRequests.id, id)
}
