import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { createError, getRequestHeaders, type H3Event } from "h3"

import type { OfficialTier } from "~~/shared/approvals/state"

import {
  findCoveringAdmin,
  isSuperAdmin,
} from "~~/server/repositories/admins"
import {
  accounts,
  sessions,
  users,
  verifications,
} from "~~/shared/db/schema/auth"
import type { CategoryLevel } from "~~/shared/taxonomy"
import type { ExtensionCategory } from "~~/shared/types"

import { useDb } from "./db"

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

// Super-admin gate for the reviewer-matrix admin surface. Returns the
// session user when they hold any membership with role='superAdmin';
// throws 401 when unauthenticated and 403 otherwise. The membership
// lookup goes through the admins repo so the policy lives in one
// place — see `server/repositories/admins.ts`.
export async function requireSuperAdmin(event: H3Event): Promise<SessionUser> {
  const user = await requireUser(event)
  if (!(await isSuperAdmin(useDb(), user.id))) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" })
  }
  return user
}

// Cell-aware authorisation for matrix edits, redesigned around the
// 5-coord cell key. Encodes ADR-0001's 2026-06-09b redesign:
//   - super-admins can edit every cell;
//   - any user who holds an admin row whose covered shadow includes
//     the target cell can edit it. Coverage is the 2-dim cover
//     relation: (T,C) ⊇ (T',C') AND (L,K) ⊇ (L',K'), where ⊇ on the
//     column-tier axis is "company covers all PLs (and itself)" and
//     ⊇ on the category axis is the all → macro → micro ancestor walk.
// Callers pass the target cell explicitly — for `unassign`, load the
// target row first so the gate authorises against that row's coordinates
// rather than the caller's request body.
export async function requireCellAdmin(
  event: H3Event,
  cell: {
    extensionCategory: ExtensionCategory
    tier: OfficialTier
    productLineId: string | null
    categoryLevel: CategoryLevel
    categoryKey: string
  },
): Promise<SessionUser> {
  const user = await requireUser(event)
  const db = useDb()
  if (await isSuperAdmin(db, user.id)) return user
  if (await findCoveringAdmin(db, user.id, cell)) return user
  throw createError({ statusCode: 403, statusMessage: "not_authorized" })
}
