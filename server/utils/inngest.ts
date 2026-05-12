import { Inngest } from "inngest"

export const inngest = new Inngest({
  id: "agentcenter",
  ...(process.env.INNGEST_EVENT_KEY ? { eventKey: process.env.INNGEST_EVENT_KEY } : {}),
  isDev: process.env.NODE_ENV !== "production",
})

// Lazy-loaded function refs to avoid pulling fflate / smol-toml into every
// server module that imports the inngest client.
let _functions: ReturnType<typeof loadFunctions> | undefined
async function loadFunctions() {
  const { scanBundle } = await import("./jobs/scan-bundle")
  const { reindexSearch } = await import("./jobs/reindex-search")
  return [scanBundle, reindexSearch]
}

export async function getInngestFunctions() {
  if (!_functions) _functions = loadFunctions()
  return _functions
}
