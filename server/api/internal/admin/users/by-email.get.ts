import { eq } from "drizzle-orm"
import { z } from "zod"

import { users } from "~~/shared/db/schema"

// Super-admin user lookup by email — backs the "add reviewer" picker in
// the matrix UI. Returns `null` when the user doesn't exist so the
// client can show a "no such user" hint without a 404 round-trip.
const querySchema = z.object({
  email: z.string().trim().email(),
})

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const query = await getValidatedQuery(event, (raw) => querySchema.parse(raw))
  const [row] = await useDb()
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.email, query.email))
    .limit(1)
  return { user: row ?? null }
})
