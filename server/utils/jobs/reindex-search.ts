import { inngest } from "../inngest"
import { publishVersion, VersionStateError } from "../extensions-state"

export const reindexSearch = inngest.createFunction(
  {
    id: "reindex-search",
    triggers: [{ event: "extension/index.requested" }],
  },
  async ({ event, step }) => {
    const { versionId } = event.data as { versionId: string }

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
