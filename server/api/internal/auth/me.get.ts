// Thin "who am I" probe backing the SSR branch of require-auth /
// require-onboard. Calls the server-side session helper directly so the
// middleware does not need to roundtrip through the better-auth Vue
// client (relative URLs blow up under Node fetch) or through better-auth's
// own /api/auth/get-session handler (cookies don't reliably survive the
// plain $fetch → Nitro local-dispatch path during SSR).
//
// Returns { user: null } for anonymous callers rather than 401, so the
// middleware can branch on the user shape instead of catching errors.

export default defineEventHandler(async (event) => {
  // Per-user, cookie-dependent payload — must not be cached by browsers,
  // intermediary proxies, or the Vercel edge. `Vary: Cookie` defends
  // against shared-cache cross-session bleed.
  setResponseHeader(event, "Cache-Control", "private, no-store")
  setResponseHeader(event, "Vary", "Cookie")
  const user = await getSessionUser(event)
  return { user: user ?? null }
})
