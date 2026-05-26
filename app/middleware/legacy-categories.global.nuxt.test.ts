// @vitest-environment nuxt
import { beforeEach, describe, expect, it } from "vitest"

beforeEach(async () => {
  // Reset the router to a non-legacy URL before each case so previous
  // navigations don't leak state.
  const router = useRouter()
  await router.replace("/en")
})

describe("legacy-categories middleware — category redirects", () => {
  it("redirects /extensions?category=skills to /skills", async () => {
    const router = useRouter()
    await router.replace("/en/extensions?category=skills")
    const route = useRoute()
    expect(route.path).toBe("/en/skills")
    expect(route.query.category).toBeUndefined()
  })

  it("redirects /extensions?category=mcp to /mcp", async () => {
    const router = useRouter()
    await router.replace("/en/extensions?category=mcp")
    const route = useRoute()
    expect(route.path).toBe("/en/mcp")
    expect(route.query.category).toBeUndefined()
  })

  it("redirects /extensions?category=slash to /commands (URL diverges from enum)", async () => {
    const router = useRouter()
    await router.replace("/en/extensions?category=slash")
    const route = useRoute()
    expect(route.path).toBe("/en/commands")
    expect(route.query.category).toBeUndefined()
  })

  it("redirects /extensions?category=plugins to /plugins", async () => {
    const router = useRouter()
    await router.replace("/en/extensions?category=plugins")
    const route = useRoute()
    expect(route.path).toBe("/en/plugins")
    expect(route.query.category).toBeUndefined()
  })

  it("preserves other filters when redirecting", async () => {
    const router = useRouter()
    await router.replace("/en/extensions?category=skills&sort=stars&scope=org")
    const route = useRoute()
    expect(route.path).toBe("/en/skills")
    expect(route.query.sort).toBe("stars")
    expect(route.query.scope).toBe("org")
  })

  it("does not redirect /extensions with an unknown category", async () => {
    const router = useRouter()
    await router.replace("/en/extensions?category=unknown")
    const route = useRoute()
    expect(route.path).toBe("/en/extensions")
    expect(route.query.category).toBe("unknown")
  })

  it("does not redirect /extensions without a category param", async () => {
    const router = useRouter()
    await router.replace("/en/extensions?sort=stars")
    const route = useRoute()
    expect(route.path).toBe("/en/extensions")
    expect(route.query.sort).toBe("stars")
  })
})

describe("legacy-categories middleware — panorama redirect", () => {
  it("redirects /mcp-panorama to /mcp/panorama", async () => {
    const router = useRouter()
    await router.replace("/en/mcp-panorama")
    const route = useRoute()
    expect(route.path).toBe("/en/mcp/panorama")
  })

  it("preserves panorama state in the query", async () => {
    const router = useRouter()
    await router.replace("/en/mcp-panorama?layer=industry&primary=wireless&status=released")
    const route = useRoute()
    expect(route.path).toBe("/en/mcp/panorama")
    expect(route.query.layer).toBe("industry")
    expect(route.query.primary).toBe("wireless")
    expect(route.query.status).toBe("released")
  })
})
