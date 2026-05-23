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
  global: { stubs: { NuxtLink: NuxtLinkStub } },
}

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
