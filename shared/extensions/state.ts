// Pure decision functions for the extension state machine. The server-side
// orchestrator (`server/utils/extensions-state.ts`) calls these to figure
// out *what* to write; the orchestrator itself owns the *how* (loading
// rows, opening transactions, calling repositories). Keeping the
// decisions here means they're testable with no DB and no mocks — just
// inputs → outputs.

export type ExtensionScope = "personal" | "org" | "enterprise"

export type ScanResult =
  | { ok: true; checksum: string; scanReport: unknown }
  | { ok: false; reason: string; scanReport: unknown }

export type FileScanUpdate =
  | { scanStatus: "clean"; scanReport: unknown; checksumSha256: string }
  | { scanStatus: "flagged"; scanReport: unknown }

export type VersionStatusUpdate =
  | { status: "ready"; publishedAt: Date | null }
  | { status: "rejected" }

export interface ExtensionPublishedUpdate {
  visibility: "published"
  publishedAt: Date
}

export interface ScanDecision {
  file: FileScanUpdate
  version: VersionStatusUpdate
  // Present iff this scan should also flip the parent extension to
  // `published` (personal scope + ok result). Absent otherwise.
  extension?: ExtensionPublishedUpdate
}

// Decide the row updates from a scan outcome. The parent extension is
// only flipped to `published` when the scope is `personal` and the scan
// succeeded — org/enterprise scans always wait for an admin
// `publishVersion` call regardless of the result.
export function decideScanOutcome(input: {
  scope: ExtensionScope
  result: ScanResult
  now: Date
}): ScanDecision {
  const { scope, result, now } = input

  if (!result.ok) {
    return {
      file: { scanStatus: "flagged", scanReport: result.scanReport },
      version: { status: "rejected" },
    }
  }

  const isPersonal = scope === "personal"
  const publishedAt = isPersonal ? now : null

  const decision: ScanDecision = {
    file: {
      scanStatus: "clean",
      scanReport: result.scanReport,
      checksumSha256: result.checksum,
    },
    version: { status: "ready", publishedAt },
  }

  if (isPersonal) {
    decision.extension = { visibility: "published", publishedAt: now }
  }

  return decision
}

export interface PublishDecision {
  extension: ExtensionPublishedUpdate
  // Just a `publishedAt` stamp — `status` stays `ready`.
  version: { publishedAt: Date }
}

// Admin publish flow: stamp both the extension and the version with the
// same `now` so their `publishedAt` line up.
export function decidePublishOutcome(now: Date): PublishDecision {
  return {
    extension: { visibility: "published", publishedAt: now },
    version: { publishedAt: now },
  }
}
