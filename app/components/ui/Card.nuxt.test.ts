// @vitest-environment nuxt
import { describe, it, expect } from "vitest"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { h } from "vue"
import Card from "./Card.vue"

describe("Card", () => {
  it("renders the shared surface classes by default", async () => {
    const wrapper = await mountSuspended(Card)
    const el = wrapper.element as HTMLElement
    expect(el.tagName).toBe("DIV")
    expect(el.className).toContain("rounded-(--radius-card)")
    expect(el.className).toContain("border-(--color-border)")
    expect(el.className).toContain("bg-(--color-card)")
    // default padding is md
    expect(el.className).toContain("p-5")
  })

  it("maps the padding scale (none/sm/md/lg)", async () => {
    const sm = await mountSuspended(Card, { props: { padding: "sm" } })
    expect((sm.element as HTMLElement).className).toContain("p-4")

    const lg = await mountSuspended(Card, { props: { padding: "lg" } })
    expect((lg.element as HTMLElement).className).toContain("p-6")

    const none = await mountSuspended(Card, { props: { padding: "none" } })
    const cls = (none.element as HTMLElement).className
    expect(cls).not.toMatch(/\bp-[0-9]/)
  })

  it("adds the hover-lift only when interactive", async () => {
    const plain = await mountSuspended(Card)
    expect((plain.element as HTMLElement).className).not.toContain("hover:-translate-y-0.5")

    const interactive = await mountSuspended(Card, { props: { interactive: true } })
    expect((interactive.element as HTMLElement).className).toContain("hover:-translate-y-0.5")
  })

  it("renders a custom tag via `as` and merges caller classes", async () => {
    const wrapper = await mountSuspended(Card, {
      props: { as: "article", class: "flex flex-col" },
    })
    const el = wrapper.element as HTMLElement
    expect(el.tagName).toBe("ARTICLE")
    expect(el.className).toContain("flex")
    expect(el.className).toContain("flex-col")
  })

  it("merges its surface onto the child when as-child", async () => {
    const wrapper = await mountSuspended(Card, {
      props: { asChild: true },
      slots: { default: () => h("a", { href: "/x" }, "link") },
    })
    const el = wrapper.element as HTMLElement
    expect(el.tagName).toBe("A")
    expect(el.getAttribute("href")).toBe("/x")
    expect(el.className).toContain("bg-(--color-card)")
  })
})
