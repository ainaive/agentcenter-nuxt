// @vitest-environment nuxt
import { describe, expect, it } from "vitest"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { defineComponent } from "vue"
import ExtFeatureHero from "./ExtFeatureHero.vue"
import type { ExtensionListItem } from "~~/shared/db/queries-types"

const NuxtLinkStub = defineComponent({
  name: "NuxtLink",
  props: { to: { type: String, required: true } },
  template: "<a :href=\"to\"><slot /></a>",
})

const mountOpts = { global: { stubs: { NuxtLink: NuxtLinkStub } } }

function fixture(overrides: Partial<ExtensionListItem> = {}): ExtensionListItem {
  return {
    id: "ext-1",
    slug: "web-search",
    category: "skills",
    badge: null,
    scope: "personal",
    funcCat: null,
    subCat: null,
    l2: null,
    deptId: null,
    iconEmoji: "🔍",
    iconColor: "#5b8def",
    name: "Web Search",
    nameZh: null,
    tagline: "Find anything, fast.",
    taglineZh: null,
    description: "Search the web straight from your agent — no copy-paste detour.",
    descriptionZh: null,
    downloadsCount: 1248,
    starsAvg: "4.7",
    tagIds: [],
    ...overrides,
  }
}

describe("ExtFeatureHero", () => {
  it("renders the eyebrow, name, tagline, and description", async () => {
    const wrapper = await mountSuspended(ExtFeatureHero, {
      ...mountOpts,
      props: { extension: fixture() },
    })
    const text = wrapper.text()
    expect(text).toContain("Featured this week")
    expect(text).toContain("Web Search")
    expect(text).toContain("Find anything, fast.")
    expect(text).toContain("Search the web straight from your agent")
  })

  it("renders the install command line with the extension slug", async () => {
    const wrapper = await mountSuspended(ExtFeatureHero, {
      ...mountOpts,
      props: { extension: fixture({ slug: "kubernetes-helper" }) },
    })
    expect(wrapper.text()).toContain("agentcenter install kubernetes-helper")
  })

  it("links to the locale-prefixed detail page", async () => {
    const wrapper = await mountSuspended(ExtFeatureHero, {
      ...mountOpts,
      props: { extension: fixture({ slug: "web-search" }) },
    })
    const links = wrapper.findAll("a").map((a) => a.attributes("href"))
    expect(links.some((href) => href?.includes("/extensions/web-search"))).toBe(true)
  })

  it("omits the tagline paragraph when tagline is null", async () => {
    const wrapper = await mountSuspended(ExtFeatureHero, {
      ...mountOpts,
      props: { extension: fixture({ tagline: null }) },
    })
    // The tagline element uses font-serif italic — check it's not rendered.
    expect(wrapper.find("p.italic").exists()).toBe(false)
  })

  it("omits the description paragraph when description is null", async () => {
    const wrapper = await mountSuspended(ExtFeatureHero, {
      ...mountOpts,
      props: { extension: fixture({ description: null, tagline: null }) },
    })
    const text = wrapper.text()
    expect(text).toContain("Web Search")
    expect(text).not.toContain("Search the web straight from your agent")
  })
})
