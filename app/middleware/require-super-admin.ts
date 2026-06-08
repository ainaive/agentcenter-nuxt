// Gate the /admin/reviewers page. Requires the caller to hold a
// `superAdmin` membership. Authentication is enforced separately via
// `require-auth` — apply this middleware after it.
//
// SSR-side fetch uses `useRequestFetch()` so cookies are forwarded into
// the local dispatch; see `require-reviewer.ts` for the rationale.

type AdminMe = { isSuperAdmin: boolean }

export default defineNuxtRouteMiddleware(async () => {
  const localePath = useLocalePath()
  try {
    // See require-reviewer.ts for why the cast is needed.
    const fetchAny = useRequestFetch() as (url: string) => Promise<unknown>
    const me = (await fetchAny("/api/internal/admin/me")) as AdminMe
    if (!me.isSuperAdmin) {
      return navigateTo(localePath("/"))
    }
  } catch {
    return navigateTo(localePath("/sign-in"))
  }
})
