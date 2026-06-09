import * as adminsRepo from "~~/server/repositories/admins"
import * as approvalsRepo from "~~/server/repositories/approvals"
import * as extensionsRepo from "~~/server/repositories/extensions"
import {
  decideApprovalOutcome,
  decideWithdrawOutcome,
  type ApprovalAction,
  type OfficialTier,
} from "~~/shared/approvals/state"
import type { ExtensionCategory } from "~~/shared/types"

import { useDb } from "./db"
import { safeSend } from "./inngest"

// Orchestrators over the approvals/admins/extensions repositories. Pure
// transitions live in `shared/approvals/state.ts`; this file loads rows,
// opens transactions, fires Inngest events, and maps domain errors to
// HTTP-shaped codes the endpoints translate.

export type ApprovalErrorCode =
  | "extension_not_found"
  | "not_publisher_owner"
  | "extension_not_published"
  | "request_not_found"
  | "request_not_pending"
  | "duplicate_pending_request"
  | "not_reviewer"
  | "not_requester"
  | "missing_product_line"
  | "unexpected_product_line"
  | "extension_not_official"

export class ApprovalError extends Error {
  readonly code: ApprovalErrorCode
  constructor(code: ApprovalErrorCode) {
    super(code)
    this.code = code
    this.name = "ApprovalError"
  }
}

export interface SubmitParams {
  extensionId: string
  requestedTier: OfficialTier
  subCat: string
  productLineId: string | null
  userId: string
  reason: string | undefined
}

export async function submitRequest(
  params: SubmitParams,
): Promise<approvalsRepo.ApprovalRequestRow> {
  // Shape rule mirrors the DB CHECK: productLineId is present iff the
  // requested tier is `productLine`. Surfacing both error codes lets the
  // endpoint give a precise message instead of bouncing the raw 23514.
  if (params.requestedTier === "productLine" && !params.productLineId) {
    throw new ApprovalError("missing_product_line")
  }
  if (params.requestedTier === "company" && params.productLineId) {
    throw new ApprovalError("unexpected_product_line")
  }

  const db = useDb()

  const ext = await extensionsRepo.findById(db, params.extensionId)
  if (!ext) throw new ApprovalError("extension_not_found")
  if (ext.publisherUserId !== params.userId) {
    throw new ApprovalError("not_publisher_owner")
  }
  if (ext.visibility !== "published") {
    throw new ApprovalError("extension_not_published")
  }

  const row = await db.transaction(async (tx) => {
    // Re-check inside the transaction — race window between the visibility
    // load above and the insert below would otherwise let a duplicate slip
    // through. PG isolation is `read committed` so the second check still
    // sees a concurrent insert that already committed.
    const existing = await approvalsRepo.findPendingByExtension(
      tx,
      params.extensionId,
    )
    if (existing) throw new ApprovalError("duplicate_pending_request")

    // Re-load the extension inside the transaction so the snapshotted
    // `extensionCategory` / `l2` reflect a tx-visible row. The
    // pre-transaction load above is still useful for the ownership /
    // visibility validation; using its values for the snapshot would
    // race with a concurrent reclassification.
    const extInTx = await extensionsRepo.findById(tx, params.extensionId)
    if (!extInTx) throw new ApprovalError("extension_not_found")

    try {
      return await approvalsRepo.insertRequest(tx, {
        id: crypto.randomUUID(),
        extensionId: params.extensionId,
        // Snapshot the extension's category + l2 onto the request so
        // routing fan-out doesn't have to join `extensions` and so the
        // audit trail freezes them at submission time.
        extensionCategory: extInTx.category as ExtensionCategory,
        requestedTier: params.requestedTier,
        subCat: params.subCat,
        l2: extInTx.l2 ?? null,
        productLineId: params.productLineId,
        requestedByUserId: params.userId,
        reason: params.reason ?? null,
      })
    } catch (err) {
      // Race backstop: the partial unique index
      // `approval_requests_one_pending_uq` makes a concurrent second
      // insert fail with PG code 23505 (Drizzle wraps the original PG
      // error on `cause`). Translate to the same domain code the
      // read-check above uses so the endpoint surfaces one stable error
      // regardless of which side of the race lost.
      if (
        err instanceof Error &&
        err.cause != null &&
        typeof err.cause === "object" &&
        "code" in err.cause &&
        (err.cause as { code?: string }).code === "23505"
      ) {
        throw new ApprovalError("duplicate_pending_request")
      }
      throw err
    }
  })

  // Best-effort: the request row is the source of truth and is already
  // visible in the reviewer queue. A transient Inngest outage (or, in dev,
  // a missing `inngest-cli dev` process) must not fail the user's submit
  // after the row has been committed.
  await safeSend({
    name: "extension/approval.requested",
    data: {
      requestId: row.id,
      extensionId: row.extensionId,
      requestedTier: row.requestedTier,
      subCat: row.subCat,
      productLineId: row.productLineId,
      requesterUserId: row.requestedByUserId,
    },
  })

  return row
}

