import { z } from "zod"

import { inngest } from "../inngest"

// Stub notifier for the approval workflow. v1 emits the events; this
// function logs them to the Inngest dev UI so the event surface is
// observable end-to-end without a real notification backend. Email and
// in-app fan-out are P1.

const requestedSchema = z.object({
  requestId: z.string().min(1),
  extensionId: z.string().min(1),
  requestedTier: z.enum(["productLine", "company"]),
  subCat: z.string().min(1),
  requesterUserId: z.string().min(1),
})

export const notifyApprovalRequested = inngest.createFunction(
  {
    id: "notify-approval-requested",
    triggers: [{ event: "extension/approval.requested" }],
  },
  async ({ event }) => {
    const parsed = requestedSchema.safeParse(event.data)
    if (!parsed.success) {
      console.error(
        "[notify-approval-requested] invalid event payload",
        parsed.error,
      )
      return { ok: false, reason: "invalid_event" }
    }
    // Real backend goes here. The logged shape is the contract the future
    // mailer will consume.
    console.info(
      "[approvals] new request",
      JSON.stringify({ event: "requested", ...parsed.data }),
    )
    return { ok: true }
  },
)

const decidedSchema = z.object({
  requestId: z.string().min(1),
  extensionId: z.string().min(1),
  decision: z.enum(["approved", "rejected"]),
  decidedByUserId: z.string().min(1),
})

export const notifyApprovalDecided = inngest.createFunction(
  {
    id: "notify-approval-decided",
    triggers: [{ event: "extension/approval.decided" }],
  },
  async ({ event }) => {
    const parsed = decidedSchema.safeParse(event.data)
    if (!parsed.success) {
      console.error(
        "[notify-approval-decided] invalid event payload",
        parsed.error,
      )
      return { ok: false, reason: "invalid_event" }
    }
    console.info(
      "[approvals] decision",
      JSON.stringify({ event: "decided", ...parsed.data }),
    )
    return { ok: true }
  },
)
