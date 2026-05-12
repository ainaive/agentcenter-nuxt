import { test, expect } from "@playwright/test"

test.describe("theme no-flash SSR", () => {
  test("theme=dark cookie stamps <html class=\"dark\"> in the SSR response", async ({
    request,
  }) => {
    const response = await request.get("/en", {
      headers: { Cookie: "theme=dark" },
    })
    expect(response.status()).toBe(200)
    const html = await response.text()
    expect(html).toMatch(/<html[^>]*class="[^"]*\bdark\b/)
  })

  test("no theme cookie → no dark class on <html>", async ({ request }) => {
    const response = await request.get("/en")
    expect(response.status()).toBe(200)
    const html = await response.text()
    expect(html).not.toMatch(/<html[^>]*class="[^"]*\bdark\b/)
  })

  test("zh locale stamps lang=\"zh\" on <html>", async ({ request }) => {
    const response = await request.get("/zh")
    expect(response.status()).toBe(200)
    const html = await response.text()
    expect(html).toMatch(/<html[^>]*lang="zh"/)
  })

  test("ivory cookie does not stamp dark class", async ({ request }) => {
    const response = await request.get("/en", {
      headers: { Cookie: "theme=ivory" },
    })
    expect(response.status()).toBe(200)
    const html = await response.text()
    expect(html).not.toMatch(/<html[^>]*class="[^"]*\bdark\b/)
  })
})
