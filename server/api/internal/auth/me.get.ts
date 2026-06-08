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
  const rawCookie = getRequestHeader(event, "cookie")
  console.log("[DEBUG-a4f2] me handler entered", {
    hasCookieHeader: typeof rawCookie === "string" && rawCookie.length > 0,
    cookieHeaderLen: rawCookie?.length ?? 0,
    cookieNames:
      typeof rawCookie === "string"
        ? rawCookie.split(";").map((c) => c.trim().split("=")[0])
        : [],
  })
  const user = await getSessionUser(event)
  console.log("[DEBUG-a4f2] me handler result", {
    userId: user?.id ?? null,
  })
  return { user: user ?? null }
})
