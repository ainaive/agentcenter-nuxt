import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { createError, getRequestHeaders, type H3Event } from "h3"

import type { OfficialTier } from "~~/shared/approvals/state"

import {
  isCompanyAdminForSubCat,
  isSuperAdmin,
} from "~~/server/repositories/reviewers"
import {
  accounts,
  sessions,
  users,
  verifications,
} from "~~/shared/db/schema/auth"

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
// lookup goes through the reviewers repo so the policy lives in one
// place — see `server/repositories/reviewers.ts`.
export async function requireSuperAdmin(event: H3Event): Promise<SessionUser> {
  const user = await requireUser(event)
  if (!(await isSuperAdmin(useDb(), user.id))) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" })
  }
  return user
}

// Cell-aware authorisation for matrix edits. Encodes the delegation rule
// from ADR-0001 (2026-06-08 addendum):
//   - super-admins can edit every cell;
//   - company-tier admins of subCat X may manage productLine cells of
//     subCat X (any productLine);
//   - company-tier cells stay super-admin-only.
// Callers pass the cell coordinates explicitly — for `unassign`, load the
// target row first so the gate authorises against that row's coordinates
// rather than the caller's request body.
export async function requireCellAdmin(
  event: H3Event,
  cell: { tier: OfficialTier; subCat: string; productLineId: string | null },
): Promise<SessionUser> {
  const user = await requireUser(event)
  const db = useDb()
  if (await isSuperAdmin(db, user.id)) return user
  if (
    cell.tier === "productLine" &&
    (await isCompanyAdminForSubCat(db, user.id, cell.subCat))
  ) {
    return user
  }
  throw createError({ statusCode: 403, statusMessage: "not_authorized" })
}
