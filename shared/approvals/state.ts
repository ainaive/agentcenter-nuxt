// Pure decision functions for the official-tier approval workflow. Mirrors
// `shared/extensions/state.ts`: the orchestrator
// (`server/utils/approvals.ts`) calls these to figure out *what* to write;
// the orchestrator owns the *how* (loading rows, opening transactions,
// calling repositories). Keeping the decisions here means they're testable
// with no DB and no mocks — just inputs → outputs.

export type OfficialTier = "productLine" | "company"

export type ApprovalStatus = "pending" | "approved" | "rejected" | "withdrawn"

export type ApprovalAction =
  | { decision: "approve" }
  | { decision: "reject"; note?: string }

export interface ApprovalRequestPatch {
  status: "approved" | "rejected"
  decidedByUserId: string
  decidedAt: Date
  reviewerNote: string | null
}

export interface ExtensionOfficialTierPatch {
  officialTier: OfficialTier
}

export interface ApprovalOutcome {
  request: ApprovalRequestPatch
  // Present iff the request was approved — the orchestrator stamps the new
  // tier onto the parent extension in the same transaction.
  extension?: ExtensionOfficialTierPatch
}

// Decide the row updates from a reviewer's verdict. Only pending requests
// can transition; other states are no-ops and throw at the orchestrator.
export function decideApprovalOutcome(input: {
  current: { status: ApprovalStatus; requestedTier: OfficialTier }
  action: ApprovalAction
  reviewerUserId: string
  now: Date
}): ApprovalOutcome {
  const { current, action, reviewerUserId, now } = input

  if (current.status !== "pending") {
    throw new Error(
      `cannot decide approval request in status '${current.status}'`,
    )
  }

  if (action.decision === "approve") {
    return {
      request: {
        status: "approved",
        decidedByUserId: reviewerUserId,
        decidedAt: now,
        reviewerNote: null,
      },
      extension: { officialTier: current.requestedTier },
    }
  }

  // Reject — note is preserved verbatim; an empty/whitespace-only note
  // collapses to null so downstream "if reviewerNote" reads cleanly.
  const trimmed = action.note?.trim()
  return {
    request: {
      status: "rejected",
      decidedByUserId: reviewerUserId,
      decidedAt: now,
      reviewerNote: trimmed && trimmed.length > 0 ? trimmed : null,
    },
  }
}

export interface WithdrawOutcome {
  request: { status: "withdrawn"; decidedAt: Date }
}

// A publisher can withdraw a request while it's still pending. Withdrawal
// is recorded with a timestamp but no reviewer, since no admin acted.
export function decideWithdrawOutcome(input: {
  current: { status: ApprovalStatus }
  now: Date
}): WithdrawOutcome {
  if (input.current.status !== "pending") {
    throw new Error(
      `cannot withdraw approval request in status '${input.current.status}'`,
    )
  }
  return { request: { status: "withdrawn", decidedAt: input.now } }
}
