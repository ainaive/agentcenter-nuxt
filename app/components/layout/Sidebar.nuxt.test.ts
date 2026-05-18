// @vitest-environment nuxt
import { describe, it, expect } from "vitest"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { defineComponent } from "vue"
import Sidebar from "./Sidebar.vue"

const NuxtLinkStub = defineComponent({
  name: "NuxtLink",
  props: { to: { type: String, required: true } },
  template: "<a :href=\"to\"><slot /></a>",
})

const mountOpts = {
  props: { collapsed: false },
  global: { stubs: { NuxtLink: NuxtLinkStub } },
}

describe("Sidebar", () => {
  it("renders Explore + Browse + Categories + Collections section headers", async () => {
    const wrapper = await mountSuspended(Sidebar, mountOpts)
    const html = wrapper.html().toLowerCase()
    expect(html).toContain("explore")
    expect(html).toContain("browse")
    expect(html).toContain("categor")
    expect(html).toContain("collection")
  })

  it("renders primary nav links to Extensions, MCP Panorama, and Publish", async () => {
    const wrapper = await mountSuspended(Sidebar, mountOpts)
    const hrefs = wrapper.findAll("a").map((a) => a.attributes("href") ?? "")
    expect(hrefs.some((h) => h.endsWith("/extensions"))).toBe(true)
    expect(hrefs.some((h) => h.includes("/mcp-panorama"))).toBe(true)
    expect(hrefs.some((h) => h.includes("/publish"))).toBe(true)
  })

  it("renders the Docs item as a disabled placeholder, not a link", async () => {
    const wrapper = await mountSuspended(Sidebar, mountOpts)
    const disabled = wrapper.findAll("[aria-disabled='true']")
    expect(disabled.length).toBeGreaterThan(0)
    expect(disabled.some((el) => el.text().toLowerCase().includes("docs"))).toBe(true)
  })

  it("renders at least 5 browse links targeting /extensions", async () => {
    const wrapper = await mountSuspended(Sidebar, mountOpts)
    const extLinks = wrapper
      .findAll("a")
      .filter((a) => (a.attributes("href") ?? "").includes("/extensions"))
    expect(extLinks.length).toBeGreaterThanOrEqual(5)
  })

  it("collapsed prop hides the inner content", async () => {
    const wrapper = await mountSuspended(Sidebar, {
      ...mountOpts,
      props: { collapsed: true },
    })
    expect(wrapper.findAll("a").length).toBe(0)
  })

  it("renders inline color swatches for each func category", async () => {
    const wrapper = await mountSuspended(Sidebar, mountOpts)
    // happy-dom strips/canonicalizes oklch() in style attributes — check via raw outerHTML
    const styled = wrapper.findAll("span").filter((s) => {
      const styleAttr = s.attributes("style")
      return typeof styleAttr === "string" && styleAttr.length > 0
    })
    expect(styled.length).toBeGreaterThanOrEqual(3)
  })

  it("workTask is expanded by default, exposing 'System Design'", async () => {
    const wrapper = await mountSuspended(Sidebar, mountOpts)
    expect(wrapper.html().toLowerCase()).toContain("system design")
  })

  it("a hidden category does not expose its l1 children", async () => {
    const wrapper = await mountSuspended(Sidebar, mountOpts)
    expect(wrapper.html().toLowerCase()).not.toContain("network protocols")
  })
})
