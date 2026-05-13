import { and, desc, eq, ilike, inArray, like, or, sql, type SQL, type ExtractTablesWithRelations } from "drizzle-orm"
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core"

import { MY_DEPT_ID } from "~~/shared/data/departments"
import type * as schema from "~~/shared/db/schema"
import { extensions, extensionTags } from "~~/shared/db/schema"
import type { Filters } from "~~/shared/validators/filters"

const ALL_DEPTS = "__all"

// Driver-agnostic: matches postgres-js, PGlite, and PgTransaction so the
// query builder composes with the repository layer's `Transactable`.
type Db = PgDatabase<
  PgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>

export function buildExtensionWhere(
  db: Db,
  filters: Filters,
  fallbackDeptId?: string,
): SQL | undefined {
  const clauses = [
    eq(extensions.visibility, "published"),

    filters.category ? eq(extensions.category, filters.category) : undefined,
    filters.scope ? eq(extensions.scope, filters.scope) : undefined,
    filters.funcCat ? eq(extensions.funcCat, filters.funcCat) : undefined,
    filters.subCat ? eq(extensions.subCat, filters.subCat) : undefined,
    filters.l2 ? eq(extensions.l2, filters.l2) : undefined,

    filters.creator
      ? eq(extensions.publisherUserId, filters.creator)
      : undefined,
    filters.publisher
      ? eq(extensions.ownerOrgId, filters.publisher)
      : undefined,

    (() => {
      const dept = filters.dept ?? fallbackDeptId ?? MY_DEPT_ID
      if (dept === ALL_DEPTS) return undefined
      return or(
        eq(extensions.deptId, dept),
        like(extensions.deptId, `${dept}.%`),
      )
    })(),

    filters.filter === "trending"
      ? sql`${extensions.downloadsCount} > 50000`
      : undefined,
    filters.filter === "new" ? eq(extensions.badge, "new") : undefined,
    filters.filter === "official"
      ? eq(extensions.badge, "official")
      : undefined,
    filters.filter === "free"
      ? sql`${extensions.licenseSpdx} IS NOT NULL`
      : undefined,

    filters.q
      ? or(
          sql`${extensions.searchVector} @@ websearch_to_tsquery('simple', ${filters.q})`,
          ilike(extensions.name, `%${filters.q}%`),
          ilike(extensions.nameZh, `%${filters.q}%`),
        )
      : undefined,

    filters.tags && filters.tags.length > 0
      ? inArray(
          extensions.id,
          db
            .select({ id: extensionTags.extensionId })
            .from(extensionTags)
            .where(inArray(extensionTags.tagId, filters.tags))
            .groupBy(extensionTags.extensionId)
            .having(
              filters.tagMatch === "all"
                ? sql`count(*) = ${filters.tags.length}`
                : sql`count(*) >= 1`,
            ),
        )
      : undefined,
  ].filter((c): c is SQL => Boolean(c))

  return clauses.length > 0 ? and(...clauses) : undefined
}

export function buildExtensionOrder(sort: Filters["sort"]) {
  switch (sort) {
    case "stars":
      return [desc(extensions.starsAvg), desc(extensions.downloadsCount)]
    case "recent":
      return [desc(extensions.publishedAt), desc(extensions.createdAt)]
    case "downloads":
    default:
      return [desc(extensions.downloadsCount)]
  }
}
