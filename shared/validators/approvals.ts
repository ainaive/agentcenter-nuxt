import { z } from "zod"

import { FUNC_TAXONOMY } from "~~/shared/taxonomy"

// SubCat = the l1 leaf inside FUNC_TAXONOMY (e.g. "systemDesign",
// "softDev", "network", "embedded"). Flatten at module load so the
// validator runs O(1) without re-traversing the constant on each call.
const SUB_CAT_KEYS = new Set<string>(
  FUNC_TAXONOMY.flatMap((c) => c.l1.map((s) => s.key)),
)

export const SUB_CAT_KEY_LIST: readonly string[] = [
  ...FUNC_TAXONOMY.flatMap((c) => c.l1.map((s) => s.key)),
]

export const OfficialTier = z.enum(["productLine", "company"])
export type OfficialTier = z.infer<typeof OfficialTier>

const SubCatKey = z.string().refine((v) => SUB_CAT_KEYS.has(v), {
  message: "must be a key from FUNC_TAXONOMY",
})

export const APPROVAL_REASON_MAX = 500
export const APPROVAL_NOTE_MAX = 500

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined))

export const SubmitApprovalSchema = z.object({
  extensionId: z.string().trim().min(1),
  requestedTier: OfficialTier,
  subCat: SubCatKey,
  reason: optionalText(APPROVAL_REASON_MAX),
})
export type SubmitApprovalInput = z.infer<typeof SubmitApprovalSchema>

export const DecideApprovalSchema = z.object({
  requestId: z.string().trim().min(1),
  decision: z.enum(["approve", "reject"]),
  note: optionalText(APPROVAL_NOTE_MAX),
})
export type DecideApprovalInput = z.infer<typeof DecideApprovalSchema>

export const WithdrawApprovalSchema = z.object({
  requestId: z.string().trim().min(1),
})
export type WithdrawApprovalInput = z.infer<typeof WithdrawApprovalSchema>

export const AssignReviewerSchema = z.object({
  tier: OfficialTier,
  subCat: SubCatKey,
  userId: z.string().trim().min(1),
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
})
export type ListApprovalsQuery = z.infer<typeof ListApprovalsQuerySchema>
