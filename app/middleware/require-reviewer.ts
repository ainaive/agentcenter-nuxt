// Gate the /admin/approvals page. Requires the caller to either hold a
// `superAdmin` membership or be assigned to at least one (tier, subCat)
// cell in the reviewer matrix. Authentication is enforced separately via
// `require-auth` — apply this middleware after it.
//
// On the server, `useRequestFetch()` returns `event.$fetch`, which auto-
// forwards the original request's cookies into the local-dispatched call;
// plain `$fetch` does not, and silently treats the caller as anonymous,
// which would bounce a real reviewer to `/` on hard-refresh.

type AdminMe = { isSuperAdmin: boolean; isReviewer: boolean }

export default defineNuxtRouteMiddleware(async () => {
  const localePath = useLocalePath()
  const ssrFetch = import.meta.server ? useRequestFetch() : $fetch
  try {
    const me = await ssrFetch<AdminMe>("/api/internal/admin/me")
    if (!me.isReviewer) {
      return navigateTo(localePath("/"))
    }
  } catch {
    return navigateTo(localePath("/sign-in"))
  }
})
