import { z } from "zod"

import * as versionsRepo from "~~/server/repositories/versions"

import { useDb } from "../db"
import { publishVersion, VersionStateError } from "../extensions-state"
import { inngest } from "../inngest"

const eventDataSchema = z.object({ versionId: z.string().min(1) })

// Minimal slice of the Inngest step API the core uses, so `reindexPublish`
// is unit-testable with a fake step (no Inngest runtime needed).
export interface ReindexStep {
  run<T>(name: string, fn: () => Promise<T>): Promise<T>
  sendEvent(name: string, payload: { name: string; data: unknown }): Promise<unknown>
}

export type ReindexResult =
  | { ok: true; extensionId: string }
  | { ok: true; gated: true; scope: string | null }
  | { ok: false; reason: string }

// The auto-publish step of the publish chain.
//
// Only **personal** scope auto-publishes here (it was already flipped inline
// by `decideScanOutcome`; this re-stamps publishedAt and fires the notify).
// **org/enterprise is gated** — it stays `ready`/`draft` and waits for a
// super-admin in the publish-review queue (`/admin/publish-queue`), so we
// stop without publishing or notifying.
export async function reindexPublish(
  versionId: string,
  step: ReindexStep,
): Promise<ReindexResult> {
  const scope = await step.run("load-scope", async () => {
    const row = await versionsRepo.findByIdWithScope(useDb(), versionId)
    return row?.scope ?? null
  })

  if (scope !== "personal") {
    return { ok: true, gated: true, scope }
  }

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
}

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
    // Inngest's `step` has richer overloaded types than the minimal slice
    // reindexPublish needs; the runtime shape (run/sendEvent) matches.
    return reindexPublish(parsed.data.versionId, step as unknown as ReindexStep)
  },
)
