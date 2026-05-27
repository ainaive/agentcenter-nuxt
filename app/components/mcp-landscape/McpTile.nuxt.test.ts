// @vitest-environment nuxt
import { describe, expect, it } from "vitest"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { defineComponent } from "vue"
import McpTile from "./McpTile.vue"
import type { McpDto, ToolDto } from "~~/shared/mcp-panorama"

const NuxtLinkStub = defineComponent({
  name: "NuxtLink",
  props: { to: { type: String, required: true } },
  template: "<a :href=\"to\"><slot /></a>",
})

function makeTool(overrides: Partial<ToolDto> = {}): ToolDto {
  return {
    id: 1, slug: "ide", name: "IDE", nameZh: null,
    blurb: "Internal IDE", blurbZh: "内部 IDE",
    ownerPrimary: "ai-rd", ownerSecondary: "dev-services",
    mcps: [], rollupStatus: "released",
    ...overrides,
  }
}

function makeMcp(overrides: Partial<McpDto> = {}): McpDto {
  return {
    id: 10, slug: "ide-mcp", name: "ide-mcp", nameZh: null,
    status: "released", depsCount: 0,
    blurb: "Internal IDE", blurbZh: "内部 IDE",
    tags: [], extensionSlug: "ide-mcp", isPlaceholder: false,
    ...overrides,
  }
}

describe("McpTile", () => {
  it("released MCP renders as <a> linking to the marketplace listing", async () => {
    const tool = makeTool()
    const mcp = makeMcp({ extensionSlug: "ide-mcp" })
    const wrapper = await mountSuspended(McpTile, {
      props: { tool, mcp },
      global: { stubs: { NuxtLink: NuxtLinkStub } },
    })
    const link = wrapper.find("a")
    expect(link.exists()).toBe(true)
    expect(link.attributes("href")).toContain("/extensions/ide-mcp")
  })

  it("dev MCP renders as a static button (not a link)", async () => {
    const tool = makeTool({ name: "DT" })
    const mcp = makeMcp({ id: 11, slug: "dt-mcp", name: "dt-mcp", status: "dev", extensionSlug: null })
    const wrapper = await mountSuspended(McpTile, {
      props: { tool, mcp },
      global: { stubs: { NuxtLink: NuxtLinkStub } },
    })
    expect(wrapper.find("a").exists()).toBe(false)
    expect(wrapper.find("button").text()).toContain("dt-mcp")
  })

  it("placeholder MCP renders a quiet em-dash pill that is still clickable", async () => {
    // Tool name lives in the card header above; the pill just signals
    // "no MCP yet" with an em-dash to avoid duplicating the tool name.
    // The button stays interactive — clicking opens the detail panel
    // with the "no MCP planned" status description.
    const tool = makeTool({ name: "RefactorBot" })
    const mcp = makeMcp({
      id: -tool.id, slug: tool.slug, name: tool.name,
      status: "none", extensionSlug: null, isPlaceholder: true,
    })
    const wrapper = await mountSuspended(McpTile, {
      props: { tool, mcp },
      global: { stubs: { NuxtLink: NuxtLinkStub } },
    })
    const btn = wrapper.find("button")
    expect(btn.exists()).toBe(true)
    expect(btn.attributes("aria-disabled")).toBeFalsy()
    expect(btn.text()).toContain("—")
    expect(btn.text()).not.toContain("RefactorBot")
  })

  it("shows deps badge only when depsCount >= 10", async () => {
    const tool = makeTool({ name: "CodeCheck", slug: "codecheck" })
    const low = makeMcp({ depsCount: 7 })
    const high = makeMcp({ id: 12, depsCount: 26, slug: "codecheck-mcp", name: "codecheck-mcp" })
    const lowWrap = await mountSuspended(McpTile, {
      props: { tool, mcp: low },
      global: { stubs: { NuxtLink: NuxtLinkStub } },
    })
    const highWrap = await mountSuspended(McpTile, {
      props: { tool, mcp: high },
      global: { stubs: { NuxtLink: NuxtLinkStub } },
    })
    expect(lowWrap.text()).not.toContain("7")
    expect(highWrap.text()).toContain("26")
  })

  it("does not navigate when extensionSlug is null even if status is released", async () => {
    const tool = makeTool()
    const orphan = makeMcp({ status: "released", extensionSlug: null })
    const wrapper = await mountSuspended(McpTile, {
      props: { tool, mcp: orphan },
      global: { stubs: { NuxtLink: NuxtLinkStub } },
    })
    expect(wrapper.find("a").exists()).toBe(false)
    expect(wrapper.find("button").exists()).toBe(true)
  })
})
