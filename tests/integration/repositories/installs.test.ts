import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import * as installsRepo from "~~/server/repositories/installs"
import {
  extensions,
  installs,
  organizations,
  users,
} from "~~/shared/db/schema"

import { setupDb, type TestDb } from "../helpers/db"

describe("installs repository", () => {
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
    ])
    await db.insert(extensions).values([
      {
        id: "ext-a",
        slug: "ext-a",
        category: "skills",
        scope: "personal",
        ownerOrgId: "org-1",
        name: "Ext A",
        visibility: "published",
      },
      {
        id: "ext-b",
        slug: "ext-b",
        category: "skills",
        scope: "personal",
        ownerOrgId: "org-1",
        name: "Ext B",
        visibility: "published",
      },
    ])
  })

  afterAll(async () => {
    await cleanup()
  })

  beforeEach(async () => {
    await db.delete(installs)
  })

  describe("findByUserAndExtension", () => {
    it("returns null when no install exists", async () => {
      const row = await installsRepo.findByUserAndExtension(db, "u-alice", "ext-a")
      expect(row).toBeNull()
    })

    it("returns the row id when a prior install exists for the same user+extension", async () => {
      await installsRepo.insertInstall(db, {
        id: "inst-1",
        userId: "u-alice",
        extensionId: "ext-a",
        version: "1.0.0",
        source: "web",
      })
      const row = await installsRepo.findByUserAndExtension(db, "u-alice", "ext-a")
      expect(row?.id).toBe("inst-1")
    })

    it("does not return another user's install for the same extension", async () => {
      await installsRepo.insertInstall(db, {
        id: "inst-bob",
        userId: "u-bob",
        extensionId: "ext-a",
        version: "1.0.0",
        source: "cli",
      })
      const row = await installsRepo.findByUserAndExtension(db, "u-alice", "ext-a")
      expect(row).toBeNull()
    })

    it("does not return an install for a different extension", async () => {
      await installsRepo.insertInstall(db, {
        id: "inst-alice-a",
        userId: "u-alice",
        extensionId: "ext-a",
        version: "1.0.0",
        source: "web",
      })
      const row = await installsRepo.findByUserAndExtension(db, "u-alice", "ext-b")
      expect(row).toBeNull()
    })
  })

  describe("insertInstall", () => {
    it("persists the row with the given source enum", async () => {
      await installsRepo.insertInstall(db, {
        id: "inst-cli",
        userId: "u-alice",
        extensionId: "ext-a",
        version: "2.1.0",
        source: "cli",
      })
      const rows = await db.select().from(installs)
      expect(rows).toHaveLength(1)
      expect(rows[0]?.source).toBe("cli")
      expect(rows[0]?.version).toBe("2.1.0")
    })

    it("allows multiple installs for the same user+extension (no unique constraint)", async () => {
      await installsRepo.insertInstall(db, {
        id: "inst-1",
        userId: "u-alice",
        extensionId: "ext-a",
        version: "1.0.0",
        source: "web",
      })
      await installsRepo.insertInstall(db, {
        id: "inst-2",
        userId: "u-alice",
        extensionId: "ext-a",
        version: "1.1.0",
        source: "cli",
      })
      const rows = await db.select().from(installs)
      expect(rows).toHaveLength(2)
    })
  })
})
