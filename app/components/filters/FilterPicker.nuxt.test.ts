// @vitest-environment nuxt
import { describe, it, expect } from "vitest"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { defineComponent, h } from "vue"

import FilterPicker from "./FilterPicker.vue"

// reka-ui's <Popover>/<PopoverContent> teleport their content out of the
// component in the headless env. Stub the primitives with passthroughs so
// the trigger label and the option list sit inline and we can drive them.
const passthrough = (name: string) =>
  defineComponent({ name, render() { return h("div", this.$slots.default?.()) } })

const stubs = {
  Popover: passthrough("Popover"),
  PopoverContent: passthrough("PopoverContent"),
  PopoverTrigger: defineComponent({
    name: "PopoverTrigger",
    render() { return h("button", this.$slots.default?.()) },
  }),
}

const OPTIONS = [
  { id: "a", label: "Alice", count: 3 },
  { id: "b", label: "Bob", count: 1 },
]

const baseProps = {
  options: OPTIONS,
  label: "Creator",
  anyLabel: "Any creator",
  emptyLabel: "No creators",
}

describe("FilterPicker", () => {
  it("shows the fallback label in the trigger when nothing is active", async () => {
    const wrapper = await mountSuspended(FilterPicker, { props: baseProps, global: { stubs } })
    expect(wrapper.text()).toContain("Creator")
  })

  it("shows the active option's label in the trigger", async () => {
    const wrapper = await mountSuspended(FilterPicker, {
      props: { ...baseProps, activeId: "b" },
      global: { stubs },
    })
    expect(wrapper.text()).toContain("Bob")
  })

  it("renders the any row and each option with its count", async () => {
    const wrapper = await mountSuspended(FilterPicker, { props: baseProps, global: { stubs } })
    expect(wrapper.text()).toContain("Any creator")
    expect(wrapper.text()).toContain("Alice")
    expect(wrapper.text()).toContain("3")
  })

  it("emits select with the option id, and undefined for the any row", async () => {
    const wrapper = await mountSuspended(FilterPicker, { props: baseProps, global: { stubs } })
    const buttons = wrapper.findAll("button")
    const alice = buttons.find((b) => b.text().includes("Alice"))!
    await alice.trigger("click")
    const any = buttons.find((b) => b.text().includes("Any creator"))!
    await any.trigger("click")

    const events = wrapper.emitted("select")
    expect(events).toBeTruthy()
    expect(events![0]).toEqual(["a"])
    expect(events![1]).toEqual([undefined])
  })

  it("shows the empty label when there are no options", async () => {
    const wrapper = await mountSuspended(FilterPicker, {
      props: { ...baseProps, options: [] },
      global: { stubs },
    })
    expect(wrapper.text()).toContain("No creators")
  })
})
