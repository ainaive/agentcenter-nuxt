// Pure decision for the install flow's "which version to record" step.
// Same testability story as `shared/extensions/state.ts` — the orchestrator
// loads the candidate list and passes it in; this module just decides.

export interface VersionCandidate {
  version: string
  publishedAt: Date | null
  createdAt: Date
}

export type VersionPick =
  | { ok: true; version: string }
  | { ok: false; error: "no_published_version" }

// `candidates` must already be sorted newest-first
// (`publishedAt DESC NULLS LAST, createdAt DESC` — matches what
// `versionsRepo.listLatestReadyForExtension` returns).
//
// - If the caller passed a specific version, that wins (passthrough).
// - Otherwise pick the first candidate; if there is none, return an error
//   so the orchestrator can map it to its domain exception.
export function pickInstallVersion(input: {
  requested: string | undefined
  candidates: VersionCandidate[]
}): VersionPick {
  const { requested, candidates } = input

  if (requested) return { ok: true, version: requested }

  const latest = candidates[0]
  if (!latest) return { ok: false, error: "no_published_version" }

  return { ok: true, version: latest.version }
}
