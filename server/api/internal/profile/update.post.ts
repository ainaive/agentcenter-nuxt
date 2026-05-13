import { eq } from "drizzle-orm"
import { users } from "~~/shared/db/schema/auth"
import { ProfileFormSchema } from "~~/shared/validators/profile"

export default defineEventHandler(async (event) => {
  const session = await requireUser(event)
  const data = await readValidatedBody(event, (raw) => ProfileFormSchema.parse(raw))
  const db = useDb()

  await db
    .update(users)
    .set({
      name: data.name,
      defaultDeptId: data.defaultDeptId === "" ? null : data.defaultDeptId,
      bio: data.bio === "" ? null : data.bio,
    })
    .where(eq(users.id, session.id))

  return { ok: true as const }
})
