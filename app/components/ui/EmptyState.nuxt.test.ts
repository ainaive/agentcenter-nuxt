// @vitest-environment nuxt
import { describe, it, expect } from "vitest"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { h } from "vue"
import EmptyState from "./EmptyState.vue"

describe("EmptyState", () => {
  it("renders the dashed surface shell", async () => {
    const wrapper = await mountSuspended(EmptyState, { props: { title: "Nothing" } })
    const root = wrapper.element as HTMLElement
    expect(root.className).toContain("border-dashed")
    expect(root.className).toContain("text-center")
    expect(root.className).toContain("rounded-(--radius-card)")
  })

  it("renders title and description when provided", async () => {
    const wrapper = await mountSuspended(EmptyState, {
      props: { title: "No drafts", description: "Publish one to get going" },
    })
    expect(wrapper.find("h3").text()).toBe("No drafts")
    expect(wrapper.find("p").text()).toBe("Publish one to get going")
  })

  it("supports a description-only (title-less) empty", async () => {
    const wrapper = await mountSuspended(EmptyState, {
      props: { description: "No pending requests" },
    })
    expect(wrapper.find("h3").exists()).toBe(false)
    const p = wrapper.find("p")
    expect(p.text()).toBe("No pending requests")
    // no leading margin when it is the only content
    expect(p.classes()).not.toContain("mt-1")
  })

  it("renders the cta slot only when supplied", async () => {
    const without = await mountSuspended(EmptyState, { props: { title: "x" } })
    expect(without.find("a").exists()).toBe(false)

    const withCta = await mountSuspended(EmptyState, {
      props: { title: "x" },
      slots: { cta: () => h("a", { href: "/go" }, "Go") },
    })
    expect(withCta.find("a").attributes("href")).toBe("/go")
  })
})
