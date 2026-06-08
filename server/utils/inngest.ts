import { Inngest } from "inngest"

export const inngest = new Inngest({
  id: "agentcenter",
  ...(process.env.INNGEST_EVENT_KEY ? { eventKey: process.env.INNGEST_EVENT_KEY } : {}),
  isDev: process.env.NODE_ENV !== "production",
})

// Best-effort wrapper for notification-style events whose underlying write
// has already committed. Loses the event on transport failure rather than
// failing the user's action. Use `inngest.send` directly when the caller
// wants the failure to surface (e.g. publish.ts's rollback path).
export async function safeSend(
  event: Parameters<typeof inngest.send>[0],
): Promise<void> {
  try {
    await inngest.send(event)
  } catch (error) {
    const name = Array.isArray(event)
      ? event.map((e) => e.name).join(",")
      : event.name
    console.error("[inngest] safeSend failed", { name, error })
  }
}

// Lazy-loaded function refs to avoid pulling fflate / smol-toml into every
// server module that imports the inngest client.
let _functions: ReturnType<typeof loadFunctions> | undefined
async function loadFunctions() {
  const { scanBundle } = await import("./jobs/scan-bundle")
  const { reindexSearch } = await import("./jobs/reindex-search")
  const { notifyApprovalRequested, notifyApprovalDecided } = await import(
    "./jobs/notify-approval"
  )
  return [
    scanBundle,
    reindexSearch,
    notifyApprovalRequested,
    notifyApprovalDecided,
  ]
}

export async function getInngestFunctions() {
  if (!_functions) _functions = loadFunctions()
  return _functions
}
