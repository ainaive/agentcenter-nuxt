import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

import { defineConfig } from "drizzle-kit"

const envPath = resolve(".env")
if (existsSync(envPath)) {
  const content = readFileSync(envPath, "utf-8")
  for (const line of content.split("\n")) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "")
    }
  }
}

export default defineConfig({
  schema: "./shared/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  casing: "snake_case",
  verbose: true,
  strict: true,
})
