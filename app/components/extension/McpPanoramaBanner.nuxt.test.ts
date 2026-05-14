// @vitest-environment nuxt
import { describe, expect, it } from "vitest"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { defineComponent } from "vue"
import McpPanoramaBanner from "./McpPanoramaBanner.vue"

const NuxtLinkStub = defineComponent({
  name: "NuxtLink",
  props: { to: { type: String, required: true } },
  template: "<a :href=\"to\"><slot /></a>",
})

const mountOpts = { global: { stubs: { NuxtLink: NuxtLinkStub } } }

describe("McpPanoramaBanner", () => {
  it("renders an <a> linking to the locale-prefixed panorama route", async () => {
    const wrapper = await mountSuspended(McpPanoramaBanner, mountOpts)
    const link = wrapper.find("a")
    expect(link.exists()).toBe(true)
    expect(link.attributes("href")).toContain("/mcp-panorama")
  })

  it("renders the title, subtitle, and CTA strings", async () => {
    const wrapper = await mountSuspended(McpPanoramaBanner, mountOpts)
    const text = wrapper.text()
    // i18n keys are loaded from i18n/locales/en.json — assert the EN strings appear.
    expect(text).toContain("MCP Panorama")
    expect(text.toLowerCase()).toContain("mcp")
    expect(text).toContain("Panorama")
  })

  it("renders the LayoutGrid icon and chevron", async () => {
    const wrapper = await mountSuspended(McpPanoramaBanner, mountOpts)
    expect(wrapper.find("svg.lucide-layout-grid").exists()).toBe(true)
    expect(wrapper.find("svg.lucide-chevron-right").exists()).toBe(true)
  })
})
