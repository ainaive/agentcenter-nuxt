import { z } from "zod"

const InstallBody = z.object({
  extensionSlug: z.string().min(1),
  version: z.string().default("latest"),
  agentName: z.string().optional(),
  agentVersion: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = await authenticateBearerToken(event)
  if (!user) apiError(event, "Authentication required.", 401, "unauthenticated")

  let body: z.infer<typeof InstallBody>
  try {
    body = InstallBody.parse(await readBody(event))
  } catch {
    apiError(event, "Invalid request body.", 400, "invalid_body")
  }

  const version = body.version === "latest" ? undefined : body.version

  try {
    const result = await recordInstall({
      userId: user.id,
      extension: { slug: body.extensionSlug },
      source: "cli",
      version,
    })
    return { ok: true, ...result }
  } catch (err) {
    if (err instanceof InstallError) {
      const status = err.code === "extension_not_found" ? 404 : 422
      apiError(event, err.code, status, err.code)
    }
    console.error("recordInstall failed", err)
    apiError(event, "internal_error", 500, "internal_error")
  }
})
