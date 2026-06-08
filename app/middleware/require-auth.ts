// SSR session lookup goes through `useRequestFetch()` against a thin
// internal endpoint (`/api/internal/auth/me`) that calls
// `getSessionUser(event)` directly on the server. `useRequestFetch()`
// returns `event.$fetch`, which is the h3 `fetchWithEvent` wrapper that
// auto-forwards the original request's headers — including `cookie` —
// into the local-dispatched call. Plain `$fetch` does not, and routing
// through better-auth's own `/api/auth/get-session` handler proved
// unreliable in this stack.
//
// Same JSON-over-internal-endpoint pattern as `require-reviewer.ts`.

type MeResponse = { user: { id: string } | null }

export default defineNuxtRouteMiddleware(async (to) => {
  let hasUser = false

  if (import.meta.server) {
    const ssrFetch = useRequestFetch()
    console.log("[DEBUG-a4f2] require-auth ssr branch", {
      to: to.fullPath,
      requestFetchIsGlobalFallback: ssrFetch === globalThis.$fetch,
    })
    try {
      const res = await ssrFetch<MeResponse>("/api/internal/auth/me")
      console.log("[DEBUG-a4f2] require-auth ssr got", {
        userId: res?.user?.id ?? null,
      })
      hasUser = !!res?.user
    } catch (err) {
      console.log("[DEBUG-a4f2] require-auth ssr threw", {
        err: err instanceof Error ? err.message : String(err),
      })
      hasUser = false
    }
  } else {
    // After SSR rehydration / client-side nav, Nuxt re-runs route
    // middleware on the client. better-auth's `useSession()` is a
    // reactive nanostore that fetches *asynchronously on mount*, so on
    // first read it's still `{ data: null, isPending: true }` and a
    // synchronous check would falsely conclude "no user" and bounce to
    // sign-in. `getSession()` is the imperative form — it awaits the
    // actual /api/auth/get-session call and returns the resolved data.
    const auth = useAuth()
    try {
      const result = await auth.getSession()
      hasUser = !!result?.data?.user
      console.log("[DEBUG-a4f2] require-auth client", {
        hasUser,
        userId: result?.data?.user?.id ?? null,
      })
    } catch (err) {
      console.log("[DEBUG-a4f2] require-auth client threw", {
        err: err instanceof Error ? err.message : String(err),
      })
      hasUser = false
    }
  }

  if (!hasUser) {
    const localePath = useLocalePath()
    return navigateTo({
      path: localePath("/sign-in"),
      query: { next: to.fullPath },
    })
  }
})
