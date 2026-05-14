// Idempotent MCP-landscape seed.
//
// Safe to run on every deploy. Unlike scripts/seed.ts (which TRUNCATEs to
// produce a clean demo state), this script only upserts the static MCP
// landscape — taxonomy + tool rows + marketplace extension stubs the
// panorama links to. Re-running has no destructive effect on user data,
// other extensions, departments, tags, etc.
//
// Wired into the Vercel build via `vercel-build` so the panorama page
// always has data on a freshly deployed environment.
//
// Also imported by scripts/seed.ts so the demo seed and the standalone
// seed share one source of truth.

import { sql } from "drizzle-orm"
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import {
  INDUSTRY_SECTORS,
  MCP_TOOLS,
  PUBLIC_DOMAINS,
  ownerToParts,
} from "../shared/data/mcp-landscape"
import * as schema from "../shared/db/schema"
import {
  extensions,
  mcpDomains,
  mcpLandscapeTools,
  mcpPdts,
  mcpSectors,
  organizations,
} from "../shared/db/schema"

type Db = PostgresJsDatabase<typeof schema>

const SYSTEM_ORG_ID = "default"

/**
 * Upserts the static MCP landscape: a single owner org for the marketplace
 * stubs, the sector/domain/PDT taxonomy, the released-tool extension stubs,
 * and the landscape tool rows. Re-runnable; never destructive.
 */
