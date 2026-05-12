import { z } from "zod"

const InstallBody = z.object({
  extensionId: z.string().min(1),
  version: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readValidatedBody(event, (raw) => InstallBody.parse(raw))

  try {
    const result = await recordInstall({
      userId: user.id,
      extension: { id: body.extensionId },
      source: "web",
      version: body.version,
    })
    return { ok: true, ...result }
  } catch (err) {
    if (err instanceof InstallError) {
      const status = err.code === "extension_not_found" ? 404 : 422
      throw createError({ statusCode: status, statusMessage: err.code })
    }
    console.error("internal recordInstall failed", err)
    throw createError({ statusCode: 500, statusMessage: "install_failed" })
  }
})
