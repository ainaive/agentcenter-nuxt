// SSR session lookup goes through `$fetch` to better-auth's own
// `/api/auth/get-session` route — see require-auth.ts for the rationale.

type UserShape = { defaultDeptId?: string | null }
type SessionResponse = { user?: (UserShape & { id: string }) | null } | null

export default defineNuxtRouteMiddleware(async (to) => {
  let rawUser: UserShape | null = null

  if (import.meta.server) {
    const headers = useRequestHeaders(["cookie"])
    try {
      const session = await $fetch<SessionResponse>("/api/auth/get-session", {
        headers: headers as Record<string, string>,
      })
      rawUser = session?.user ?? null
    } catch {
      rawUser = null
    }
  } else {
    const session = useAuth().useSession()
    rawUser = (session.value.data?.user as UserShape | undefined) ?? null
  }

  if (!rawUser) return
  if (rawUser.defaultDeptId) return

  const localePath = useLocalePath()
  if (to.path === localePath("/onboard")) return
  return navigateTo(localePath("/onboard"))
})