export interface DecideParams {
  requestId: string
  action: ApprovalAction
  reviewerUserId: string
}

export async function decideRequest(
  params: DecideParams,
): Promise<approvalsRepo.ApprovalRequestRow> {
  const db = useDb()

  const current = await approvalsRepo.findById(db, params.requestId)
  if (!current) throw new ApprovalError("request_not_found")
  if (current.status !== "pending") {
    throw new ApprovalError("request_not_pending")
  }

  // Super-admins can decide on any cell; otherwise the reviewer must
  // hold an admin row whose covered shadow includes this request's
  // cell. Coverage is computed in one query against the user's admin
  // rows (see `isAdminCoveringRequest`).
  const allowed =
    (await adminsRepo.isSuperAdmin(db, params.reviewerUserId)) ||
    (await adminsRepo.isAdminCoveringRequest(db, params.reviewerUserId, {
      extensionCategory: current.extensionCategory,
      tier: current.requestedTier,
      productLineId: current.productLineId,
      subCat: current.subCat,
      l2: current.l2,
    }))
  if (!allowed) throw new ApprovalError("not_reviewer")

  const outcome = decideApprovalOutcome({
    current: {
      status: current.status,
      requestedTier: current.requestedTier,
    },
    action: params.action,
    reviewerUserId: params.reviewerUserId,
    now: new Date(),
  })

  // Optimistic locking lives inside the repository's UPDATE — if a second
  // reviewer decided between the pre-check above and this transaction, the
  // affected row count comes back zero and we surface the race as
  // `request_not_pending`.
  await db.transaction(async (tx) => {
    const updated = await approvalsRepo.applyDecision(
      tx,
      params.requestId,
      outcome.request,
    )
    if (updated === 0) throw new ApprovalError("request_not_pending")
    if (outcome.extension) {
      await approvalsRepo.setExtensionOfficialTier(
        tx,
        current.extensionId,
        outcome.extension.officialTier,
        current.productLineId,
      )
    }
  })

  const updated = await approvalsRepo.findById(db, params.requestId)
  if (!updated) throw new Error("approval request vanished mid-decide")

  // Best-effort notification after commit; see submitRequest for rationale.
  await safeSend({
    name: "extension/approval.decided",
    data: {
      requestId: updated.id,
      extensionId: updated.extensionId,
      decision: outcome.request.status,
      decidedByUserId: params.reviewerUserId,
    },
  })

  return updated
}

export interface WithdrawParams {
  requestId: string
  userId: string
}

