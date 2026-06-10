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

// Guards the editorial decision (ADR-0002) that a freshly-deployed Vercel
// environment lands with a populated /cli listing. The catalog seed runs
// on every vercel-build via scripts/seed-catalog.ts, so cuts here are
// what end users see; the lower bound is intentionally conservative
// (20 of the 32 seeded) so editorial trimming has headroom without
// triggering false alarms.
describe("catalog: cli curation", () => {
  const cliTools = CATALOG.filter((e) => e.category === "cli")

  it("includes at least 20 cli tools", () => {
    expect(cliTools.length).toBeGreaterThanOrEqual(20)
  })

  it("spreads cli tools across at least 3 subCats", () => {
    const subCats = new Set(cliTools.map((e) => e.subCat))
    expect(subCats.size).toBeGreaterThanOrEqual(3)
  })

  it("includes at least one official-tier cli tool per tier", () => {
    // Both Company and Product-Line official tiers should have visible
    // examples so the filter rail's tier picker exercises real data on a
    // fresh deploy.
    const company = cliTools.filter((e) => e.officialTier === "company")
    const productLine = cliTools.filter((e) => e.officialTier === "productLine")
    expect(company.length).toBeGreaterThanOrEqual(1)
    expect(productLine.length).toBeGreaterThanOrEqual(1)
  })
})
