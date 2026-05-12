// @vitest-environment nuxt
import { describe, it, expect } from "vitest"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import ThemeSwitch from "./ThemeSwitch.vue"

describe("ThemeSwitch", () => {
  it("renders Moon when theme is ivory and Sun when dark", async () => {
    document.cookie = "theme=ivory; path=/"
    const wrapper = await mountSuspended(ThemeSwitch)
    expect(wrapper.find("svg.lucide-moon").exists()).toBe(true)
    expect(wrapper.find("svg.lucide-sun").exists()).toBe(false)
  })

  it("clicking the button toggles the theme cookie", async () => {
    const wrapper = await mountSuspended(ThemeSwitch)
    const initial = document.cookie.includes("theme=dark") ? "dark" : "ivory"
    await wrapper.find("button").trigger("click")
    const after = document.cookie.includes("theme=dark") ? "dark" : "ivory"
    expect(after).not.toBe(initial)
  })

  it("aria-label reflects the next theme", async () => {
    document.cookie = "theme=ivory; path=/"
    const wrapper = await mountSuspended(ThemeSwitch)
    expect(wrapper.find("button").attributes("aria-label")).toContain("dark")
  })
})
