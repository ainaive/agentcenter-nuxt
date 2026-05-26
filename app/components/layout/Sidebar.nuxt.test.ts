// @vitest-environment nuxt
import { describe, it, expect, beforeEach } from "vitest"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { defineComponent } from "vue"
import Sidebar from "./Sidebar.vue"

const NuxtLinkStub = defineComponent({
  name: "NuxtLink",
  props: { to: { type: String, required: true } },
  template: "<a :href=\"to\"><slot /></a>",
})

const mountOpts = {
  global: { stubs: { NuxtLink: NuxtLinkStub } },
}

beforeEach(async () => {
  // Reset to a non-MCP route so each describe block starts from a known
  // baseline. Tests that exercise MCP routing navigate explicitly.
  const router = useRouter()
  await router.replace("/en/extensions")
})

describe("Sidebar", () => {
  it("renders a single Categories section header", async () => {
    const wrapper = await mountSuspended(Sidebar, mountOpts)
    const html = wrapper.html().toLowerCase()
    expect(html).toContain("categor")
    // Browse moved to the navbar — only Categories remains as an h2.
    const h2s = wrapper.findAll("h2")
    expect(h2s.length).toBe(1)
  })

  it("no longer renders a Browse section (type pills moved to TopBar)", async () => {
    const wrapper = await mountSuspended(Sidebar, mountOpts)
    const text = wrapper.text().toLowerCase()
    expect(text).not.toContain("browse")
    // No more category=skills/mcp/slash/plugins links in the sidebar.
    const categoryLinks = wrapper
      .findAll("a")
      .filter((a) => /[?&]category=/.test(a.attributes("href") ?? ""))
    expect(categoryLinks.length).toBe(0)
  })

  it("does not render a primary-nav 'Explore' section (that moved to TopBar)", async () => {
    const wrapper = await mountSuspended(Sidebar, mountOpts)
    expect(wrapper.text().toLowerCase()).not.toContain("explore")
  })

  it("does not render the old Collections placeholder section", async () => {
    const wrapper = await mountSuspended(Sidebar, mountOpts)
    const html = wrapper.html().toLowerCase()
    expect(html).not.toContain("my tools")
    expect(html).not.toContain("new group")
  })

  it("renders all three funcCat L0 labels collapsed by default", async () => {
    const wrapper = await mountSuspended(Sidebar, mountOpts)
    const html = wrapper.html().toLowerCase()
    expect(html).toContain("work task")
    expect(html).toContain("business")
    expect(html).toContain("tools")
  })

  it("does not expand any funcCat by default (L1 rows hidden until clicked)", async () => {
    const wrapper = await mountSuspended(Sidebar, mountOpts)
    const html = wrapper.html().toLowerCase()
    expect(html).not.toContain("system design")
    expect(html).not.toContain("network protocols")
  })

})

describe("Sidebar — Browse MCP block", () => {
  it("does not render the Browse MCP block on non-MCP routes", async () => {
    const wrapper = await mountSuspended(Sidebar, { ...mountOpts, route: "/en/skills" })
    const html = wrapper.html().toLowerCase()
    expect(html).not.toContain("browse mcp")
  })

  it("on /mcp shows the Browse MCP block with By function as the active pill", async () => {
    const wrapper = await mountSuspended(Sidebar, { ...mountOpts, route: "/en/mcp" })

    // Heading is present
    const html = wrapper.html().toLowerCase()
    expect(html).toContain("browse mcp")

    // By function is the active (aria-current) pill on /mcp
    const active = wrapper.find('[aria-current="page"]')
    expect(active.exists()).toBe(true)
    expect(active.text().toLowerCase()).toContain("by function")

    // By system is rendered as a link to /mcp/panorama
    const systemLink = wrapper
      .findAll("a")
      .find((a) => a.text().toLowerCase().includes("by system"))
    expect(systemLink).toBeTruthy()
    expect(systemLink!.attributes("href")).toBe("/en/mcp/panorama")

    // FUNC_TAXONOMY (Categories) still renders below the pills
    expect(html).toContain("categor")
    expect(html).toContain("work task")
  })

  it("on /mcp/panorama shows By system as the active pill and swaps the bottom section", async () => {
    const wrapper = await mountSuspended(Sidebar, { ...mountOpts, route: "/en/mcp/panorama" })

    const html = wrapper.html().toLowerCase()
    expect(html).toContain("browse mcp")

    // By system is now the active (aria-current) pill
    const active = wrapper.find('[aria-current="page"]')
    expect(active.exists()).toBe(true)
    expect(active.text().toLowerCase()).toContain("by system")

    // By function is rendered as a link back to /mcp
    const typesLink = wrapper
      .findAll("a")
      .find((a) => a.text().toLowerCase().includes("by function"))
    expect(typesLink).toBeTruthy()
    expect(typesLink!.attributes("href")).toBe("/en/mcp")

    // FUNC_TAXONOMY does NOT render on the panorama route
    expect(html).not.toContain("work task")
    expect(html).not.toContain("business")
  })

  it("on /mcp/panorama no longer exposes a layer-toggle widget", async () => {
    // After the both-layers rendering pass the panorama sidebar dropped its
    // Industry/Public layer toggle. Guard against it returning.
    const wrapper = await mountSuspended(Sidebar, { ...mountOpts, route: "/en/mcp/panorama" })
    const html = wrapper.html().toLowerCase()

    // The previous toggle was a 2-column button grid. Asserting the absence of
    // the per-layer "short" labels used inside those buttons keeps the test
    // resilient to small style changes.
    const industryShort = wrapper
      .findAll("button")
      .filter((b) => b.text().trim().toLowerCase() === "industry")
    const publicShort = wrapper
      .findAll("button")
      .filter((b) => b.text().trim().toLowerCase() === "public")
    expect(industryShort.length).toBe(0)
    expect(publicShort.length).toBe(0)

    // And no `mcppanorama.layer.publicdesc` / .industrydesc subtitle text
    // (those only ever appeared inside the toggle).
    expect(html).not.toContain("mcppanorama.layer.publicdesc")
    expect(html).not.toContain("mcppanorama.layer.industrydesc")
  })
})
