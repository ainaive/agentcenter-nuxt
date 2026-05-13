import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import * as collectionsRepo from "~~/server/repositories/collections"
import {
  collectionItems,
  collections,
  extensions,
  organizations,
  users,
} from "~~/shared/db/schema"

import { setupDb, type TestDb } from "../helpers/db"

describe("collections repository", () => {
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
    await db.insert(users).values({
      id: "u-alice",
      email: "alice@example.com",
      name: "Alice",
    })
    await db.insert(extensions).values({
      id: "ext-a",
      slug: "ext-a",
      category: "skills",
      scope: "personal",
      ownerOrgId: "org-1",
      name: "Ext A",
      visibility: "published",
    })
  })

  afterAll(async () => {
    await cleanup()
  })

  beforeEach(async () => {
    await db.delete(collectionItems)
    await db.delete(collections)
  })

  describe("getOrCreateSystem", () => {
    it("creates a new collection with the canonical name on first call", async () => {
      const { id } = await collectionsRepo.getOrCreateSystem(db, "u-alice", "installed")
      const rows = await db.select().from(collections)
      expect(rows).toHaveLength(1)
      expect(rows[0]?.id).toBe(id)
      expect(rows[0]?.name).toBe("Installed")
      expect(rows[0]?.systemKind).toBe("installed")
    })

    it("is idempotent — second call returns the same id", async () => {
      const first = await collectionsRepo.getOrCreateSystem(db, "u-alice", "installed")
      const second = await collectionsRepo.getOrCreateSystem(db, "u-alice", "installed")
      expect(second.id).toBe(first.id)
      const rows = await db.select().from(collections)
      expect(rows).toHaveLength(1)
    })

    it("separates installed vs saved into distinct rows", async () => {
      await collectionsRepo.getOrCreateSystem(db, "u-alice", "installed")
      await collectionsRepo.getOrCreateSystem(db, "u-alice", "saved")
      const rows = await db.select().from(collections)
      expect(rows).toHaveLength(2)
      expect(rows.map((r) => r.systemKind).sort()).toEqual(["installed", "saved"])
    })
  })

  describe("addItem", () => {
    it("inserts a (collectionId, extensionId) row", async () => {
      const { id: collectionId } = await collectionsRepo.getOrCreateSystem(
        db,
        "u-alice",
        "installed",
      )
      await collectionsRepo.addItem(db, collectionId, "ext-a")
      const rows = await db.select().from(collectionItems)
      expect(rows).toHaveLength(1)
      expect(rows[0]?.collectionId).toBe(collectionId)
      expect(rows[0]?.extensionId).toBe("ext-a")
    })

    it("ON CONFLICT DO NOTHING on the composite primary key — second add is a noop", async () => {
      const { id: collectionId } = await collectionsRepo.getOrCreateSystem(
        db,
        "u-alice",
        "installed",
      )
      await collectionsRepo.addItem(db, collectionId, "ext-a")
      await collectionsRepo.addItem(db, collectionId, "ext-a")
      const rows = await db.select().from(collectionItems)
      expect(rows).toHaveLength(1)
    })
  })
})
