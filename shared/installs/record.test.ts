import { describe, expect, it } from "vitest"

import { pickInstallVersion, type VersionCandidate } from "./record"

const makeCandidate = (
  version: string,
  publishedAt: Date | null = null,
): VersionCandidate => ({
  version,
  publishedAt,
  createdAt: new Date("2026-01-01T00:00:00Z"),
})

describe("pickInstallVersion", () => {
  it("returns the requested version verbatim (passthrough) regardless of candidates", () => {
    const result = pickInstallVersion({
      requested: "1.2.3",
      candidates: [makeCandidate("9.9.9")],
    })
    expect(result).toEqual({ ok: true, version: "1.2.3" })
  })

  it("returns the requested version even when candidates is empty (passthrough trust)", () => {
    const result = pickInstallVersion({
      requested: "1.2.3",
      candidates: [],
    })
    expect(result).toEqual({ ok: true, version: "1.2.3" })
  })

  it("returns the first candidate when no version is requested", () => {
    const result = pickInstallVersion({
      requested: undefined,
      candidates: [
        makeCandidate("2.0.0", new Date("2026-03-01T00:00:00Z")),
        makeCandidate("1.0.0", new Date("2026-01-01T00:00:00Z")),
      ],
    })
    expect(result).toEqual({ ok: true, version: "2.0.0" })
  })

  it("returns no_published_version error when no version is requested and there are no candidates", () => {
    const result = pickInstallVersion({
      requested: undefined,
      candidates: [],
    })
    expect(result).toEqual({ ok: false, error: "no_published_version" })
  })
})
