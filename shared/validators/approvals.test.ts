import { describe, expect, it } from "vitest"

import {
  APPROVAL_NOTE_MAX,
  APPROVAL_REASON_MAX,
  AssignReviewerSchema,
  DecideApprovalSchema,
  ListApprovalsQuerySchema,
  OfficialTier,
  SubmitApprovalSchema,
  SUB_CAT_KEY_LIST,
  UnassignReviewerSchema,
  WithdrawApprovalSchema,
} from "./approvals"

describe("SUB_CAT_KEY_LIST", () => {
  it("includes the FUNC_TAXONOMY l1 keys", () => {
    // Spot-check one key per top-level category so the validator stays
    // grounded if FUNC_TAXONOMY ever drifts.
    expect(SUB_CAT_KEY_LIST).toContain("systemDesign")
    expect(SUB_CAT_KEY_LIST).toContain("network")
    expect(SUB_CAT_KEY_LIST).toContain("docs")
  })
})

describe("OfficialTier", () => {
  it("accepts productLine and company", () => {
    expect(OfficialTier.parse("productLine")).toBe("productLine")
    expect(OfficialTier.parse("company")).toBe("company")
  })

  it("rejects other strings", () => {
    expect(() => OfficialTier.parse("teamLead")).toThrow()
    expect(() => OfficialTier.parse("")).toThrow()
  })
})

describe("SubmitApprovalSchema", () => {
  it("parses a complete submission", () => {
    const parsed = SubmitApprovalSchema.parse({
      extensionId: "ext_1",
      requestedTier: "productLine",
      subCat: "softDev",
      reason: "Used by 5 teams across the product line.",
    })
    expect(parsed).toEqual({
      extensionId: "ext_1",
      requestedTier: "productLine",
      subCat: "softDev",
      reason: "Used by 5 teams across the product line.",
    })
  })

  it("collapses a whitespace-only reason to undefined", () => {
    const parsed = SubmitApprovalSchema.parse({
      extensionId: "ext_1",
      requestedTier: "company",
      subCat: "docs",
      reason: "   ",
    })
    expect(parsed.reason).toBeUndefined()
  })

  it("rejects a subCat that is not in FUNC_TAXONOMY", () => {
    expect(() =>
      SubmitApprovalSchema.parse({
        extensionId: "ext_1",
        requestedTier: "company",
        subCat: "unknownCat",
      }),
    ).toThrow(/FUNC_TAXONOMY/)
  })

  it("rejects an empty extensionId", () => {
    expect(() =>
      SubmitApprovalSchema.parse({
        extensionId: "  ",
        requestedTier: "company",
        subCat: "docs",
      }),
    ).toThrow()
  })

  it("rejects a reason longer than APPROVAL_REASON_MAX", () => {
    expect(() =>
      SubmitApprovalSchema.parse({
        extensionId: "ext_1",
        requestedTier: "company",
        subCat: "docs",
        reason: "x".repeat(APPROVAL_REASON_MAX + 1),
      }),
    ).toThrow()
  })
})

describe("DecideApprovalSchema", () => {
  it("parses an approve (no note key in the output)", () => {
    expect(
      DecideApprovalSchema.parse({
        requestId: "req_1",
        decision: "approve",
      }),
    ).toEqual({ requestId: "req_1", decision: "approve" })
  })

  it("parses a reject with a note", () => {
    const parsed = DecideApprovalSchema.parse({
      requestId: "req_1",
      decision: "reject",
      note: "Needs a maintainer.",
    })
    expect(parsed).toMatchObject({
      requestId: "req_1",
      decision: "reject",
      note: "Needs a maintainer.",
    })
  })

  it("parses a reject without a note", () => {
    const parsed = DecideApprovalSchema.parse({
      requestId: "req_1",
      decision: "reject",
    })
    expect(parsed).toMatchObject({
      requestId: "req_1",
      decision: "reject",
    })
  })

  it("rejects an unknown decision value", () => {
    expect(() =>
      DecideApprovalSchema.parse({
        requestId: "req_1",
        decision: "hold",
      }),
    ).toThrow()
  })

  it("rejects a note over APPROVAL_NOTE_MAX", () => {
    expect(() =>
      DecideApprovalSchema.parse({
        requestId: "req_1",
        decision: "reject",
        note: "x".repeat(APPROVAL_NOTE_MAX + 1),
      }),
    ).toThrow()
  })
})

describe("WithdrawApprovalSchema", () => {
  it("requires a non-empty requestId", () => {
    expect(WithdrawApprovalSchema.parse({ requestId: "req_1" })).toEqual({
      requestId: "req_1",
    })
    expect(() => WithdrawApprovalSchema.parse({ requestId: "" })).toThrow()
  })
})

describe("AssignReviewerSchema", () => {
  it("parses a full assignment", () => {
    expect(
      AssignReviewerSchema.parse({
        tier: "company",
        subCat: "cloud",
        userId: "user_42",
      }),
    ).toEqual({ tier: "company", subCat: "cloud", userId: "user_42" })
  })

  it("rejects an unknown subCat", () => {
    expect(() =>
      AssignReviewerSchema.parse({
        tier: "company",
        subCat: "unknownCat",
        userId: "user_42",
      }),
    ).toThrow()
  })

  it("rejects an unknown tier", () => {
    expect(() =>
      AssignReviewerSchema.parse({
        tier: "executive",
        subCat: "cloud",
        userId: "user_42",
      }),
    ).toThrow()
  })
})

describe("UnassignReviewerSchema", () => {
  it("requires a non-empty id", () => {
    expect(UnassignReviewerSchema.parse({ id: "rev_1" })).toEqual({ id: "rev_1" })
    expect(() => UnassignReviewerSchema.parse({ id: "" })).toThrow()
  })
})

describe("ListApprovalsQuerySchema", () => {
  it("defaults view to 'mine'", () => {
    expect(ListApprovalsQuerySchema.parse({})).toEqual({ view: "mine" })
  })

  it("accepts 'queue'", () => {
    expect(ListApprovalsQuerySchema.parse({ view: "queue" })).toEqual({
      view: "queue",
    })
  })

  it("rejects unknown views", () => {
    expect(() => ListApprovalsQuerySchema.parse({ view: "all" })).toThrow()
  })
})