export async function seedMcpLandscape(db: Db): Promise<void> {
  // Owner org for the marketplace extension stubs. We upsert by id so the
  // demo seed's `default` org (when present) is preserved verbatim, and a
  // fresh deploy can stand the row up on its own.
  await db
    .insert(organizations)
    .values({
      id: SYSTEM_ORG_ID,
      slug: SYSTEM_ORG_ID,
      name: "Default Organization",
      nameZh: "默认组织",
    })
    .onConflictDoNothing({ target: organizations.id })

  // Sectors.
  const sectorRows = INDUSTRY_SECTORS.map((s, i) => ({
    key: s.key,
    label: s.label,
    labelZh: s.labelZh,
    short: s.short,
    sortOrder: i,
  }))
  console.log(`seed-mcp: upserting ${sectorRows.length} sectors`)
  await db
    .insert(mcpSectors)
    .values(sectorRows)
    .onConflictDoUpdate({
      target: mcpSectors.key,
      set: {
        label: sql`excluded.label`,
        labelZh: sql`excluded.label_zh`,
        short: sql`excluded.short`,
        sortOrder: sql`excluded.sort_order`,
      },
    })

  // Domains.
  const domainRows = PUBLIC_DOMAINS.map((d, i) => ({
    key: d.key,
    label: d.label,
    labelZh: d.labelZh,
    short: d.short,
    sortOrder: i,
  }))
  console.log(`seed-mcp: upserting ${domainRows.length} domains`)
  await db
    .insert(mcpDomains)
    .values(domainRows)
    .onConflictDoUpdate({
      target: mcpDomains.key,
      set: {
        label: sql`excluded.label`,
        labelZh: sql`excluded.label_zh`,
        short: sql`excluded.short`,
        sortOrder: sql`excluded.sort_order`,
      },
    })

  // PDTs.
  const pdtRows = PUBLIC_DOMAINS.flatMap((d) =>
    d.pdts.map((p, i) => ({
      key: `${d.key}.${p.key}`,
      domainKey: d.key,
      label: p.label,
      labelZh: p.labelZh,
      sortOrder: i,
    })),
  )
  console.log(`seed-mcp: upserting ${pdtRows.length} PDTs`)
  await db
    .insert(mcpPdts)
    .values(pdtRows)
    .onConflictDoUpdate({
      target: mcpPdts.key,
      set: {
        domainKey: sql`excluded.domain_key`,
        label: sql`excluded.label`,
        labelZh: sql`excluded.label_zh`,
        sortOrder: sql`excluded.sort_order`,
      },
    })

  // Marketplace MCP extension stubs — one per released tool. `publisherUserId`
  // is left null on auto-seed so we don't require the demo creator rows; the
  // demo seed can override these afterwards if it runs.
  const releasedTools = MCP_TOOLS.filter((t) => t.released)
  const mcpExtRows = releasedTools.map((t) => ({
    id: `mcp-${t.slug}`,
    slug: t.slug,
    category: "mcp" as const,
    badge: null,
    scope: "enterprise" as const,
    funcCat: null,
    subCat: null,
    publisherUserId: null,
    ownerOrgId: SYSTEM_ORG_ID,
    deptId: null,
    iconEmoji: null,
    iconColor: null,
    visibility: "published" as const,
    name: t.name,
    nameZh: t.nameZh ?? null,
    tagline: t.blurb,
    taglineZh: t.blurbZh,
    description: t.blurb,
    descriptionZh: t.blurbZh,
    readmeMd: `# ${t.name}\n\nMCP server for **${t.name}** — ${t.blurb}.\n\n## Install\n\n\`\`\`bash\nagentcenter install ${t.slug}\n\`\`\`\n`,
    publishedAt: new Date(),
  }))
  console.log(`seed-mcp: upserting ${mcpExtRows.length} marketplace stubs`)
  await db
    .insert(extensions)
    .values(mcpExtRows)
    .onConflictDoUpdate({
      target: extensions.id,
      set: {
        slug: sql`excluded.slug`,
        category: sql`excluded.category`,
        scope: sql`excluded.scope`,
        ownerOrgId: sql`excluded.owner_org_id`,
        visibility: sql`excluded.visibility`,
        name: sql`excluded.name`,
        nameZh: sql`excluded.name_zh`,
        tagline: sql`excluded.tagline`,
        taglineZh: sql`excluded.tagline_zh`,
        description: sql`excluded.description`,
        descriptionZh: sql`excluded.description_zh`,
        readmeMd: sql`excluded.readme_md`,
        updatedAt: sql`now()`,
      },
    })

  // Landscape tool rows. extensionId is set for "released" tools, inDev for
  // those in development, otherwise the tool has no MCP and renders grey.
  const toolRows = MCP_TOOLS.map((t) => {
    const parts = ownerToParts(t.owner)
    return {
      slug: t.slug,
      name: t.name,
      nameZh: t.nameZh ?? null,
      layer: parts.layer,
      ownerSector: parts.layer === "industry" ? parts.primary : null,
      ownerDomain: parts.layer === "public" ? parts.primary : null,
      ownerPdt:
        parts.layer === "public" && parts.secondary
          ? `${parts.primary}.${parts.secondary}`
          : null,
      extensionId: t.released ? `mcp-${t.slug}` : null,
      inDev: t.inDev,
      depsCount: t.depsCount,
      blurb: t.blurb,
      blurbZh: t.blurbZh,
      tags: t.tags,
    }
  })
  console.log(`seed-mcp: upserting ${toolRows.length} landscape tools`)
  await db
    .insert(mcpLandscapeTools)
    .values(toolRows)
    .onConflictDoUpdate({
      target: mcpLandscapeTools.slug,
      set: {
        name: sql`excluded.name`,
        nameZh: sql`excluded.name_zh`,
        layer: sql`excluded.layer`,
        ownerSector: sql`excluded.owner_sector`,
        ownerDomain: sql`excluded.owner_domain`,
        ownerPdt: sql`excluded.owner_pdt`,
        extensionId: sql`excluded.extension_id`,
        inDev: sql`excluded.in_dev`,
        depsCount: sql`excluded.deps_count`,
        blurb: sql`excluded.blurb`,
        blurbZh: sql`excluded.blurb_zh`,
        tags: sql`excluded.tags`,
        updatedAt: sql`now()`,
      },
    })
}

// ─── Standalone entry-point: `bun scripts/seed-mcp-landscape.ts` ──────────────
async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error("seed-mcp: DATABASE_URL is not set")
    process.exit(1)
  }
  const client = postgres(url)
  const db = drizzle(client, { schema, casing: "snake_case" })

  console.log("seed-mcp: starting")
  await seedMcpLandscape(db)
  console.log("seed-mcp: done")
  await client.end()
}

// Bun-friendly check for "is this the entry script?" — true when invoked
// directly via `bun scripts/seed-mcp-landscape.ts`, false when imported.
// `Bun.main` and `import.meta.url` both work; pick the standard one.
const isEntry = import.meta.url === `file://${process.argv[1]}`
if (isEntry) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("seed-mcp: failed")
      console.error(err)
      process.exit(1)
    })
}
