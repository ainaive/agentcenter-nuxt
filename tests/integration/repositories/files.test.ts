import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import * as filesRepo from "~~/server/repositories/files"
import { files } from "~~/shared/db/schema"

import { setupDb, type TestDb } from "../helpers/db"

describe("files repository", () => {
  let db: TestDb
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const handle = await setupDb()
    db = handle.db
    cleanup = handle.cleanup
  })

  afterAll(async () => {
    await cleanup()
  })

  beforeEach(async () => {
    await db.delete(files)
  })

  async function seedFile(
    overrides: Partial<typeof files.$inferInsert> = {},
  ) {
    await db.insert(files).values({
      id: "file-1",
      r2Key: "bundles/x/1.0.0/bundle.zip",
      size: 1024n,
      checksumSha256: "abc123",
      scanStatus: "pending",
      ...overrides,
    })
  }

  describe("findById", () => {
    it("returns the file row by id", async () => {
      await seedFile()
      const row = await filesRepo.findById(db, "file-1")
      expect(row?.id).toBe("file-1")
      expect(row?.r2Key).toBe("bundles/x/1.0.0/bundle.zip")
      expect(row?.scanStatus).toBe("pending")
    })

    it("returns null when the id does not exist", async () => {
      const row = await filesRepo.findById(db, "nope")
      expect(row).toBeNull()
    })
  })

  describe("updateScanStatus", () => {
    it("clean variant writes scanStatus + scanReport + checksum", async () => {
      await seedFile()
      const report = { manifestOk: true, reason: null }
      await filesRepo.updateScanStatus(db, "file-1", {
        scanStatus: "clean",
        scanReport: report,
        checksumSha256: "deadbeef",
      })
      const row = await filesRepo.findById(db, "file-1")
      expect(row?.scanStatus).toBe("clean")
      expect(row?.checksumSha256).toBe("deadbeef")
      expect(row?.scanReport).toEqual(report)
    })

    it("flagged variant writes scanStatus + scanReport but leaves checksum untouched", async () => {
      await seedFile({ checksumSha256: "originalhash" })
      const report = { manifestOk: false, reason: "missing_manifest" }
      await filesRepo.updateScanStatus(db, "file-1", {
        scanStatus: "flagged",
        scanReport: report,
      })
      const row = await filesRepo.findById(db, "file-1")
      expect(row?.scanStatus).toBe("flagged")
      expect(row?.checksumSha256).toBe("originalhash")
      expect(row?.scanReport).toEqual(report)
    })
  })
})
