export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuth()

  if (import.meta.server) {
    const headers = useRequestHeaders(["cookie"])
    const result = await auth.getSession({
      fetchOptions: { headers: new Headers(headers as Record<string, string>) },
    })
    if (!result.data?.user) {
      const localePath = useLocalePath()
      return navigateTo({
        path: localePath("/sign-in"),
        query: { next: to.fullPath },
      })
    }
  } else {
    const session = auth.useSession()
    if (!session.value.data?.user) {
      const localePath = useLocalePath()
      return navigateTo({
        path: localePath("/sign-in"),
        query: { next: to.fullPath },
      })
    }
  }
})
