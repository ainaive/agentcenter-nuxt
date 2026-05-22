import { CollectionError } from "~~/server/repositories/collections"

// Single place that maps the repo's `CollectionError` codes onto HTTP
// statuses. Routes call it from a `catch` so the mapping stays consistent
// across the dozen endpoints.
export function mapCollectionError(err: unknown): ReturnType<typeof createError> {
  if (err instanceof CollectionError) {
    const status =
      err.code === "not_found"
        ? 404
        : err.code === "forbidden"
          ? 403
          : err.code === "system_collection_locked"
            ? 422
            : 500
    return createError({ statusCode: status, statusMessage: err.code })
  }
  console.error("unexpected collection error", err)
  return createError({ statusCode: 500, statusMessage: "internal_error" })
}
