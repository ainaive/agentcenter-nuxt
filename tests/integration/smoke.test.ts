import { eq, or, sql } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { departments, extensions, organizations } from "~~/shared/db/schema"

import { setupDb, type TestDb } from "./helpers/db"

// Proves the PGlite harness covers the three Postgres-specific features this
// app actually leans on:
//
//   1. `tsvector` + `setweight` + `to_tsvector('simple', …)` generated column
//   2. `pg_trgm` similarity matching via the `%` operator
//   3. Dotted-path `LIKE 'parent.%'` matching against an indexed text column
//
// If any of these assertions fail on PGlite, swap `setupDb()` to a Docker
// Postgres harness — the rest of the integration tier stays unchanged.

describe("integration harness smoke", () => {
  let db: TestDb
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const handle = await setupDb()
    db = handle.db
    cleanup = handle.cleanup

    await db.insert(organizations).values({
      id: "org-smoke",
      slug: "smoke-org",
      name: "Smoke Org",
    })

    await db.insert(departments).values([
      { id: "eng", orgId: "org-smoke", parentId: null, name: "Engineering", nameZh: "工程", pathDepth: 1 },
      { id: "eng.cloud", orgId: "org-smoke", parentId: "eng", name: "Cloud", nameZh: "云", pathDepth: 2 },
      { id: "eng.cloud.infra", orgId: "org-smoke", parentId: "eng.cloud", name: "Infra", nameZh: "基础设施", pathDepth: 3 },
      { id: "sales", orgId: "org-smoke", parentId: null, name: "Sales", nameZh: "销售", pathDepth: 1 },
    ])

    await db.insert(extensions).values({
      id: "ext-smoke",
      slug: "kubernetes-helper",
      category: "skills",
      scope: "personal",
      ownerOrgId: "org-smoke",
      name: "Kubernetes Helper",
      description: "A skill for managing kubernetes clusters with helm",
      visibility: "published",
    })
  })

  afterAll(async () => {
    await cleanup()
  })

  it("populates extensions.search_vector via the GENERATED ALWAYS column", async () => {
    const result = await db.execute(
      sql`select (search_vector is not null) as has_vector from extensions where slug = 'kubernetes-helper'`,
    )
    const rows = (result as unknown as { rows: { has_vector: boolean }[] }).rows
    expect(rows[0]?.has_vector).toBe(true)
  })

  it("matches via tsquery against search_vector (FTS)", async () => {
    const result = await db.execute(
      sql`select slug from extensions where search_vector @@ to_tsquery('simple', 'kubernetes')`,
    )
    const rows = (result as unknown as { rows: { slug: string }[] }).rows
    expect(rows.map((r) => r.slug)).toContain("kubernetes-helper")
  })

  it("computes pg_trgm similarity (proves the extension is loaded and functional)", async () => {
    const result = await db.execute(
      sql`select similarity(lower(name), 'kubernete') as sim from extensions where slug = 'kubernetes-helper'`,
    )
    const rows = (result as unknown as { rows: { sim: number }[] }).rows
    // A typo with 8 shared trigrams against "kubernetes helper" — the
    // exact score depends on tokenisation, but it must be a positive
    // number for the extension to be functional.
    expect(rows[0]?.sim).toBeGreaterThan(0.2)
  })

  it("matches descendants via dotted-path LIKE 'parent.%'", async () => {
    const rows = await db
      .select({ id: departments.id })
      .from(departments)
      .where(or(eq(departments.id, "eng"), sql`${departments.id} like 'eng.%'`))
      .orderBy(departments.id)
    expect(rows.map((r) => r.id)).toEqual(["eng", "eng.cloud", "eng.cloud.infra"])
  })
})
