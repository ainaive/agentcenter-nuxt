import { describe, it, expect } from "vitest"
import { FUNC_TAXONOMY, FUNC_CAT_COLORS } from "~~/shared/taxonomy"

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
