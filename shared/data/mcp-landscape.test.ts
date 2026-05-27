import { describe, expect, it } from "vitest"
import { deriveStatus, ownerToParts, rollupStatus } from "./mcp-landscape"

describe("deriveStatus", () => {
  it("released when extensionId is set", () => {
    expect(deriveStatus({ extensionId: "mcp-ide-mcp", inDev: false })).toBe("released")
  })

  it("released wins even if inDev would also be true (CHECK constraint forbids it but defensive)", () => {
    expect(deriveStatus({ extensionId: "mcp-ide-mcp", inDev: true })).toBe("released")
  })

  it("dev when no extensionId but inDev is true", () => {
    expect(deriveStatus({ extensionId: null, inDev: true })).toBe("dev")
  })

  it("none when neither", () => {
    expect(deriveStatus({ extensionId: null, inDev: false })).toBe("none")
  })
})

describe("rollupStatus", () => {
  it("released wins when any MCP is released", () => {
    expect(rollupStatus(["dev", "released", "none"])).toBe("released")
    expect(rollupStatus(["released"])).toBe("released")
  })

  it("dev when at least one is dev and none are released", () => {
    expect(rollupStatus(["dev", "none"])).toBe("dev")
    expect(rollupStatus(["dev"])).toBe("dev")
  })

  it("none when all are none or list is empty", () => {
    expect(rollupStatus(["none", "none"])).toBe("none")
    expect(rollupStatus([])).toBe("none")
  })
})

describe("ownerToParts", () => {
  it("treats a bare key as an industry sector", () => {
    expect(ownerToParts("wireless")).toEqual({ layer: "industry", primary: "wireless" })
  })

  it("treats a dotted key as a public domain.pdt", () => {
    expect(ownerToParts("ai-rd.dev-services")).toEqual({
      layer: "public",
      primary: "ai-rd",
      secondary: "dev-services",
    })
  })
})
