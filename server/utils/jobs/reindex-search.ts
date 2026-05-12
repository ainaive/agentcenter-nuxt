import { z } from "zod"
import { inngest } from "../inngest"
import { publishVersion, VersionStateError } from "../extensions-state"

const eventDataSchema = z.object({ versionId: z.string().min(1) })

export const reindexSearch = inngest.createFunction(
  {
    id: "reindex-search",
    triggers: [{ event: "extension/index.requested" }],
  },
  async ({ event, step }) => {
    const parsed = eventDataSchema.safeParse(event.data)
    if (!parsed.success) {
      console.error("[reindex-search] invalid event payload", parsed.error)
      return { ok: false, reason: "invalid_event" }
    }
    const { versionId } = parsed.data

    let extensionId: string
    try {
      const result = await step.run("publish-version", () => publishVersion(versionId))
      extensionId = result.extensionId
    } catch (err) {
      if (err instanceof VersionStateError) {
        return { ok: false, reason: err.code }
      }
      throw err
    }

    // Nuxt's data layer caches via useFetch keys, not tags. Cache busting on
    // the consuming page happens via re-fetch when the user navigates back.
    // No revalidateTag equivalent needed here.

    await step.sendEvent("notify-published", {
      name: "extension/published",
      data: { extensionId, versionId },
    })

    return { ok: true, extensionId }
  },
)
