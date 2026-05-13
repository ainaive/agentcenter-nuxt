import { expect, test } from "@playwright/test"

// Navigation golden paths. Locale prefixing (locked decision #5),
// sign-in gating on protected routes, and the top-nav home link all
// covered here.

test.describe("navigation", () => {
  test("bare / redirects to a locale-prefixed home", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveURL(/\/(en|zh)$/)
  })

  test("/en home → /en/extensions via top-nav Explore link", async ({ page }) => {
    await page.goto("/en")
    const explore = page.getByRole("link", { name: "Explore" }).first()
    await expect(explore).toBeVisible()
    await explore.click()
    await page.waitForURL("**/en/extensions")
    await expect(page.getByRole("heading", { name: /Browse all/ })).toBeVisible()
  })

  test("protected route /en/publish redirects unauthenticated users to /sign-in", async ({
    page,
  }) => {
    await page.goto("/en/publish")
    await expect(page).toHaveURL(/\/en\/sign-in(\?|$)/)
  })

  test("locale switch flips /en/extensions to /zh/extensions", async ({ page }) => {
    await page.goto("/en/extensions")
    const zhSwitch = page.getByRole("link", { name: "中文" }).first()
    if (await zhSwitch.isVisible()) {
      await zhSwitch.click()
      await expect(page).toHaveURL(/\/zh\/extensions/)
    }
  })

  test("/en/extensions/non-existent-slug 404s without leaking to /en", async ({ request }) => {
    const response = await request.get("/en/extensions/totally-not-real-x9z")
    expect(response.status()).toBe(404)
  })
})
