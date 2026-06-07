import { describe, expect, it } from "vitest"

import {
  decideApprovalOutcome,
  decideWithdrawOutcome,
  type ApprovalAction,
  type ApprovalStatus,
} from "./state"

const NOW = new Date("2026-06-07T12:00:00Z")
const REVIEWER = "user_reviewer"

describe("decideApprovalOutcome", () => {
  describe("approve", () => {
    it("stamps the request as approved and surfaces the requested tier on the extension", () => {
      const decision = decideApprovalOutcome({
        current: { status: "pending", requestedTier: "productLine" },
        action: { decision: "approve" },
        reviewerUserId: REVIEWER,
        now: NOW,
      })

      expect(decision.request).toEqual({
        status: "approved",
        decidedByUserId: REVIEWER,
        decidedAt: NOW,
        reviewerNote: null,
      })
      expect(decision.extension).toEqual({ officialTier: "productLine" })
    })

    it("propagates the requested tier (company) verbatim", () => {
      const decision = decideApprovalOutcome({
        current: { status: "pending", requestedTier: "company" },
        action: { decision: "approve" },
        reviewerUserId: REVIEWER,
        now: NOW,
      })
      expect(decision.extension).toEqual({ officialTier: "company" })
    })
  })

  describe("reject", () => {
    it("stamps the request as rejected with no extension update", () => {
      const decision = decideApprovalOutcome({
        current: { status: "pending", requestedTier: "company" },
        action: { decision: "reject" },
        reviewerUserId: REVIEWER,
        now: NOW,
      })

      expect(decision.request).toEqual({
        status: "rejected",
        decidedByUserId: REVIEWER,
        decidedAt: NOW,
        reviewerNote: null,
      })
      expect(decision.extension).toBeUndefined()
    })

    it("preserves a non-empty reviewer note", () => {
      const decision = decideApprovalOutcome({
        current: { status: "pending", requestedTier: "productLine" },
        action: { decision: "reject", note: "Missing maintainer contact." },
        reviewerUserId: REVIEWER,
        now: NOW,
      })
      expect(decision.request.reviewerNote).toBe("Missing maintainer contact.")
    })

    it("collapses a whitespace-only note to null", () => {
      const decision = decideApprovalOutcome({
        current: { status: "pending", requestedTier: "productLine" },
        action: { decision: "reject", note: "   \n  " },
        reviewerUserId: REVIEWER,
        now: NOW,
      })
      expect(decision.request.reviewerNote).toBeNull()
    })

    it("trims surrounding whitespace from the note", () => {
      const decision = decideApprovalOutcome({
        current: { status: "pending", requestedTier: "productLine" },
        action: { decision: "reject", note: "  needs a license file  " },
        reviewerUserId: REVIEWER,
        now: NOW,
      })
      expect(decision.request.reviewerNote).toBe("needs a license file")
    })
  })

  describe("guard", () => {
    const NON_PENDING: ApprovalStatus[] = ["approved", "rejected", "withdrawn"]
    const ACTIONS: ApprovalAction[] = [
      { decision: "approve" },
      { decision: "reject" },
    ]

    for (const status of NON_PENDING) {
      for (const action of ACTIONS) {
        it(`throws when status is '${status}' and action is '${action.decision}'`, () => {
          expect(() =>
            decideApprovalOutcome({
              current: { status, requestedTier: "productLine" },
              action,
              reviewerUserId: REVIEWER,
              now: NOW,
            }),
          ).toThrow(/cannot decide approval request in status/)
        })
      }
    }
  })
})

describe("decideWithdrawOutcome", () => {
  it("marks the request withdrawn at the given time", () => {
    const out = decideWithdrawOutcome({
      current: { status: "pending" },
      now: NOW,
    })
    expect(out.request).toEqual({ status: "withdrawn", decidedAt: NOW })
  })

  it("throws when the request is not pending", () => {
    for (const status of ["approved", "rejected", "withdrawn"] as const) {
      expect(() =>
        decideWithdrawOutcome({ current: { status }, now: NOW }),
      ).toThrow(/cannot withdraw approval request in status/)
    }
  })
})
