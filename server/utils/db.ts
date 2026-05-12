import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "~~/shared/db/schema"

type Db = PostgresJsDatabase<typeof schema>

let _client: ReturnType<typeof postgres> | undefined
let _db: Db | undefined

export function useDb(): Db {
  if (_db) return _db
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL is not set")
  _client = postgres(url)
  _db = drizzle(_client, { schema, casing: "snake_case" }) as Db
  return _db
}
