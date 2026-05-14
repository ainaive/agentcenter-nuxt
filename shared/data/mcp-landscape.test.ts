import { describe, expect, it } from "vitest"
import { deriveStatus, ownerToParts } from "./mcp-landscape"

describe("deriveStatus", () => {
  it("released when extensionId is set", () => {
    expect(deriveStatus({ extensionId: "mcp-ide", inDev: false })).toBe("released")
  })

  it("released wins even if inDev would also be true (CHECK constraint forbids it but defensive)", () => {
    expect(deriveStatus({ extensionId: "mcp-ide", inDev: true })).toBe("released")
  })

  it("dev when no extensionId but inDev is true", () => {
    expect(deriveStatus({ extensionId: null, inDev: true })).toBe("dev")
  })

  it("none when neither", () => {
    expect(deriveStatus({ extensionId: null, inDev: false })).toBe("none")
  })
})

describe("ownerToParts", () => {
  it("treats a bare key as an industry sector", () => {
    expect(ownerToParts("wireless")).toEqual({ layer: "industry", primary: "wireless" })
  })

  it("treats a dotted key as a public domain.pdt", () => {
    expect(ownerToParts("airnd.devsvcs")).toEqual({
      layer: "public",
      primary: "airnd",
      secondary: "devsvcs",
    })
  })
})
