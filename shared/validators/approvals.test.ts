import { describe, expect, it } from "vitest"

import {
  APPROVAL_NOTE_MAX,
  APPROVAL_REASON_MAX,
  AssignAdminSchema,
  DecideApprovalSchema,
  ListApprovalsQuerySchema,
  OfficialTier,
  SubmitApprovalSchema,
  SUB_CAT_KEY_LIST,
  UnassignAdminSchema,
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
      productLineId: "wireless",
      reason: "Used by 5 teams across the product line.",
    })
    expect(parsed).toEqual({
      extensionId: "ext_1",
      requestedTier: "productLine",
      subCat: "softDev",
      productLineId: "wireless",
      reason: "Used by 5 teams across the product line.",
    })
  })

  it("rejects a productLine submission without productLineId", () => {
    expect(() =>
      SubmitApprovalSchema.parse({
        extensionId: "ext_1",
        requestedTier: "productLine",
        subCat: "softDev",
      }),
    ).toThrow(/productLineId/)
  })

  it("rejects a company submission that includes productLineId", () => {
    expect(() =>
      SubmitApprovalSchema.parse({
        extensionId: "ext_1",
        requestedTier: "company",
        subCat: "docs",
        productLineId: "wireless",
      }),
    ).toThrow(/productLineId/)
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

describe("AssignAdminSchema", () => {
  it("parses a macro-level company assignment", () => {
    expect(
      AssignAdminSchema.parse({
        extensionCategory: "skills",
        tier: "company",
        categoryLevel: "macro",
        categoryKey: "cloud",
        userId: "user_42",
      }),
    ).toEqual({
      extensionCategory: "skills",
      tier: "company",
      categoryLevel: "macro",
      categoryKey: "cloud",
      userId: "user_42",
    })
  })

  it("parses an All × productLine assignment with the wildcard key", () => {
    expect(
      AssignAdminSchema.parse({
        extensionCategory: "mcp",
        tier: "productLine",
        productLineId: "wireless",
        categoryLevel: "all",
        categoryKey: "*",
        userId: "user_42",
      }),
    ).toMatchObject({
      categoryLevel: "all",
      categoryKey: "*",
      productLineId: "wireless",
    })
  })

  it("parses a micro-level assignment with an l2 key", () => {
    expect(
      AssignAdminSchema.parse({
        extensionCategory: "slash",
        tier: "company",
        categoryLevel: "micro",
        categoryKey: "reqAnalysis",
        userId: "user_42",
      }),
    ).toMatchObject({ categoryLevel: "micro", categoryKey: "reqAnalysis" })
  })

  it("rejects an unknown extension category", () => {
    expect(() =>
      AssignAdminSchema.parse({
        extensionCategory: "cli",
        tier: "company",
        categoryLevel: "macro",
        categoryKey: "cloud",
        userId: "user_42",
      }),
    ).toThrow()
  })

  it("rejects a macro key that isn't an l1 leaf", () => {
    expect(() =>
      AssignAdminSchema.parse({
        extensionCategory: "skills",
        tier: "company",
        categoryLevel: "macro",
        categoryKey: "reqAnalysis", // l2, not l1
        userId: "user_42",
      }),
    ).toThrow(/categoryKey/)
  })

  it("rejects a micro key that isn't an l2 leaf", () => {
    expect(() =>
      AssignAdminSchema.parse({
        extensionCategory: "skills",
        tier: "company",
        categoryLevel: "micro",
        categoryKey: "systemDesign", // l1, not l2
        userId: "user_42",
      }),
    ).toThrow(/categoryKey/)
  })

  it("rejects an 'all' level paired with a non-wildcard key", () => {
    expect(() =>
      AssignAdminSchema.parse({
        extensionCategory: "skills",
        tier: "company",
        categoryLevel: "all",
        categoryKey: "softDev",
        userId: "user_42",
      }),
    ).toThrow(/categoryKey/)
  })

  it("rejects a productLine assignment without productLineId", () => {
    expect(() =>
      AssignAdminSchema.parse({
        extensionCategory: "skills",
        tier: "productLine",
        categoryLevel: "macro",
        categoryKey: "softDev",
        userId: "user_42",
      }),
    ).toThrow(/productLineId/)
  })

  it("rejects a company assignment that includes productLineId", () => {
    expect(() =>
      AssignAdminSchema.parse({
        extensionCategory: "skills",
        tier: "company",
        productLineId: "wireless",
        categoryLevel: "macro",
        categoryKey: "softDev",
        userId: "user_42",
      }),
    ).toThrow(/productLineId/)
  })

  it("rejects an unknown tier", () => {
    expect(() =>
      AssignAdminSchema.parse({
        extensionCategory: "skills",
        tier: "executive",
        categoryLevel: "macro",
        categoryKey: "cloud",
        userId: "user_42",
      }),
    ).toThrow()
  })
})

describe("UnassignAdminSchema", () => {
  it("requires a non-empty id", () => {
    expect(UnassignAdminSchema.parse({ id: "adm_1" })).toEqual({ id: "adm_1" })
    expect(() => UnassignAdminSchema.parse({ id: "" })).toThrow()
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
