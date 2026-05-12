import { createAuthClient } from "better-auth/vue"

// `useSession()` is browser-only — server callers (middleware, plugins) must
// pass `fetchOptions.headers` to `getSession()` so the request's cookies reach
// the auth endpoint.
const _client = createAuthClient()

export function useAuth() {
  return _client
}
