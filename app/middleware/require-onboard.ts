// SSR session lookup goes through `useRequestFetch()` against the
// thin `/api/internal/auth/me` endpoint — see require-auth.ts for the
// rationale.

type UserShape = { id: string; defaultDeptId?: string | null }
type MeResponse = { user: UserShape | null }

export default defineNuxtRouteMiddleware(async (to) => {
  let rawUser: UserShape | null = null

  if (import.meta.server) {
    try {
      const { user } = await useRequestFetch()<MeResponse>(
        "/api/internal/auth/me",
      )
      rawUser = user
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
