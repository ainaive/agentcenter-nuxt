// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useFilters } from "./useFilters"

beforeEach(async () => {
  // Reset the test router to a known base URL before each case so query
  // parsing tests don't bleed into each other.
  const router = useRouter()
  await router.replace("/en/extensions")
})

describe("useFilters — parse", () => {
  it("returns the empty-filter default for an empty query", async () => {
    const router = useRouter()
    await router.replace("/en/extensions")
    const { filters } = useFilters()
    expect(filters.value).toEqual({})
  })

  it("parses single-value query params (category, sort)", async () => {
    const router = useRouter()
    await router.replace("/en/extensions?category=skills&sort=recent")
    const { filters } = useFilters()
    expect(filters.value.category).toBe("skills")
    expect(filters.value.sort).toBe("recent")
  })

  it("parses array-valued tags from repeated query keys", async () => {
    const router = useRouter()
    await router.replace("/en/extensions?tags=search&tags=api")
    const { filters } = useFilters()
    expect(filters.value.tags).toEqual(["search", "api"])
  })

  it("coerces page from a string query param to a number", async () => {
    const router = useRouter()
    await router.replace("/en/extensions?page=3")
    const { filters } = useFilters()
    expect(filters.value.page).toBe(3)
  })
})

describe("useFilters — update", () => {
  it("calls router.replace with the new query string including q", async () => {
    const router = useRouter()
    const spy = vi.spyOn(router, "replace")
    const { update } = useFilters()
    update({ q: "kubernetes" })
    expect(spy).toHaveBeenCalledWith(
      expect.stringMatching(/^\/en\/extensions\?.*q=kubernetes/),
    )
    spy.mockRestore()
  })

  it("resets page when the update doesn't include `page`", async () => {
    const router = useRouter()
    await router.replace("/en/extensions?page=5")
    const spy = vi.spyOn(router, "replace")
    const { update } = useFilters()
    update({ q: "foo" })
    const target = spy.mock.calls[0]?.[0] as string
    expect(target).not.toMatch(/page=/)
    spy.mockRestore()
  })

  it("preserves the explicit page when `page` is in the update", async () => {
    const router = useRouter()
    const spy = vi.spyOn(router, "replace")
    const { update } = useFilters()
    update({ q: "foo", page: 3 })
    const target = spy.mock.calls[0]?.[0] as string
    expect(target).toMatch(/page=3/)
    spy.mockRestore()
  })

  it("emits just the path with no trailing `?` when the query becomes empty", async () => {
    const router = useRouter()
    await router.replace("/en/extensions?q=foo")
    const spy = vi.spyOn(router, "replace")
    const { update } = useFilters()
    update({ q: undefined })
    expect(spy).toHaveBeenCalledWith("/en/extensions")
    spy.mockRestore()
  })
})

describe("useFilters — hrefForFilters", () => {
  it("prefixes the locale path and applies the partial filter", () => {
    const { hrefForFilters } = useFilters()
    const href = hrefForFilters({ category: "skills" })
    // useLocalePath default basePath is "/extensions"; the locale prefix
    // depends on the running locale (en in tests).
    expect(href).toMatch(/category=skills/)
    expect(href.startsWith("/en/extensions")).toBe(true)
  })

  it("resets page when the partial doesn't include `page`", async () => {
    const router = useRouter()
    await router.replace("/en/extensions?page=9")
    const { hrefForFilters } = useFilters()
    const href = hrefForFilters({ category: "mcp" })
    expect(href).not.toMatch(/page=/)
  })

  it("accepts a custom basePath argument", () => {
    const { hrefForFilters } = useFilters()
    const href = hrefForFilters({ category: "skills" }, "/collections")
    expect(href).toContain("/collections")
    expect(href).toMatch(/category=skills/)
  })
})
