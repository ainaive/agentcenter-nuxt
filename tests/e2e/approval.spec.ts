import { expect, test } from "@playwright/test"

// Approval-workflow golden paths covered at the SSR/URL-guard layer.
// Multi-actor end-to-end (submit as publisher → approve as reviewer →
// observe badge swap) requires the seed to land before the run and a
// stable session cookie, so it stays as a follow-up; these specs anchor
// the rest of the wiring.

test.describe("approval workflow", () => {
  test("filter rail renders the official-tier pill on /en/extensions", async ({
    request,
  }) => {
    const response = await request.get("/en/extensions")
    expect(response.status()).toBe(200)
    const html = await response.text()
    // OfficialTierPill labels — proves the filter component is in the SSR
    // tree alongside the existing scope pills (single-row decision #3).
    expect(html).toContain("Official tier")
    expect(html).toContain("Product-Line")
    expect(html).toContain("Company")
  })

  test("/zh filter rail uses zh wording for the tier pill", async ({
    request,
  }) => {
    const response = await request.get("/zh/extensions")
    const html = await response.text()
    expect(html).toContain("官方级别")
    expect(html).toContain("产品线")
  })

  test("/en/admin/approvals redirects unauthenticated users away from the queue", async ({
    page,
  }) => {
    await page.goto("/en/admin/approvals")
    // Either /sign-in (the require-auth path) or / (the require-reviewer
    // fallback). Both are acceptable redirects — the queue page must NOT
    // render its heading for an anonymous request.
    await expect(page).not.toHaveURL(/\/en\/admin\/approvals$/)
  })

  test("/en/admin/reviewers redirects unauthenticated users away from the matrix", async ({
    page,
  }) => {
    await page.goto("/en/admin/reviewers")
    await expect(page).not.toHaveURL(/\/en\/admin\/reviewers$/)
  })

  test("?tier=productLine survives the SSR round-trip", async ({ page }) => {
    await page.goto("/en/extensions?tier=productLine")
    await expect(page).toHaveURL(/[?&]tier=productLine/)
    // The pill renders with aria-pressed on the active value.
    const active = page.getByRole("button", { name: "Product-Line", exact: true })
    await expect(active).toHaveAttribute("aria-pressed", "true")
  })
})
