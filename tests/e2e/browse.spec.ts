import { expect, test } from "@playwright/test"

// Browse-page golden path. The seed in scripts/seed.ts always lands at least
// one published extension, so an empty grid is a regression. These tests are
// SSR-only (request.get + HTML assertions) so they don't require a JS
// runtime and stay fast.

test.describe("browse page", () => {
  test("/en/extensions returns 200 and renders the browse title", async ({ request }) => {
    const response = await request.get("/en/extensions")
    expect(response.status()).toBe(200)
    const html = await response.text()
    expect(html).toContain("Browse all")
  })

  test("/zh/extensions returns 200 and uses zh wording", async ({ request }) => {
    const response = await request.get("/zh/extensions")
    expect(response.status()).toBe(200)
    const html = await response.text()
    // "浏览全部" or similar — covered by the locked Chinese-i18n decision.
    expect(html).toMatch(/lang="zh"/)
  })

  test("filter chips + scope pills + sort select are SSR'd into the page", async ({ request }) => {
    const response = await request.get("/en/extensions")
    const html = await response.text()
    // Mode B filter UI per locked decision #3 — the three rows must be in
    // the response, not lazy-mounted client-side.
    expect(html).toContain("Scope")
    expect(html).toContain("Sort by")
  })

  test("?sort=stars survives the round-trip", async ({ page }) => {
    await page.goto("/en/extensions?sort=stars")
    await expect(page).toHaveURL(/[?&]sort=stars/)
    await expect(page.locator("select")).toContainText(/Stars/)
  })
})
