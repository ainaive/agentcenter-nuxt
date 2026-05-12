import { and, eq, gt } from "drizzle-orm"
import type { H3Event } from "h3"
import { sessions, users } from "~~/shared/db/schema/auth"

export type ApiUser = {
  id: string
  email: string
  name: string | null
  defaultDeptId: string | null
}

export async function authenticateBearerToken(event: H3Event): Promise<ApiUser | null> {
  const header = getRequestHeader(event, "authorization")
  if (!header?.startsWith("Bearer ")) return null
  const token = header.slice(7).trim()
  if (!token) return null

  const db = useDb()
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      defaultDeptId: users.defaultDeptId,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1)
  return row ?? null
}

export function apiError(
  event: H3Event,
  message: string,
  status: number,
  code?: string,
): never {
  setResponseStatus(event, status)
  throw createError({
    statusCode: status,
    statusMessage: code ?? "error",
    data: { error: code ?? "error", message },
  })
}
