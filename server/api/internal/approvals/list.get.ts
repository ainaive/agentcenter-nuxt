import {
  listPublisherRequests,
  listReviewerQueue,
} from "~~/server/utils/approvals"
import { ListApprovalsQuerySchema } from "~~/shared/validators/approvals"

// Dual-purpose list: `?view=mine` returns the caller's submitted requests
// (publisher dashboard / profile Requests section); `?view=queue` returns
// pending requests the caller is assigned to review. Super-admins see the
// whole pending queue under `queue`.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const query = await getValidatedQuery(event, (raw) =>
    ListApprovalsQuerySchema.parse(raw),
  )

  if (query.view === "queue") {
    return { ok: true, requests: await listReviewerQueue(user.id) }
  }
  return { ok: true, requests: await listPublisherRequests(user.id) }
})
