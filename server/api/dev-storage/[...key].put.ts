// PUT half of the dev-only object store (see [...key].get.ts). Accepts the raw
// body the publish wizard PUTs to its signed upload URL and writes it under the
// local storage root. Disabled in production; path-traversal guarded.
export default defineEventHandler(async (event) => {
  if (process.env.NODE_ENV === "production") {
    throw createError({ statusCode: 404, statusMessage: "Not found" })
  }

  const key = event.context.params?.key
  if (!key) throw createError({ statusCode: 400, statusMessage: "key required" })

  let full: string
  try {
    full = resolveLocalKeyPath(key)
  } catch {
    throw createError({ statusCode: 400, statusMessage: "invalid key" })
  }

  const body = await readRawBody(event, false)
  if (!body || body.length === 0) {
    throw createError({ statusCode: 400, statusMessage: "empty body" })
  }

  const { mkdir, writeFile } = await import("node:fs/promises")
  const { dirname } = await import("node:path")
  await mkdir(dirname(full), { recursive: true })
  await writeFile(full, body as Buffer)

  return { ok: true }
})
