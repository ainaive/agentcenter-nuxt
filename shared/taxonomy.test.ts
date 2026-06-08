import { describe, it, expect } from "vitest"
import {
  ALL_L1_KEYS,
  ALL_L2_KEYS,
  FUNC_CAT_COLORS,
  FUNC_TAXONOMY,
  categoryAncestors,
  isL1Key,
  isL2Key,
  l1KeyFor,
  l2KeysFor,
} from "~~/shared/taxonomy"

describe("taxonomy", () => {
  it("has exactly three top-level func categories", () => {
    expect(FUNC_TAXONOMY.map((n) => n.key).sort()).toEqual([
      "business",
      "tools",
      "workTask",
    ])
  })

  it("every node has three l1 entries, each with three l2 entries", () => {
    for (const node of FUNC_TAXONOMY) {
      expect(node.l1).toHaveLength(3)
      for (const l1 of node.l1) {
        expect(l1.l2).toHaveLength(3)
        expect(typeof l1.key).toBe("string")
        for (const l2 of l1.l2) expect(typeof l2).toBe("string")
      }
    }
  })

  it("l1 keys are unique across the whole taxonomy", () => {
    const all = FUNC_TAXONOMY.flatMap((n) => n.l1.map((l) => l.key))
    expect(new Set(all).size).toBe(all.length)
  })

  it("FUNC_CAT_COLORS has an entry for every FuncCatKey", () => {
    for (const node of FUNC_TAXONOMY) {
      expect(FUNC_CAT_COLORS[node.key]).toMatch(/^oklch\(/)
    }
  })
})

describe("ALL_L1_KEYS / ALL_L2_KEYS", () => {
  it("ALL_L1_KEYS has 9 unique keys covering every node", () => {
    expect(ALL_L1_KEYS).toHaveLength(9)
    expect(new Set(ALL_L1_KEYS).size).toBe(ALL_L1_KEYS.length)
    expect(ALL_L1_KEYS).toContain("systemDesign")
    expect(ALL_L1_KEYS).toContain("network")
    expect(ALL_L1_KEYS).toContain("vcs")
  })

  it("ALL_L2_KEYS has 27 unique keys", () => {
    expect(ALL_L2_KEYS).toHaveLength(27)
    expect(new Set(ALL_L2_KEYS).size).toBe(ALL_L2_KEYS.length)
  })
})

describe("l1KeyFor / l2KeysFor", () => {
  it("l1KeyFor maps an l2 leaf back to its parent l1", () => {
    expect(l1KeyFor("reqAnalysis")).toBe("systemDesign")
    expect(l1KeyFor("frontend")).toBe("softDev")
    expect(l1KeyFor("k8s")).toBe("cloud")
  })

  it("l1KeyFor returns null for unknown keys", () => {
    expect(l1KeyFor("not-a-real-key")).toBeNull()
    expect(l1KeyFor("systemDesign")).toBeNull() // an l1 key is not an l2
  })

  it("l2KeysFor returns the three l2 children of an l1", () => {
    expect([...l2KeysFor("systemDesign")]).toEqual([
      "reqAnalysis",
      "funcDesign",
      "archDesign",
    ])
    expect([...l2KeysFor("softDev")]).toEqual(["frontend", "backend", "devops"])
  })

  it("l2KeysFor returns an empty array for unknown keys", () => {
    expect(l2KeysFor("not-a-real-key")).toEqual([])
  })
})

describe("isL1Key / isL2Key", () => {
  it("recognises known l1 and l2 keys", () => {
    expect(isL1Key("systemDesign")).toBe(true)
    expect(isL2Key("reqAnalysis")).toBe(true)
  })

  it("returns false for cross-level or unknown inputs", () => {
    expect(isL1Key("reqAnalysis")).toBe(false)
    expect(isL2Key("systemDesign")).toBe(false)
    expect(isL1Key("nope")).toBe(false)
    expect(isL2Key("nope")).toBe(false)
    expect(isL1Key("*")).toBe(false)
  })
})

describe("categoryAncestors", () => {
  it("walks micro → macro → all", () => {
    expect(categoryAncestors("micro", "reqAnalysis")).toEqual([
      { level: "micro", key: "reqAnalysis" },
      { level: "macro", key: "systemDesign" },
      { level: "all", key: "*" },
    ])
  })

  it("walks macro → all", () => {
    expect(categoryAncestors("macro", "systemDesign")).toEqual([
      { level: "macro", key: "systemDesign" },
      { level: "all", key: "*" },
    ])
  })

  it("'all' is its own only ancestor", () => {
    expect(categoryAncestors("all", "*")).toEqual([
      { level: "all", key: "*" },
    ])
  })

  it("collapses an unrecognised micro key to just the wildcard", () => {
    // No parent l1 — the only covering ancestor is (all, *).
    expect(categoryAncestors("micro", "not-a-real-key")).toEqual([
      { level: "micro", key: "not-a-real-key" },
      { level: "all", key: "*" },
    ])
  })
})
