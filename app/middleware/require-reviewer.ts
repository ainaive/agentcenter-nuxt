// Gate the /admin/approvals page. Requires the caller to either hold a
// `superAdmin` membership or be assigned to at least one (tier, subCat)
// cell in the reviewer matrix. Authentication is enforced separately via
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
    if (!me.isReviewer) {
      return navigateTo(localePath("/"))
    }
  } catch {
    return navigateTo(localePath("/sign-in"))
  }
})
