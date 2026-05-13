import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { PGlite } from "@electric-sql/pglite"
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm"
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite"
import { migrate } from "drizzle-orm/pglite/migrator"

import * as schema from "~~/shared/db/schema"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DRIZZLE_DIR = resolve(__dirname, "../../../drizzle")
const FTS_SQL_PATH = resolve(DRIZZLE_DIR, "0002_fts_search_vector.sql")

export type TestDb = PgliteDatabase<typeof schema>

export interface TestDbHandle {
  db: TestDb
  cleanup: () => Promise<void>
}

// Boots an in-memory PGlite, applies every Drizzle-tracked migration, and
// then layers the manually-authored FTS SQL on top (that file is not part of
// drizzle/meta/_journal.json, so the migrator skips it). Returns a fresh
// schema per call — call `cleanup()` from `afterAll` to release the WASM
// instance.
export async function setupDb(): Promise<TestDbHandle> {
  const client = new PGlite({ extensions: { pg_trgm } })
  const db = drizzle(client, { schema, casing: "snake_case" })

  await migrate(db, { migrationsFolder: DRIZZLE_DIR })

  const ftsSql = readFileSync(FTS_SQL_PATH, "utf-8")
  await client.exec(ftsSql)

  return {
    db,
    cleanup: async () => {
      await client.close()
    },
  }
}
