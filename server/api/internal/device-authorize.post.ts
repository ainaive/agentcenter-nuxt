import { and, eq, gt } from "drizzle-orm"
import { z } from "zod"
import { sessions, verifications } from "~~/shared/db/schema/auth"

const bodySchema = z.object({
  userCode: z.string().trim().min(1).max(20),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readValidatedBody(event, (raw) => bodySchema.parse(raw))
  const userCode = body.userCode.toUpperCase()

  const db = useDb()
  const now = new Date()

  const [lookup] = await db
    .select({ id: verifications.id, value: verifications.value })
    .from(verifications)
    .where(
      and(
        eq(verifications.identifier, `dc:user:${userCode}`),
        gt(verifications.expiresAt, now),
      ),
    )
    .limit(1)

  if (!lookup) return { ok: false, error: "invalid_code" as const }

  const deviceCode = lookup.value
  const [pollRow] = await db
    .select({ id: verifications.id })
    .from(verifications)
    .where(
      and(
        eq(verifications.identifier, `dc:poll:${deviceCode}`),
        gt(verifications.expiresAt, now),
      ),
    )
    .limit(1)

  if (!pollRow) return { ok: false, error: "expired" as const }

  const cliToken = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  await db.insert(sessions).values({
    id: crypto.randomUUID(),
    userId: user.id,
    token: cliToken,
    expiresAt,
  })

  await db
    .update(verifications)
    .set({
      value: JSON.stringify({
        authorized: true,
        token: cliToken,
        userId: user.id,
      }),
    })
    .where(eq(verifications.id, pollRow.id))

  await db.delete(verifications).where(eq(verifications.id, lookup.id))

  return { ok: true as const }
})
