// @vitest-environment nuxt
import { describe, expect, it } from "vitest"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { defineComponent } from "vue"
import ToolTile from "./ToolTile.vue"
import type { ToolDto } from "~~/shared/mcp-panorama"

const NuxtLinkStub = defineComponent({
  name: "NuxtLink",
  props: { to: { type: String, required: true } },
  template: "<a :href=\"to\"><slot /></a>",
})

function makeTool(overrides: Partial<ToolDto>): ToolDto {
  return {
    id: 1,
    slug: "ide",
    name: "IDE",
    nameZh: null,
    status: "released",
    depsCount: 0,
    blurb: "Internal IDE",
    blurbZh: "内部 IDE",
    tags: [],
    extensionSlug: "ide",
    ownerPrimary: "airnd",
    ownerSecondary: "devsvcs",
    ...overrides,
  }
}

describe("ToolTile", () => {
  it("released tool renders as <a> linking to the marketplace listing", async () => {
    const tool = makeTool({ status: "released", extensionSlug: "ide" })
    const wrapper = await mountSuspended(ToolTile, {
      props: { tool },
      global: { stubs: { NuxtLink: NuxtLinkStub } },
    })
    const link = wrapper.find("a")
    expect(link.exists()).toBe(true)
    expect(link.attributes("href")).toContain("/extensions/ide")
    expect(link.attributes("aria-disabled")).toBeFalsy()
  })

  it("dev tool renders as a static span with aria-disabled", async () => {
    const tool = makeTool({ id: 2, name: "DT", status: "dev", extensionSlug: null })
    const wrapper = await mountSuspended(ToolTile, {
      props: { tool },
      global: { stubs: { NuxtLink: NuxtLinkStub } },
    })
    expect(wrapper.find("a").exists()).toBe(false)
    const span = wrapper.find("span[aria-disabled=\"true\"]")
    expect(span.exists()).toBe(true)
    expect(span.text()).toContain("DT")
  })

  it("none tool renders as a static span with aria-disabled", async () => {
    const tool = makeTool({ id: 3, name: "RefactorBot", status: "none", extensionSlug: null })
    const wrapper = await mountSuspended(ToolTile, {
      props: { tool },
      global: { stubs: { NuxtLink: NuxtLinkStub } },
    })
    expect(wrapper.find("a").exists()).toBe(false)
    expect(wrapper.find("span[aria-disabled=\"true\"]").exists()).toBe(true)
  })

  it("shows the deps count badge only when depsCount >= 10", async () => {
    const low = makeTool({ depsCount: 7 })
    const high = makeTool({ id: 2, depsCount: 26, name: "CodeCheck", slug: "codecheck", extensionSlug: "codecheck" })
    const lowWrap = await mountSuspended(ToolTile, {
      props: { tool: low },
      global: { stubs: { NuxtLink: NuxtLinkStub } },
    })
    const highWrap = await mountSuspended(ToolTile, {
      props: { tool: high },
      global: { stubs: { NuxtLink: NuxtLinkStub } },
    })
    expect(lowWrap.text()).not.toContain("7")
    expect(highWrap.text()).toContain("26")
  })

  it("does not navigate when extensionSlug is null even if status is released", async () => {
    const orphan = makeTool({ status: "released", extensionSlug: null })
    const wrapper = await mountSuspended(ToolTile, {
      props: { tool: orphan },
      global: { stubs: { NuxtLink: NuxtLinkStub } },
    })
    expect(wrapper.find("a").exists()).toBe(false)
    expect(wrapper.find("span[aria-disabled=\"true\"]").exists()).toBe(true)
  })
})
