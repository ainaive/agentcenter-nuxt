import * as approvalsRepo from "~~/server/repositories/approvals"
import * as extensionsRepo from "~~/server/repositories/extensions"
import * as reviewersRepo from "~~/server/repositories/reviewers"
import {
  decideApprovalOutcome,
  decideWithdrawOutcome,
  type ApprovalAction,
  type OfficialTier,
} from "~~/shared/approvals/state"

import { useDb } from "./db"
import { inngest } from "./inngest"

// Orchestrators over the approvals/reviewers/extensions repositories. Pure
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

    return approvalsRepo.insertRequest(tx, {
      id: crypto.randomUUID(),
      extensionId: params.extensionId,
      requestedTier: params.requestedTier,
      subCat: params.subCat,
      productLineId: params.productLineId,
      requestedByUserId: params.userId,
      reason: params.reason ?? null,
    })
  })

  await inngest.send({
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

  // Super-admins can decide on any cell; otherwise the reviewer must be
  // assigned to the exact (requestedTier, subCat, productLineId?) cell this
  // request was filed against. Tier mismatches don't leak across cells.
  const allowed =
    (await reviewersRepo.isSuperAdmin(db, params.reviewerUserId)) ||
    (await approvalsRepo.isReviewerForCell(
      db,
      params.reviewerUserId,
      current.requestedTier,
      current.subCat,
      current.productLineId,
    ))
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

  await inngest.send({
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

// Reviewer queue — pending requests in any cell this user covers. Returns
// an empty array when the user has no cell assignments (and is not a
// super-admin); super-admins see the whole pending queue.
export async function listReviewerQueue(
  userId: string,
): Promise<approvalsRepo.ApprovalRequestRow[]> {
  const db = useDb()
  if (await reviewersRepo.isSuperAdmin(db, userId)) {
    // Treat super-admin as "assigned to every cell". Pulled from the matrix
    // verbatim so an empty matrix still surfaces no rows — better than a
    // silent firehose. Productline IS NULL is encoded as the literal '∅' in
    // the dedup key so a (company, cloud, null) cell doesn't collapse onto
    // (productLine, cloud, '') by accident.
    const cells = await reviewersRepo
      .listMatrix(db)
      .then((rows) =>
        Array.from(
          new Set(
            rows.map((r) => `${r.tier}:${r.subCat}:${r.productLineId ?? "∅"}`),
          ),
        ).map((k) => {
          const [tier, subCat, pl] = k.split(":") as [OfficialTier, string, string]
          return {
            tier,
            subCat,
            productLineId: pl === "∅" ? null : pl,
          }
        }),
      )
    return approvalsRepo.listPendingForCells(db, cells)
  }

  const cells = await reviewersRepo.listCellsForUser(db, userId)
  return approvalsRepo.listPendingForCells(db, cells)
}

export async function listPublisherRequests(
  userId: string,
): Promise<approvalsRepo.ApprovalRequestRow[]> {
  return approvalsRepo.listForPublisher(useDb(), userId)
}
