import { describe, expect, it } from "vitest"
import { CATALOG } from "~~/shared/data/catalog"

// Guards the editorial decision that the home "Recommended" tab (which
// filters `badge === 'official' AND category === 'skills'`) has enough
// content to fill the grid. A casual badge edit could silently shrink the
// tab back to a single row; this test makes that change loud.
describe("catalog: official-skill curation", () => {
  const officialSkills = CATALOG.filter(
    (e) => e.category === "skills" && e.badge === "official",
  )

  it("includes at least 12 official skills", () => {
    expect(officialSkills.length).toBeGreaterThanOrEqual(12)
  })

  it("spreads official skills across at least 3 functional categories", () => {
    const funcCats = new Set(officialSkills.map((e) => e.funcCat))
    expect(funcCats.size).toBeGreaterThanOrEqual(3)
  })
})
