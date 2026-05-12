import type { Theme } from "~~/shared/types"
import { THEME_COOKIE_NAME, isValidTheme } from "~~/shared/theme"

export function useTheme() {
  const cookie = useCookie<Theme>(THEME_COOKIE_NAME, {
    default: () => "ivory",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  })

  if (!isValidTheme(cookie.value)) cookie.value = "ivory"

  const htmlClass = computed(() => (cookie.value === "dark" ? "dark" : ""))

  useHead({ htmlAttrs: { class: htmlClass } })

  function toggle() {
    cookie.value = cookie.value === "dark" ? "ivory" : "dark"
  }

  function set(next: Theme) {
    cookie.value = next
  }

  return { theme: cookie, toggle, set }
}
