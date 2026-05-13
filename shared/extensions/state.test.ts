import { describe, expect, it } from "vitest"

import {
  decidePublishOutcome,
  decideScanOutcome,
  type ScanResult,
} from "./state"

const NOW = new Date("2026-05-13T12:00:00Z")

const SUCCESS: ScanResult = {
  ok: true,
  checksum: "abc123",
  scanReport: { manifestOk: true, reason: null },
}

const FAILURE: ScanResult = {
  ok: false,
  reason: "missing_manifest",
  scanReport: { manifestOk: false, reason: "missing_manifest" },
}

describe("decideScanOutcome", () => {
  describe("scan failure", () => {
    it("flags the file and rejects the version regardless of scope", () => {
      for (const scope of ["personal", "org", "enterprise"] as const) {
        const decision = decideScanOutcome({ scope, result: FAILURE, now: NOW })
        expect(decision.file).toEqual({
          scanStatus: "flagged",
          scanReport: FAILURE.scanReport,
        })
        expect(decision.version).toEqual({ status: "rejected" })
        expect(decision.extension).toBeUndefined()
      }
    })
  })

  describe("scan success — personal scope", () => {
    const decision = decideScanOutcome({
      scope: "personal",
      result: SUCCESS,
      now: NOW,
    })

    it("marks the file clean with the scan's checksum", () => {
      expect(decision.file).toEqual({
        scanStatus: "clean",
        scanReport: SUCCESS.scanReport,
        checksumSha256: "abc123",
      })
    })

    it("sets the version to ready and stamps publishedAt to now", () => {
      expect(decision.version).toEqual({ status: "ready", publishedAt: NOW })
    })

    it("flips the parent extension to published with the same publishedAt", () => {
      expect(decision.extension).toEqual({
        visibility: "published",
        publishedAt: NOW,
      })
    })
  })

  describe("scan success — org scope", () => {
    const decision = decideScanOutcome({
      scope: "org",
      result: SUCCESS,
      now: NOW,
    })

    it("marks the file clean", () => {
      expect(decision.file.scanStatus).toBe("clean")
    })

    it("sets the version to ready with publishedAt null (admin must publish)", () => {
      expect(decision.version).toEqual({ status: "ready", publishedAt: null })
    })

    it("does NOT flip the parent extension to published", () => {
      expect(decision.extension).toBeUndefined()
    })
  })

  describe("scan success — enterprise scope", () => {
    const decision = decideScanOutcome({
      scope: "enterprise",
      result: SUCCESS,
      now: NOW,
    })

    it("sets the version to ready with publishedAt null", () => {
      expect(decision.version).toEqual({ status: "ready", publishedAt: null })
    })

    it("does NOT flip the parent extension to published", () => {
      expect(decision.extension).toBeUndefined()
    })
  })
})

describe("decidePublishOutcome", () => {
  it("returns an extension + version update with the same publishedAt instance", () => {
    const decision = decidePublishOutcome(NOW)
    expect(decision.extension).toEqual({ visibility: "published", publishedAt: NOW })
    expect(decision.version).toEqual({ publishedAt: NOW })
    expect(decision.extension.publishedAt).toBe(decision.version.publishedAt)
  })
})
