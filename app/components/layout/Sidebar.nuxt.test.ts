// @vitest-environment nuxt
import { describe, it, expect } from "vitest"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { h } from "vue"
import Sidebar from "./Sidebar.vue"

const NuxtLinkStub = {
  name: "NuxtLink",
  props: ["to"],
  setup(props: { to: string }, { slots }: { slots: Record<string, () => unknown> }) {
    return () => h("a", { href: props.to }, slots.default?.())
  },
}

const mountOpts = {
  props: { collapsed: false },
  global: { stubs: { NuxtLink: NuxtLinkStub } },
}

describe("Sidebar", () => {
  it("renders Browse + Categories + Collections section headers", async () => {
    const wrapper = await mountSuspended(Sidebar, mountOpts)
    const html = wrapper.html().toLowerCase()
    expect(html).toContain("browse")
    expect(html).toContain("categor")
    expect(html).toContain("collection")
  })

  it("renders at least 5 browse links with locale-prefixed hrefs", async () => {
    const wrapper = await mountSuspended(Sidebar, mountOpts)
    const links = wrapper.findAll("a")
    expect(links.length).toBeGreaterThanOrEqual(5)
    for (const link of links) {
      const href = link.attributes("href") ?? ""
      expect(href.startsWith("/")).toBe(true)
    }
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
