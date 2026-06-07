// Gate the /admin/reviewers page. Requires the caller to hold a
// `superAdmin` membership. Authentication is enforced separately via
// `require-auth` — apply this middleware after it.
export default defineNuxtRouteMiddleware(async () => {
  const localePath = useLocalePath()
  try {
    const headers = import.meta.server
      ? useRequestHeaders(["cookie"])
      : {}
    const me = await $fetch("/api/internal/admin/me", {
      headers: headers as Record<string, string>,
    })
    if (!me.isSuperAdmin) {
      return navigateTo(localePath("/"))
    }
  } catch {
    return navigateTo(localePath("/sign-in"))
  }
})
