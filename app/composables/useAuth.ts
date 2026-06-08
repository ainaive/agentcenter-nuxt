import { createAuthClient } from "better-auth/vue"

// `useSession()` is browser-only — server callers (middleware, plugins) must
// pass `fetchOptions.headers` to `getSession()` so the request's cookies reach
// the auth endpoint.
//
// On the server we also have to give the client an absolute `baseURL`. The
// browser resolves better-auth's default relative URLs against
// `window.location.origin`; Node's native `fetch` does not, and would throw
// `Failed to parse URL from /api/auth/get-session` the moment any SSR
// middleware (require-auth, require-onboard) tries to read the session.
// `useRequestURL()` reads h3's request including x-forwarded-* headers, so
// preview and proxied environments resolve correctly without env config.

let _clientSingleton: ReturnType<typeof createAuthClient> | undefined

export function useAuth() {
  if (import.meta.server) {
    return createAuthClient({ baseURL: useRequestURL().origin })
  }
  if (!_clientSingleton) _clientSingleton = createAuthClient()
  return _clientSingleton
}
