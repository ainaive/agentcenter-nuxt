import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import type { H3Event } from "h3"

import {
  accounts,
  sessions,
  users,
  verifications,
} from "~~/shared/db/schema/auth"

function makeAuth() {
  const db = useDb()
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: users,
        session: sessions,
        account: accounts,
        verification: verifications,
      },
    }),
    emailAndPassword: { enabled: true },
    user: {
      additionalFields: {
        locale: {
          type: "string",
          required: false,
          defaultValue: "en",
          input: false,
        },
        themePreference: {
          type: "string",
          required: false,
          defaultValue: "ivory",
          input: false,
        },
        defaultDeptId: {
          type: "string",
          required: false,
          input: false,
        },
      },
    },
  })
}

type AuthInstance = ReturnType<typeof makeAuth>

let _auth: AuthInstance | undefined

export function useAuthServer(): AuthInstance {
  if (!_auth) _auth = makeAuth()
  return _auth
}

type SessionPayload = Awaited<
  ReturnType<AuthInstance["api"]["getSession"]>
>
export type SessionUser = NonNullable<SessionPayload>["user"]

function toFetchHeaders(raw: Record<string, string | string[] | undefined>): Headers {
  const headers = new Headers()
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined) continue
    headers.append(key, Array.isArray(value) ? value.join(", ") : value)
  }
  return headers
}

export async function getSessionUser(event: H3Event): Promise<SessionUser | null> {
  const auth = useAuthServer()
  const session = await auth.api.getSession({
    headers: toFetchHeaders(getRequestHeaders(event)),
  })
  return session?.user ?? null
}

export async function requireUser(event: H3Event): Promise<SessionUser> {
  const user = await getSessionUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthenticated" })
  }
  return user
}
