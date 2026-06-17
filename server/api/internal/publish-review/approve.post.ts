import { z } from "zod"

import { publishVersion, VersionStateError } from "~~/server/utils/extensions-state"

// Super-admin Publish action from the publish-review queue. The role gate
// sits here (requireSuperAdmin) so `publishVersion` stays a pure state
// transition — same split as approvals/revoke.post.ts.
const bodySchema = z.object({ versionId: z.string().min(1) })

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const body = await readValidatedBody(event, (raw) => bodySchema.parse(raw))

  try {
    const { extensionId } = await publishVersion(body.versionId)

    // Best-effort: mirror reindex-search's published notify so any downstream
    // listeners fire for super-admin publishes too. A failed send must not
    // fail the (already committed) publish.
    try {
      const { inngest } = await import("~~/server/utils/inngest")
      await inngest.send({
        name: "extension/published",
        data: { extensionId, versionId: body.versionId },
      })
    } catch (err) {
      console.error("[publish-review] published notify failed", err)
    }

    return { ok: true, extensionId }
  } catch (err) {
    if (err instanceof VersionStateError) {
      // Version missing or not in `ready` status (e.g. already published).
      throw createError({ statusCode: 409, statusMessage: "not_publishable" })
    }
    console.error("[publish-review] approve failed", err)
    throw createError({ statusCode: 500, statusMessage: "publish_failed" })
  }
})
