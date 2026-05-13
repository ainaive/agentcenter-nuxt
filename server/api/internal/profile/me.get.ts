import { eq } from "drizzle-orm"
import { users } from "~~/shared/db/schema/auth"
import { getProfileStats, type ProfileStats } from "~~/server/utils/queries/profile"

export interface MeResponse {
  user: {
    id: string
    email: string
    name: string | null
    bio: string | null
    defaultDeptId: string | null
    createdAt: string
  }
  stats: ProfileStats
}

export default defineEventHandler(async (event): Promise<MeResponse> => {
  const session = await requireUser(event)
  const db = useDb()
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      bio: users.bio,
      defaultDeptId: users.defaultDeptId,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, session.id))
    .limit(1)
  if (!row) throw createError({ statusCode: 404, statusMessage: "user_not_found" })

  const stats = await getProfileStats(session.id)
  return {
    user: {
      id: row.id,
      email: row.email,
      name: row.name,
      bio: row.bio,
      defaultDeptId: row.defaultDeptId,
      createdAt: row.createdAt.toISOString(),
    },
    stats,
  }
})
