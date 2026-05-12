type UserShape = { defaultDeptId?: string | null }

function toFetchHeaders(raw: Record<string, string | undefined>): Headers {
  const headers = new Headers()
  for (const [key, value] of Object.entries(raw)) {
    if (value !== undefined) headers.append(key, value)
  }
  return headers
}

export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuth()

  let rawUser: unknown = null
  if (import.meta.server) {
    const result = await auth.getSession({
      fetchOptions: { headers: toFetchHeaders(useRequestHeaders(["cookie"])) },
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
