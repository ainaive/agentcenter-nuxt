import { expect, test } from "@playwright/test"

// Approval-workflow golden paths covered at the SSR/URL-guard layer.
// The multi-actor flow lives in its own describe block at the bottom,
// gated on RUN_FULL_E2E so the per-PR signal stays fast — it walks
// publisher → reviewer → badge-appears against a freshly-seeded dev DB.

test.describe("approval workflow", () => {
  test("filter rail renders the OfficialTierPicker trigger on /en/extensions", async ({
    request,
  }) => {
    const response = await request.get("/en/extensions")
    expect(response.status()).toBe(200)
    const html = await response.text()
    // Trigger label encodes the entire (tier, productLine) filter state in
    // one place. At the default tier=all it reads "Official: All tiers".
    expect(html).toContain("Official: All tiers")
  })

  test("/zh filter rail uses zh wording for the OfficialTierPicker trigger", async ({
    request,
  }) => {
    const response = await request.get("/zh/extensions")
    const html = await response.text()
    expect(html).toContain("官方: 全部级别")
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

  test("?tier=productLine round-trips the picker trigger label", async ({
    page,
  }) => {
    await page.goto("/en/extensions?tier=productLine")
    await expect(page).toHaveURL(/[?&]tier=productLine/)
    // With no productLineId set yet, the trigger collapses to the tier label.
    await expect(
      page.getByRole("button", { name: "Official: Product-Line" }),
    ).toBeVisible()
  })

  test("?tier=productLine&productLineId=wireless surfaces the line label on the trigger", async ({
    page,
  }) => {
    await page.goto("/en/extensions?tier=productLine&productLineId=wireless")
    await expect(page).toHaveURL(/[?&]tier=productLine/)
    await expect(page).toHaveURL(/[?&]productLineId=wireless/)
    // Trigger reads "Official: Wireless" once productLines load (the
    // line list lazy-fetches; resolved-label rendering follows hydration).
    await expect(
      page.getByRole("button", { name: "Official: Wireless" }),
    ).toBeVisible()
  })
})

// ───── Multi-actor golden path ──────────────────────────────────────────
//
// Walks the full flow: publisher submits a request, reviewer approves,
// publisher sees the tier badge on the detail page.
//
// Gated on RUN_FULL_E2E so it stays out of the per-PR signal. Run with:
//
//   bun run db:seed && RUN_FULL_E2E=1 bun run test:e2e tests/e2e/approval.spec.ts
//
// The seed plants Better-Auth credential rows for every CREATOR using
// SEED_PASSWORD (default `agentcenter-dev-password`), so the sign-in
// steps below Just Work after a fresh `bun run db:seed`.
test.describe("approval workflow — multi-actor golden path", () => {
  test.beforeAll(() => {
    test.skip(!process.env.RUN_FULL_E2E, "Gated on RUN_FULL_E2E")
  })

  const PUBLISHER = "ben@agentcenter.dev"
  const REVIEWER = "eli@agentcenter.dev"
  const PASSWORD = process.env.SEED_PASSWORD ?? "agentcenter-dev-password"
  // Pick an unofficial extension owned by ben that lands on a cell where
  // eli is the assigned reviewer. From the seed: ben owns /translate
  // (ext-8, subCat=docs); productLine × docs → eli per
  // shared/data/approval-reviewers.ts. Calendar-agent already has a
  // pending row, so don't reuse it.
  const PUBLISHER_EXT_SLUG = "translate"

  test("publisher submits, reviewer approves, badge appears", async ({
    browser,
  }) => {
    // Publisher context: sign in, navigate to /publish, open the dialog,
    // submit. Verify the row gains an "Awaiting review" pill.
    const publisherCtx = await browser.newContext()
    const publisherPage = await publisherCtx.newPage()
    await publisherPage.goto("/en/sign-in")
    await publisherPage.getByLabel("Email").fill(PUBLISHER)
    await publisherPage.getByLabel("Password").fill(PASSWORD)
    await publisherPage.getByRole("button", { name: "Sign in" }).click()
    await publisherPage.waitForURL(/\/en(\?|$)/)

    await publisherPage.goto("/en/publish")
    // Apply for official on the translate row.
    const row = publisherPage.getByRole("listitem").filter({
      hasText: PUBLISHER_EXT_SLUG,
    })
    await row.getByRole("button", { name: "Apply for official" }).click()
    // Default tier is productLine; subCat defaults to "docs" from the row.
    // Pick a product line so the iff-rule is satisfied; without this,
    // canSubmit stays false and the dialog never closes.
    await publisherPage
      .locator("#approvals-productLine")
      .selectOption("wireless")
    await publisherPage
      .getByRole("button", { name: "Submit request" })
      .click()
    await expect(row).toContainText("Awaiting")

    // Reviewer context: sign in, navigate to /admin/approvals, approve.
    const reviewerCtx = await browser.newContext()
    const reviewerPage = await reviewerCtx.newPage()
    await reviewerPage.goto("/en/sign-in")
    await reviewerPage.getByLabel("Email").fill(REVIEWER)
    await reviewerPage.getByLabel("Password").fill(PASSWORD)
    await reviewerPage.getByRole("button", { name: "Sign in" }).click()
    await reviewerPage.goto("/en/admin/approvals")
    const queueRow = reviewerPage
      .getByRole("listitem")
      .filter({ hasText: PUBLISHER_EXT_SLUG })
    await queueRow.getByRole("button", { name: "Approve" }).click()
    // Queue empties once approved.
    await expect(queueRow).toHaveCount(0)

    // Detail page: anyone can see it; verify the tier badge rendered with
    // the product-line-specific label ("Wireless Official").
    const detailPage = await browser.newContext().then((c) => c.newPage())
    await detailPage.goto(`/en/extensions/${PUBLISHER_EXT_SLUG}`)
    const badge = detailPage.locator(".badge-product-line")
    await expect(badge).toBeVisible()
    await expect(badge).toContainText("Wireless")

    await publisherCtx.close()
    await reviewerCtx.close()
  })
})
