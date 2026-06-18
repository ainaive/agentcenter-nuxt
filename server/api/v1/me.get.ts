// Current user for the CLI. The device-code login stores a session token and
// sends it as `Authorization: Bearer <token>`; `agentcenter whoami` reads this.
// Same bearer→session→user resolution as POST /api/v1/installs.
export default defineEventHandler(async (event) => {
  const user = await authenticateBearerToken(event)
  if (!user) apiError(event, "Authentication required.", 401, "unauthenticated")

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  }
})
