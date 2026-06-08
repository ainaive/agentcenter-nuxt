import { expect, test } from "@playwright/test"

// Regression guard for the SSR/hydration race that bounced signed-in
// users to /sign-in on hard-refresh — see docs/architecture.md "Auth
// (web)" and PR #50. The client branch of require-auth used to read
// better-auth's reactive `useSession()` synchronously during hydration,
// before its async fetch had resolved; the empty atom looked like "no
// user" and the middleware redirected. `page.reload()` here forces a
// full SSR + client-hydration pass, which is the exact trigger.
//
// Gated on RUN_FULL_E2E=1 to stay out of the per-PR fast signal — it
// needs a seeded database and the same SEED_PASSWORD used by the seed
// run. Run with:
//
//   SEED_PASSWORD=dev-only bun run db:seed
//   SEED_PASSWORD=dev-only RUN_FULL_E2E=1 bun run test:e2e tests/e2e/auth-refresh.spec.ts

test.describe("auth — signed-in hard-refresh stays on the page", () => {
  test.beforeAll(() => {
    test.skip(process.env.RUN_FULL_E2E !== "1", "Gated on RUN_FULL_E2E=1")
    if (!process.env.SEED_PASSWORD) {
      throw new Error(
        "SEED_PASSWORD must be set to the same value used by the most recent `bun run db:seed`",
      )
    }
  })

  const PUBLISHER = "ben@agentcenter.dev"
  const PASSWORD = process.env.SEED_PASSWORD!

  test("hard-refresh on /en/publish keeps the publisher signed in", async ({
    browser,
  }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()

    await page.goto("/en/sign-in")
    await page.getByLabel("Email").fill(PUBLISHER)
    await page.getByLabel("Password").fill(PASSWORD)
    await page.getByRole("button", { name: "Sign in" }).click()
    // Sign-in lands on the locale home.
    await page.waitForURL(/\/en(\?|$)/)

    await page.goto("/en/publish")
    await expect(page).toHaveURL(/\/en\/publish(\?|$)/)

    // The exact trigger that exposed the bug: a full reload runs both
    // SSR middleware and client-hydration middleware against the same
    // route. The fix in require-auth.ts's client branch (await
    // auth.getSession() instead of synchronously reading useSession())
    // is what makes this assertion hold.
    await page.reload()
    await expect(page).toHaveURL(/\/en\/publish(\?|$)/)
    await expect(page).not.toHaveURL(/\/en\/sign-in/)

    await ctx.close()
  })
})
