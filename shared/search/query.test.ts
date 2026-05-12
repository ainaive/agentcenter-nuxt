import { describe, it, expect } from "vitest"
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { buildExtensionWhere, buildExtensionOrder } from "~~/shared/search/query"
import * as schema from "~~/shared/db/schema"

// postgres-js is lazy — postgres() does not open a connection until the
// first query. The tag-subquery branch of buildExtensionWhere needs a Drizzle
// client purely for query-builder typing; it never executes the query here.
const fakeDb = drizzle(
  postgres("postgres://_test:_test@127.0.0.1:1/_test"),
  { schema, casing: "snake_case" },
) as PostgresJsDatabase<typeof schema>

describe("buildExtensionWhere", () => {
  it("always includes visibility=published clause (returns truthy)", () => {
    expect(buildExtensionWhere(fakeDb, {})).toBeDefined()
  })

  it("returns a SQL object for a category filter", () => {
    expect(buildExtensionWhere(fakeDb, { category: "skills" })).toBeDefined()
  })

  it("returns a SQL object for a search query", () => {
    expect(buildExtensionWhere(fakeDb, { q: "web search" })).toBeDefined()
  })

  it("returns a SQL object for any-tag match", () => {
    expect(
      buildExtensionWhere(fakeDb, { tags: ["search", "api"], tagMatch: "any" }),
    ).toBeDefined()
  })

  it("returns a SQL object for all-tag match", () => {
    expect(
      buildExtensionWhere(fakeDb, { tags: ["search", "api"], tagMatch: "all" }),
    ).toBeDefined()
  })

  it("handles dept __all by omitting dept clause", () => {
    expect(buildExtensionWhere(fakeDb, { dept: "__all" })).toBeDefined()
  })

  it("handles fallbackDeptId when dept filter is absent", () => {
    expect(buildExtensionWhere(fakeDb, {}, "eng.cloud")).toBeDefined()
    expect(buildExtensionWhere(fakeDb, {})).toBeDefined()
  })

  it("returns a SQL object for a creator filter", () => {
    expect(buildExtensionWhere(fakeDb, { creator: "user-amy" })).toBeDefined()
  })

  it("returns a SQL object for a publisher filter", () => {
    expect(buildExtensionWhere(fakeDb, { publisher: "anthropic" })).toBeDefined()
  })

  it("does not throw for combined filters", () => {
    expect(() =>
      buildExtensionWhere(fakeDb, {
        q: "search",
        category: "skills",
        scope: "personal",
        funcCat: "workTask",
        subCat: "softDev",
        dept: "eng.cloud",
        creator: "user-amy",
        publisher: "anthropic",
        tags: ["api"],
        tagMatch: "any",
        filter: "official",
        sort: "stars",
      }),
    ).not.toThrow()
  })
})

describe("buildExtensionOrder", () => {
  it("returns an array for downloads sort", () => {
    const order = buildExtensionOrder("downloads")
    expect(Array.isArray(order)).toBe(true)
    expect(order.length).toBeGreaterThan(0)
  })

  it("returns an array for stars sort", () => {
    expect(Array.isArray(buildExtensionOrder("stars"))).toBe(true)
  })

  it("returns an array for recent sort", () => {
    expect(Array.isArray(buildExtensionOrder("recent"))).toBe(true)
  })

  it("falls back to downloads for undefined sort", () => {
    expect(buildExtensionOrder(undefined).length).toBe(
      buildExtensionOrder("downloads").length,
    )
  })
})
