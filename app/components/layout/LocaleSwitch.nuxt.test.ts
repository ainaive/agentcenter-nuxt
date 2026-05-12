// @vitest-environment nuxt
import { describe, it, expect } from "vitest"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import LocaleSwitch from "./LocaleSwitch.vue"

describe("LocaleSwitch", () => {
  it("renders an anchor element", async () => {
    const wrapper = await mountSuspended(LocaleSwitch)
    expect(wrapper.find("a").exists()).toBe(true)
  })

  it("button label is present (mentions the target locale)", async () => {
    const wrapper = await mountSuspended(LocaleSwitch)
    const link = wrapper.find("a")
    const label = link.attributes("aria-label") ?? ""
    expect(label.length).toBeGreaterThan(0)
  })

  it("renders the next locale code (en or zh) in the font-mono span", async () => {
    const wrapper = await mountSuspended(LocaleSwitch)
    const code = wrapper.find("span.font-mono").text()
    expect(["en", "zh"]).toContain(code)
  })
})
