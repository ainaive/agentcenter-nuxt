// Idempotent MCP-landscape seed.
//
// Safe to run on every deploy. Unlike scripts/seed.ts (which TRUNCATEs to
// produce a clean demo state), this script only upserts the static MCP
// landscape — taxonomy + tool rows + per-MCP rows + marketplace extension
// stubs the panorama links to. Re-running has no destructive effect on user
// data, other extensions, departments, tags, etc.
//
// Wired into the Vercel build via `vercel-build` so the panorama page
// always has data on a freshly deployed environment.
//
// Also imported by scripts/seed.ts so the demo seed and the standalone
// seed share one source of truth.

import { and, eq, notInArray, sql } from "drizzle-orm"
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
  mcpLandscapeMcps,
  mcpLandscapeTools,
  mcpPdts,
  mcpSectors,
  organizations,
} from "../shared/db/schema"

type Db = PostgresJsDatabase<typeof schema>

const SYSTEM_ORG_ID = "default"

/**
 * Upserts the static MCP landscape: a single owner org for the marketplace
 * stubs, the sector/domain/PDT taxonomy, the per-MCP extension stubs, the
 * landscape tool rows, and the per-MCP rows. Re-runnable; never destructive.
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

  // Marketplace MCP extension stubs — one per released MCP across all tools.
  // The extension's name/blurb mirror the MCP (not the parent tool) so the
  // marketplace listing reads coherently. For tools where the MCP doesn't
  // carry its own name, fall back to the tool's display name.
  const releasedMcpRows = MCP_TOOLS.flatMap((t) =>
    t.mcps
      .filter((m) => m.released)
      .map((m) => ({ tool: t, mcp: m })),
  )
  const mcpExtRows = releasedMcpRows.map(({ mcp: m }) => {
    // MCPs are identified by their slug — that's the canonical display label
    // across the marketplace listing, the panorama tile, and the detail panel.
    const name = m.name ?? m.slug
    const nameZh = m.nameZh ?? null
    return {
      id: `mcp-${m.slug}`,
      slug: m.slug,
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
      name,
      nameZh,
      tagline: m.blurb,
      taglineZh: m.blurbZh,
      description: m.blurb,
      descriptionZh: m.blurbZh,
      readmeMd: `# ${name}\n\nMCP server for **${name}** — ${m.blurb}.\n\n## Install\n\n\`\`\`bash\nagentcenter install ${m.slug}\n\`\`\`\n`,
      publishedAt: new Date(),
    }
  })
  console.log(`seed-mcp: upserting ${mcpExtRows.length} marketplace stubs`)
  if (mcpExtRows.length > 0) {
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
  }

  // Landscape tool rows — the *product* headers. No per-MCP fields here.
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
      blurb: t.blurb,
      blurbZh: t.blurbZh,
    }
  })
  console.log(`seed-mcp: upserting ${toolRows.length} landscape tools`)
  const upsertedTools = await db
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
        blurb: sql`excluded.blurb`,
        blurbZh: sql`excluded.blurb_zh`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ id: mcpLandscapeTools.id, slug: mcpLandscapeTools.slug })

  const toolIdBySlug = new Map(upsertedTools.map((r) => [r.slug, r.id]))

  // Per-MCP rows. Each MCP belongs to exactly one tool (via toolId) and
  // carries the per-MCP status fields, deps, tags, and marketplace link.
  const mcpRows = MCP_TOOLS.flatMap((t) => {
    const toolId = toolIdBySlug.get(t.slug)
    if (toolId === undefined) {
      throw new Error(`seed-mcp: missing tool id for slug "${t.slug}"`)
    }
    return t.mcps.map((m, i) => ({
      toolId,
      slug: m.slug,
      name: m.name ?? m.slug,
      nameZh: m.nameZh ?? null,
      extensionId: m.released ? `mcp-${m.slug}` : null,
      inDev: m.inDev,
      depsCount: m.depsCount,
      blurb: m.blurb,
      blurbZh: m.blurbZh,
      tags: m.tags,
      sortOrder: i,
    }))
  })
  // Prune MCPs whose slug is no longer in the canonical inventory — covers
  // the case where the seed renames or removes an MCP between deploys. We
  // do this BEFORE the upsert so the FK from extensions stays consistent;
  // mcps with extensionId set to a stub we're about to drop will null out
  // via the existing `onDelete: 'set null'` rule on the FK.
  const desiredMcpSlugs = mcpRows.map((r) => r.slug)
  if (desiredMcpSlugs.length > 0) {
    const stale = await db
      .delete(mcpLandscapeMcps)
      .where(notInArray(mcpLandscapeMcps.slug, desiredMcpSlugs))
      .returning({ slug: mcpLandscapeMcps.slug })
    if (stale.length > 0) {
      console.log(`seed-mcp: pruned ${stale.length} stale MCPs (${stale.map((s) => s.slug).join(", ")})`)
    }
  }

  // Same cleanup for marketplace extension stubs the seed owns
  // (id prefix `mcp-`). Extensions never seeded by this file (real publisher
  // listings) keep their own ids and are untouched.
  const desiredExtIds = mcpExtRows.map((r) => r.id)
  const staleExts = await db
    .delete(extensions)
    .where(and(
      sql`${extensions.id} LIKE 'mcp-%'`,
      desiredExtIds.length > 0
        ? notInArray(extensions.id, desiredExtIds)
        : sql`true`,
    ))
    .returning({ id: extensions.id })
  if (staleExts.length > 0) {
    console.log(`seed-mcp: pruned ${staleExts.length} stale extension stubs (${staleExts.map((s) => s.id).join(", ")})`)
  }

  // Prune stale public-layer tools — rows whose slug no longer appears in
  // the canonical inventory. Scoped to layer="public" so industry tools
  // owned by sectors stay untouched. The stale-MCP prune above already
  // cleared the cascading FK targets, so this delete is FK-safe. The
  // ternary on the slug clause mirrors the extension-stub prune above so
  // an empty canonical inventory still wipes the table rather than
  // skipping the delete and leaving stale rows behind.
  const desiredPublicToolSlugs = MCP_TOOLS
    .filter((t) => t.owner.includes("."))
    .map((t) => t.slug)
  const staleTools = await db
    .delete(mcpLandscapeTools)
    .where(and(
      eq(mcpLandscapeTools.layer, "public"),
      desiredPublicToolSlugs.length > 0
        ? notInArray(mcpLandscapeTools.slug, desiredPublicToolSlugs)
        : sql`true`,
    ))
    .returning({ slug: mcpLandscapeTools.slug })
  if (staleTools.length > 0) {
    console.log(`seed-mcp: pruned ${staleTools.length} stale public tools (${staleTools.map((s) => s.slug).join(", ")})`)
  }

  // Prune stale PDTs. The tool→PDT FK is `restrict`, so we must run this
  // AFTER the public-tool prune above so no rows still reference us.
  const desiredPdtKeys = pdtRows.map((r) => r.key)
  const stalePdts = await db
    .delete(mcpPdts)
    .where(
      desiredPdtKeys.length > 0
        ? notInArray(mcpPdts.key, desiredPdtKeys)
        : sql`true`,
    )
    .returning({ key: mcpPdts.key })
  if (stalePdts.length > 0) {
    console.log(`seed-mcp: pruned ${stalePdts.length} stale PDTs (${stalePdts.map((s) => s.key).join(", ")})`)
  }

  // Prune stale domains. The PDT→domain FK is `cascade` (PDT prune above
  // already handled them); the tool→domain FK is `restrict` and was cleared
  // by the public-tool prune. Safe to delete here.
  const desiredDomainKeys = domainRows.map((r) => r.key)
  const staleDomains = await db
    .delete(mcpDomains)
    .where(
      desiredDomainKeys.length > 0
        ? notInArray(mcpDomains.key, desiredDomainKeys)
        : sql`true`,
    )
    .returning({ key: mcpDomains.key })
  if (staleDomains.length > 0) {
    console.log(`seed-mcp: pruned ${staleDomains.length} stale domains (${staleDomains.map((s) => s.key).join(", ")})`)
  }

  console.log(`seed-mcp: upserting ${mcpRows.length} landscape MCPs`)
  if (mcpRows.length > 0) {
    await db
      .insert(mcpLandscapeMcps)
      .values(mcpRows)
      .onConflictDoUpdate({
        target: mcpLandscapeMcps.slug,
        set: {
          toolId: sql`excluded.tool_id`,
          name: sql`excluded.name`,
          nameZh: sql`excluded.name_zh`,
          extensionId: sql`excluded.extension_id`,
          inDev: sql`excluded.in_dev`,
          depsCount: sql`excluded.deps_count`,
          blurb: sql`excluded.blurb`,
          blurbZh: sql`excluded.blurb_zh`,
          tags: sql`excluded.tags`,
          sortOrder: sql`excluded.sort_order`,
          updatedAt: sql`now()`,
        },
      })
  }
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
