type UserShape = { defaultDeptId?: string | null }

export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuth()

  let rawUser: unknown = null
  if (import.meta.server) {
    const headers = useRequestHeaders(["cookie"])
    const result = await auth.getSession({
      fetchOptions: { headers: new Headers(headers as Record<string, string>) },
    })
    rawUser = result.data?.user ?? null
  } else {
    const session = auth.useSession()
    rawUser = session.value.data?.user ?? null
  }

  if (!rawUser) return
  const user = rawUser as UserShape
  if (user.defaultDeptId) return

  const localePath = useLocalePath()
  if (to.path === localePath("/onboard")) return
  return navigateTo(localePath("/onboard"))
})
