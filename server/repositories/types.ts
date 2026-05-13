import type { ExtractTablesWithRelations } from "drizzle-orm"
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core"

import type * as schema from "~~/shared/db/schema"

type Schema = typeof schema

// `Transactable` covers any concrete Drizzle Postgres database — both the
// production `postgres-js` driver and the PGlite driver used in integration
// tests — *and* an open transaction handle (`PgTransaction` extends
// `PgDatabase`). Repository functions accept this and never branch on the
// driver, so an orchestrator can pass either `useDb()` or a `tx` callback
// argument and the same repo code works for both.
export type Transactable = PgDatabase<
  PgQueryResultHKT,
  Schema,
  ExtractTablesWithRelations<Schema>
>
