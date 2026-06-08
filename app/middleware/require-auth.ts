// SSR session lookup goes through `$fetch` to better-auth's own
// `/api/auth/get-session` route, not the better-auth Vue client. During
// SSR Nuxt's `$fetch` short-circuits to Nitro's in-process handler
// dispatch (no real network), so the cookie we forward via headers
// reaches the auth handler exactly as a browser request would. The client
// alternative used a real HTTP loopback whose cookie/origin handling was
// unreliable — same pattern as `app/middleware/require-reviewer.ts`.

type SessionResponse = { user?: { id: string } | null } | null

export default defineNuxtRouteMiddleware(async (to) => {
  let hasUser = false

  if (import.meta.server) {
    const headers = useRequestHeaders(["cookie"])
    try {
      const session = await $fetch<SessionResponse>("/api/auth/get-session", {
        headers: headers as Record<string, string>,
      })
      hasUser = !!session?.user
    } catch {
      hasUser = false
    }
  } else {
    const session = useAuth().useSession()
    hasUser = !!session.value.data?.user
  }

  if (!hasUser) {
    const localePath = useLocalePath()
    return navigateTo({
      path: localePath("/sign-in"),
      query: { next: to.fullPath },
    })
  }
})
