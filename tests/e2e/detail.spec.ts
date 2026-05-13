import { expect, test } from "@playwright/test"

// Detail-page golden path. We don't hard-code a slug — the seed file may
// change which one ships first. Instead we navigate from the browse page
// to the first card and assert the detail page renders the expected
// composed structure (hero + tabs + about + related).

test.describe("extension detail", () => {
  test("clicking a browse card lands on a detail page with hero + tabs", async ({ page }) => {
    await page.goto("/en/extensions")
    const firstCardLink = page.locator("a[href*='/en/extensions/']").first()
    await expect(firstCardLink).toBeVisible()

    await firstCardLink.click()
    await page.waitForURL(/\/en\/extensions\/[^/]+$/)

    // Hero
    await expect(page.locator("h1").first()).toBeVisible()
    // Tabs row from ExtTabs (Overview / Setup / Permissions)
    await expect(page.getByRole("tab", { name: "Overview" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Setup" })).toBeVisible()
    // About card heading
    await expect(page.getByRole("heading", { name: "About" })).toBeVisible()
  })

  test("404 slug renders an error page with statusCode 404", async ({ request }) => {
    const response = await request.get("/en/extensions/this-slug-does-not-exist-xyz")
    expect(response.status()).toBe(404)
  })

  test("Setup tab shows the agentcenter install command", async ({ page }) => {
    await page.goto("/en/extensions")
    const firstCardLink = page.locator("a[href*='/en/extensions/']").first()
    await firstCardLink.click()
    await page.waitForURL(/\/en\/extensions\/[^/]+$/)

    await page.getByRole("tab", { name: "Setup" }).click()
    await expect(page.locator("text=/agentcenter install/")).toBeVisible()
  })
})
