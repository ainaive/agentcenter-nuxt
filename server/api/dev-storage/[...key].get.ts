// Dev-only object store served over HTTP. The local-filesystem storage backend
// (server/utils/storage.ts) points its signed download/upload URLs here so the
// whole publish→bundle→download loop works locally with no cloud creds.
// Disabled in production; reads are path-traversal guarded via resolveLocalKeyPath.
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

  const { readFile } = await import("node:fs/promises")
  let data: Buffer
  try {
    data = await readFile(full)
  } catch {
    throw createError({ statusCode: 404, statusMessage: "Not found" })
  }

  setHeader(event, "content-type", "application/zip")
  setHeader(event, "content-disposition", 'attachment; filename="bundle.zip"')
  return data
})
