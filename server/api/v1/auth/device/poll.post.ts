import { and, eq, gt } from "drizzle-orm"
import { z } from "zod"
import { verifications } from "~~/shared/db/schema/auth"

const PollBody = z.object({ deviceCode: z.string().uuid() })

export default defineEventHandler(async (event) => {
  let body: z.infer<typeof PollBody>
  try {
    body = PollBody.parse(await readBody(event))
  } catch {
    apiError(event, "Invalid request body.", 400, "invalid_body")
  }

  const db = useDb()
  const [row] = await db
    .select({ id: verifications.id, value: verifications.value })
    .from(verifications)
    .where(
      and(
        eq(verifications.identifier, `dc:poll:${body.deviceCode}`),
        gt(verifications.expiresAt, new Date()),
      ),
    )
    .limit(1)

  if (!row) return { status: "expired" }

  const state = JSON.parse(row.value) as { authorized: boolean; token: string | null }
  if (!state.authorized) return { status: "pending" }

  await db.delete(verifications).where(eq(verifications.id, row.id))
  return { status: "authorized", token: state.token }
})
