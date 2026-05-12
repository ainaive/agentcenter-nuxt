import { and, eq, gt } from "drizzle-orm"
import { z } from "zod"
import { verifications } from "~~/shared/db/schema/auth"

const PollBody = z.object({ deviceCode: z.string().uuid() })
const stateSchema = z.object({
  authorized: z.boolean(),
  token: z.string().nullable(),
})

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

  const parsed = stateSchema.safeParse(JSON.parse(row.value))
  if (!parsed.success) {
    console.error("[device/poll] malformed verification value", parsed.error)
    return { status: "expired" }
  }
  if (!parsed.data.authorized) return { status: "pending" }

  try {
    await db.delete(verifications).where(eq(verifications.id, row.id))
  } catch (err) {
    console.error("[device/poll] cleanup delete failed", err)
  }
  return { status: "authorized", token: parsed.data.token }
})
