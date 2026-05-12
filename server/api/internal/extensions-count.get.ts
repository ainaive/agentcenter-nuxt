import { count, eq } from "drizzle-orm"
import { extensions } from "~~/shared/db/schema"

export default defineEventHandler(async () => {
  const db = useDb()
  const [row] = await db
    .select({ value: count() })
    .from(extensions)
    .where(eq(extensions.visibility, "published"))
  return { count: row?.value ?? 0 }
})
