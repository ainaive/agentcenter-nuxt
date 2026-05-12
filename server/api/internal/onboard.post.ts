import { eq } from "drizzle-orm"
import { z } from "zod"
import { findDept } from "~~/shared/data/departments"
import { users } from "~~/shared/db/schema/auth"

const bodySchema = z.object({
  deptId: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .refine((id) => findDept(id) !== null, { message: "Unknown department" }),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readValidatedBody(event, (raw) => bodySchema.parse(raw))

  const db = useDb()
  await db
    .update(users)
    .set({ defaultDeptId: body.deptId, updatedAt: new Date() })
    .where(eq(users.id, user.id))

  return { ok: true, deptId: body.deptId }
})
