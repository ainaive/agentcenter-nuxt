import { describe, it, expect } from "vitest"
import { TAG_LABELS, tagLabel } from "~~/shared/tags"

describe("tags", () => {
  it("every TAG_LABELS entry has both en and zh strings", () => {
    for (const [key, label] of Object.entries(TAG_LABELS)) {
      expect(typeof label.en, key).toBe("string")
      expect(typeof label.zh, key).toBe("string")
      expect(label.en.length, key).toBeGreaterThan(0)
      expect(label.zh.length, key).toBeGreaterThan(0)
    }
  })

  it("tagLabel returns the localized value", () => {
    expect(tagLabel("search", "en")).toBe("search")
    expect(tagLabel("search", "zh")).toBe("搜索")
    expect(tagLabel("real-time", "zh")).toBe("实时")
  })

  it("tagLabel falls back to the key when unknown", () => {
    expect(tagLabel("does-not-exist", "en")).toBe("does-not-exist")
    expect(tagLabel("does-not-exist", "zh")).toBe("does-not-exist")
  })
})
