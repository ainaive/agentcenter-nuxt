import { z } from "zod"

import {
  ALL_L1_KEYS,
  ALL_L2_KEYS,
  type CategoryLevel,
} from "~~/shared/taxonomy"

const L1_KEY_SET = new Set<string>(ALL_L1_KEYS)
const L2_KEY_SET = new Set<string>(ALL_L2_KEYS)

// `SUB_CAT_KEY_LIST` is the source of truth for the publisher subCat picker
// and the request-row validator — same set as `ALL_L1_KEYS`, just re-exported
// under the historical name so the matrix UI and the publish dialog stay
// in lockstep.
export const SUB_CAT_KEY_LIST: readonly string[] = ALL_L1_KEYS

export const OfficialTier = z.enum(["productLine", "company"])
export type OfficialTier = z.infer<typeof OfficialTier>

export const SubCatKey = z.string().refine((v) => L1_KEY_SET.has(v), {
  message: "must be a key from FUNC_TAXONOMY",
})

export const ExtensionCategory = z.enum(["skills", "mcp", "slash", "plugins", "cli"])
export type ExtensionCategory = z.infer<typeof ExtensionCategory>

export const AdminCategoryLevel = z.enum(["all", "macro", "micro"])
export type AdminCategoryLevel = CategoryLevel

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

// Matrix admin assignment — five coordinates. Replaces the 3-coord
// pre-redesign shape. Refines on top of the level/key keyspace and the
// productLineId iff-rule:
//   - level='all' → key='*'
//   - level='macro' → key is an l1 leaf
//   - level='micro' → key is an l2 leaf
//   - productLineId is required iff tier='productLine'
// Both refines surface as Zod errors so the endpoint can render a useful
// message instead of bouncing the raw 23514 from Postgres.
export const AssignAdminSchema = z
  .object({
    extensionCategory: ExtensionCategory,
    tier: OfficialTier,
    productLineId: ProductLineId.optional(),
    categoryLevel: AdminCategoryLevel,
    categoryKey: z.string().trim().min(1).max(40),
    userId: z.string().trim().min(1),
  })
  .refine((v) => requireProductLineIff(v, "tier"), {
    path: ["productLineId"],
    message: "productLineId is required iff tier=productLine",
  })
  .refine(
    (v) => {
      if (v.categoryLevel === "all") return v.categoryKey === "*"
      if (v.categoryLevel === "macro") return L1_KEY_SET.has(v.categoryKey)
      return L2_KEY_SET.has(v.categoryKey)
    },
    {
      path: ["categoryKey"],
      message:
        "categoryKey must be '*' for level=all, an l1 key for level=macro, or an l2 key for level=micro",
    },
  )
export type AssignAdminInput = z.infer<typeof AssignAdminSchema>

export const UnassignAdminSchema = z.object({
  id: z.string().trim().min(1),
})
export type UnassignAdminInput = z.infer<typeof UnassignAdminSchema>

export const ListApprovalsQuerySchema = z.object({
  // "mine"  → requests this user submitted as a publisher
  // "queue" → pending requests routed to this user as a reviewer
  view: z.enum(["mine", "queue"]).default("mine"),
  // Reviewer-queue narrowing keys. Reused from the cell-shape validators
  // above so the queue picker stays in lockstep with the publisher dialog
  // and the listing rail.
  tier: OfficialTier.optional(),
  subCat: SubCatKey.optional(),
  productLineId: ProductLineId.optional(),
  extensionCategory: ExtensionCategory.optional(),
})
export type ListApprovalsQuery = z.infer<typeof ListApprovalsQuerySchema>