export async function withdrawRequest(
  params: WithdrawParams,
): Promise<approvalsRepo.ApprovalRequestRow> {
  const db = useDb()

  const current = await approvalsRepo.findById(db, params.requestId)
  if (!current) throw new ApprovalError("request_not_found")
  if (current.requestedByUserId !== params.userId) {
    throw new ApprovalError("not_requester")
  }
  if (current.status !== "pending") {
    throw new ApprovalError("request_not_pending")
  }

  const outcome = decideWithdrawOutcome({
    current: { status: current.status },
    now: new Date(),
  })
  const affected = await approvalsRepo.applyWithdraw(
    db,
    params.requestId,
    outcome.request.decidedAt,
  )
  if (affected === 0) throw new ApprovalError("request_not_pending")

  const updated = await approvalsRepo.findById(db, params.requestId)
  if (!updated) throw new Error("approval request vanished mid-withdraw")
  return updated
}

export interface RevokeTierParams {
  extensionId: string
  superAdminUserId: string
  note: string
}

export interface RevokeTierResult {
  extensionId: string
  revokedAt: Date
}

// Super-admin Revoke action from the detail page. Loads the extension,
// pre-checks that it's actually Official, then atomically clears tier +
// productLineId and writes the audit trio. The DB-level WHERE clause in
// applyRevocation re-checks officialTier IS NOT NULL so a concurrent
// revoke / re-approval loses the race and surfaces as
// `extension_not_official` rather than silently clobbering the row.
// Caller is expected to already be a super-admin (gated at the endpoint
// via requireSuperAdmin) — we don't re-check here for the same reason the
// reviewer-assign endpoint doesn't re-check its gate.
export async function revokeTier(
  params: RevokeTierParams,
): Promise<RevokeTierResult> {
  const db = useDb()
  const ext = await extensionsRepo.findById(db, params.extensionId)
  if (!ext) throw new ApprovalError("extension_not_found")
  if (!ext.officialTier) throw new ApprovalError("extension_not_official")

  const revokedAt = new Date()
  const affected = await db.transaction(async (tx) => {
    return approvalsRepo.applyRevocation(tx, params.extensionId, {
      revokedAt,
      revokedByUserId: params.superAdminUserId,
      revocationNote: params.note,
    })
  })
  if (affected === 0) throw new ApprovalError("extension_not_official")

  // Best-effort notification after commit; see submitRequest for rationale.
  await safeSend({
    name: "extension/tier.revoked",
    data: {
      extensionId: params.extensionId,
      revokedByUserId: params.superAdminUserId,
      revokedAt: revokedAt.toISOString(),
      note: params.note,
    },
  })

  return { extensionId: params.extensionId, revokedAt }
}

// Reviewer queue — pending requests in any cell this user covers.
// Super-admins get the full pending list; everyone else gets the
// JOIN-driven covered set (see `listPendingForUser`).
//
// Optional `filters` narrow the queue without changing the trust model:
// they're applied as in-memory predicates so a reviewer never queries
// outside their covered set. A filter that matches nothing yields [].
export interface ReviewerQueueFilters {
  tier?: OfficialTier
  subCat?: string
  productLineId?: string
  extensionCategory?: ExtensionCategory
}

export async function listReviewerQueue(
  userId: string,
  filters: ReviewerQueueFilters = {},
): Promise<approvalsRepo.ApprovalRequestRow[]> {
  const db = useDb()
  const rows = (await adminsRepo.isSuperAdmin(db, userId))
    ? await approvalsRepo.listAllPending(db)
    : await approvalsRepo.listPendingForUser(db, userId)

  return rows.filter((r) => {
    if (filters.tier && r.requestedTier !== filters.tier) return false
    if (filters.subCat && r.subCat !== filters.subCat) return false
    if (
      filters.productLineId &&
      r.productLineId !== filters.productLineId
    ) {
      return false
    }
    if (
      filters.extensionCategory &&
      r.extensionCategory !== filters.extensionCategory
    ) {
      return false
    }
    return true
  })
}

export async function listPublisherRequests(
  userId: string,
): Promise<approvalsRepo.ApprovalRequestRow[]> {
  return approvalsRepo.listForPublisher(useDb(), userId)
}
