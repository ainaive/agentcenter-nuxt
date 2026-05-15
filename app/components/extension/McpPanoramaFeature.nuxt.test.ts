// @vitest-environment nuxt
import { describe, expect, it } from "vitest"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { defineComponent } from "vue"
import McpPanoramaFeature from "./McpPanoramaFeature.vue"

const NuxtLinkStub = defineComponent({
  name: "NuxtLink",
  props: { to: { type: String, required: true } },
  template: "<a :href=\"to\"><slot /></a>",
})

const mountOpts = { global: { stubs: { NuxtLink: NuxtLinkStub } } }

registerEndpoint("/api/internal/mcp-landscape", () => ({
  layer: "public",
  layerStats: {
    total: 42,
    counts: { released: 10, dev: 12, none: 20 },
    releasedPct: 24,
    activePct: 52,
    lagPct: 48,
  },
  groups: [
    { kind: "domain", key: "a", label: "A", labelZh: "甲", short: "A", items: [], pdts: [], stats: { total: 0, counts: { released: 0, dev: 0, none: 0 }, releasedPct: 0, activePct: 0, lagPct: 0 } },
    { kind: "domain", key: "b", label: "B", labelZh: "乙", short: "B", items: [], pdts: [], stats: { total: 0, counts: { released: 0, dev: 0, none: 0 }, releasedPct: 0, activePct: 0, lagPct: 0 } },
    { kind: "domain", key: "c", label: "C", labelZh: "丙", short: "C", items: [], pdts: [], stats: { total: 0, counts: { released: 0, dev: 0, none: 0 }, releasedPct: 0, activePct: 0, lagPct: 0 } },
  ],
}))

describe("McpPanoramaFeature", () => {
  it("links to the locale-prefixed panorama route", async () => {
    const wrapper = await mountSuspended(McpPanoramaFeature, mountOpts)
    const link = wrapper.find("a")
    expect(link.exists()).toBe(true)
    expect(link.attributes("href")).toContain("/mcp-panorama")
  })

  it("renders eyebrow, title, description, and CTA", async () => {
    const wrapper = await mountSuspended(McpPanoramaFeature, mountOpts)
    const text = wrapper.text()
    expect(text).toContain("MCP PANORAMA")
    expect(text).toContain("MCP adoption landscape")
    expect(text).toContain("Open the panorama")
  })

  it("renders derived stats from the landscape payload", async () => {
    const wrapper = await mountSuspended(McpPanoramaFeature, mountOpts)
    const text = wrapper.text()
    expect(text).toContain("3 domains")
    expect(text).toContain("42 tools")
  })
})
