// @vitest-environment nuxt
import { describe, it, expect, beforeEach } from "vitest"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import ThemeSwitch from "./ThemeSwitch.vue"

describe("ThemeSwitch", () => {
  beforeEach(() => {
    document.cookie = "theme=ivory; path=/"
  })

  it("renders Moon when theme is ivory", async () => {
    const wrapper = await mountSuspended(ThemeSwitch)
    expect(wrapper.find("svg.lucide-moon").exists()).toBe(true)
    expect(wrapper.find("svg.lucide-sun").exists()).toBe(false)
  })

  it("clicking the button writes theme=dark to the cookie", async () => {
    const wrapper = await mountSuspended(ThemeSwitch)
    await wrapper.find("button").trigger("click")
    expect(document.cookie).toContain("theme=dark")
  })

  it("aria-label reflects the next theme", async () => {
    const wrapper = await mountSuspended(ThemeSwitch)
    expect(wrapper.find("button").attributes("aria-label")).toContain("dark")
  })
})
