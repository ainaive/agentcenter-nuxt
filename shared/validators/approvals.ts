import { z } from "zod"

import { FUNC_TAXONOMY } from "~~/shared/taxonomy"

// SubCat = the l1 leaf inside FUNC_TAXONOMY (e.g. "systemDesign",
// "softDev", "network", "embedded"). Flatten at module load so the
// validator runs O(1) without re-traversing the constant on each call.
// `SUB_CAT_KEY_LIST` is derived from the Set so the two stay in sync.
const SUB_CAT_KEYS = new Set<string>(
  FUNC_TAXONOMY.flatMap((c) => c.l1.map((s) => s.key)),
)

export const SUB_CAT_KEY_LIST: readonly string[] = [...SUB_CAT_KEYS]

export const OfficialTier = z.enum(["productLine", "company"])
export type OfficialTier = z.infer<typeof OfficialTier>

export const SubCatKey = z.string().refine((v) => SUB_CAT_KEYS.has(v), {
  message: "must be a key from FUNC_TAXONOMY",
})

// Product-line ids are seeded text PKs in kebab-case (wireless, datacom,
// terminals, cloud as of 0009). Validate the shape here; the DB FK + CHECK
// constraint enforces membership and the iff-rule against the actual tier.
export const ProductLineId = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[a-z][a-z0-9-]*$/, {
    message: "must be a kebab-case product-line id",
  })
export type ProductLineId = z.infer<typeof ProductLineId>

// iff-rule helpers — the DB CHECK is the source of truth, but surfacing
// the rule at the validator layer turns a bad request into a typed Zod
// error instead of a generic 23514 from Postgres.
const requireProductLineIff = <T extends {
  tier?: OfficialTier
  requestedTier?: OfficialTier
  productLineId?: string | undefined
}>(
  v: T,
  tierKey: "tier" | "requestedTier",
): boolean => {
  const tier = v[tierKey]
  const hasPl = !!v.productLineId
  if (tier === "productLine") return hasPl
  if (tier === "company") return !hasPl
  return true
}

export const APPROVAL_REASON_MAX = 500
export const APPROVAL_NOTE_MAX = 500
export const REVOKE_NOTE_MAX = 500

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined))

export const SubmitApprovalSchema = z
  .object({
    extensionId: z.string().trim().min(1),
    requestedTier: OfficialTier,
    subCat: SubCatKey,
    productLineId: ProductLineId.optional(),
    reason: optionalText(APPROVAL_REASON_MAX),
  })
  .refine((v) => requireProductLineIff(v, "requestedTier"), {
    path: ["productLineId"],
    message: "productLineId is required iff requestedTier=productLine",
  })
export type SubmitApprovalInput = z.infer<typeof SubmitApprovalSchema>

// Discriminated union: a reviewer note only makes sense on a rejection.
// The orchestrator drops any note sent with an approve action anyway —
// making that explicit at the API boundary catches the mistake before
// it crosses the wire instead of silently after.
export const DecideApprovalSchema = z.discriminatedUnion("decision", [
  z.object({
    requestId: z.string().trim().min(1),
    decision: z.literal("approve"),
  }),
  z.object({
    requestId: z.string().trim().min(1),
    decision: z.literal("reject"),
    note: optionalText(APPROVAL_NOTE_MAX),
  }),
])
export type DecideApprovalInput = z.infer<typeof DecideApprovalSchema>

export const WithdrawApprovalSchema = z.object({
  requestId: z.string().trim().min(1),
})
export type WithdrawApprovalInput = z.infer<typeof WithdrawApprovalSchema>

// Super-admin Revoke action from the detail page. The note is REQUIRED
// (mirrors the existing reject flow) — the publisher dashboard surfaces
// it directly so a missing note would leave the publisher in the dark.
// `.trim().min(1)` enforces "non-empty after trim" so whitespace-only
// submissions are caught at the validator boundary.
export const RevokeTierSchema = z.object({
  extensionId: z.string().trim().min(1),
  note: z.string().trim().min(1).max(REVOKE_NOTE_MAX),
})
export type RevokeTierInput = z.infer<typeof RevokeTierSchema>

export const AssignReviewerSchema = z
  .object({
    tier: OfficialTier,
    subCat: SubCatKey,
    productLineId: ProductLineId.optional(),
    userId: z.string().trim().min(1),
  })
  .refine((v) => requireProductLineIff(v, "tier"), {
    path: ["productLineId"],
    message: "productLineId is required iff tier=productLine",
  })
export type AssignReviewerInput = z.infer<typeof AssignReviewerSchema>

export const UnassignReviewerSchema = z.object({
  id: z.string().trim().min(1),
})
export type UnassignReviewerInput = z.infer<typeof UnassignReviewerSchema>

export const ListApprovalsQuerySchema = z.object({
  // "mine"  → requests this user submitted as a publisher
  // "queue" → pending requests routed to this user as a reviewer
  view: z.enum(["mine", "queue"]).default("mine"),
  // Reviewer-queue narrowing keys. Reused from the cell-shape validators
  // above so the queue picker stays in lockstep with the publisher dialog
  // and the listing rail. No iff-rule between tier and productLineId here:
  // a reviewer can legitimately narrow to "any Wireless requests" across
  // every subCat without being forced to pick a tier first.
  tier: OfficialTier.optional(),
  subCat: SubCatKey.optional(),
  productLineId: ProductLineId.optional(),
})
export type ListApprovalsQuery = z.infer<typeof ListApprovalsQuerySchema>
