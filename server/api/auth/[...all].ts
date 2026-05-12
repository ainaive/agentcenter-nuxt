export default defineEventHandler(async (event) => {
  const auth = useAuthServer()
  return auth.handler(toWebRequest(event))
})
