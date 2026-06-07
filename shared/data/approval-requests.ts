// Dev-seed approval requests for the approval workflow. Covers every
// state the publisher and reviewer UIs render, so a freshly-seeded dev
// DB lights up `/admin/approvals`, the publisher dashboard's "Awaiting
// review" pill, and `/profile?section=requests` without any manual
// submit/decide cycle. Mirrors `approval-reviewers.ts`'s shape: emails
// and slugs are resolved by `scripts/seed.ts` against the rows it just
// inserted, with warnings for any reference that doesn't match.
//
// Invariant: at most one pending row per extension. The orchestrator
// guards this at runtime; the seed must not break it on first load.

export interface SeedApprovalRequest {
  extensionSlug: string
  publisherEmail: string
  requestedTier: "productLine" | "company"
  subCat: string
  status: "pending" | "approved" | "rejected"
  reason?: string
  decidedByEmail?: string
  reviewerNote?: string
}

export const APPROVAL_REQUESTS: ReadonlyArray<SeedApprovalRequest> = [
  {
    extensionSlug: "calendar-agent",
    publisherEmail: "cory@agentcenter.dev",
    requestedTier: "company",
    subCat: "data",
    status: "pending",
    reason:
      "Calendar coordination has become load-bearing across the org — promoting this would let teams trust it without a second look.",
  },
  {
    extensionSlug: "mqtt-bridge",
    publisherEmail: "dao@agentcenter.dev",
    requestedTier: "productLine",
    subCat: "network",
    status: "pending",
    reason: "Already used by every embedded squad in the IoT product line.",
  },
  {
    extensionSlug: "summarize",
    publisherEmail: "eli@agentcenter.dev",
    requestedTier: "company",
    subCat: "docs",
    status: "approved",
    decidedByEmail: "fei@agentcenter.dev",
  },
  {
    extensionSlug: "explain",
    publisherEmail: "fei@agentcenter.dev",
    requestedTier: "company",
    subCat: "softDev",
    status: "rejected",
    decidedByEmail: "amy@agentcenter.dev",
    reviewerNote:
      "Needs a maintainer contact in the manifest before company-level review.",
  },
]
