// @vitest-environment nuxt
import { describe, it, expect } from "vitest"
import { useTheme } from "./useTheme"

describe("useTheme", () => {
  it("defaults to ivory when no cookie is set", () => {
    const { theme } = useTheme()
    expect(theme.value).toBe("ivory")
  })

  it("toggle flips ivory → dark → ivory", () => {
    const { theme, toggle } = useTheme()
    theme.value = "ivory"
    toggle()
    expect(theme.value).toBe("dark")
    toggle()
    expect(theme.value).toBe("ivory")
  })

  it("set writes the cookie directly", () => {
    const { theme, set } = useTheme()
    set("dark")
    expect(theme.value).toBe("dark")
  })

  it("invalid persisted value resets to ivory", () => {
    document.cookie = "theme=garbage; path=/"
    const { theme } = useTheme()
    expect(theme.value).toBe("ivory")
  })
})
