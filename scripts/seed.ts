import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { COLLECTIONS } from "../shared/data/collections"
import { DEPARTMENTS } from "../shared/data/departments"
import { EXTENSIONS } from "../shared/data/extensions"
import {
  INDUSTRY_SECTORS,
  MCP_TOOLS,
  PUBLIC_DOMAINS,
  ownerToParts,
} from "../shared/data/mcp-landscape"
import * as schema from "../shared/db/schema"
import {
  departments,
  extensions,
  extensionTags,
  mcpDomains,
  mcpLandscapeTools,
  mcpPdts,
  mcpSectors,
  memberships,
  organizations,
  tags,
  users,
} from "../shared/db/schema"
import { TAG_LABELS } from "../shared/tags"
import type { Department } from "../shared/types"

const ORG_ID = "default"

const CREATORS = [
  { id: "user-amy", email: "amy@agentcenter.dev", name: "Amy Chen" },
  { id: "user-ben", email: "ben@agentcenter.dev", name: "Ben Park" },
  { id: "user-cory", email: "cory@agentcenter.dev", name: "Cory Liu" },
  { id: "user-dao", email: "dao@agentcenter.dev", name: "Dao Tran" },
  { id: "user-eli", email: "eli@agentcenter.dev", name: "Eli Smith" },
  { id: "user-fei", email: "fei@agentcenter.dev", name: "Fei Wang" },
]

interface FlatDept {
  id: string
  orgId: string
  parentId: string | null
  name: string
  nameZh: string
  pathDepth: number
}

function flattenDepts(
  list: Department[],
  depth = 0,
  parentId: string | null = null,
  out: FlatDept[] = [],
): FlatDept[] {
  for (const d of list) {
    out.push({
      id: d.id,
      orgId: ORG_ID,
      parentId,
      name: d.name,
      nameZh: d.nameZh,
      pathDepth: depth,
    })
    if (d.children) flattenDepts(d.children, depth + 1, d.id, out)
  }
  return out
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

const CATEGORY_LABELS = {
  skills: "skill",
  mcp: "MCP server",
  slash: "slash command",
  plugins: "plugin",
} as const

function generateReadme(ext: (typeof EXTENSIONS)[number]): string {
  const kind = CATEGORY_LABELS[ext.category]
  const installCmd = `agentcenter install ${slugify(ext.name)}`
  return `# ${ext.name}

${ext.desc}

## Overview

${ext.name} is a ${kind} published by **${ext.author}**. It plugs into your
agent runtime so you can ${ext.desc.toLowerCase().replace(/\.$/, "")} without
hand-rolling integrations.

## Install

\`\`\`bash
${installCmd}
\`\`\`

After installing, restart your agent to pick up the new ${kind}.

## Compatibility

- **Claude** — supported on the latest agent runtimes
- **Other agents** — install paths can be customized via \`agentcenter config\`

## Tags

${ext.tags.map((t) => `\`${t}\``).join(" · ")}
`
}

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error("seed: DATABASE_URL is not set")
    process.exit(1)
  }
  const client = postgres(url)
  const db = drizzle(client, { schema, casing: "snake_case" })

  console.log("seed: starting")
  console.log("seed: truncating catalog tables")
  await db.execute(
    sql`TRUNCATE TABLE ${organizations}, ${tags} RESTART IDENTITY CASCADE`,
  )

  const authorOrgIdMap = new Map<string, string>()
  const usedSlugs = new Set<string>([ORG_ID])
  for (const e of EXTENSIONS) {
    if (authorOrgIdMap.has(e.author)) continue
    const base = slugify(e.author) || `author-${authorOrgIdMap.size}`
    let slug = base
    for (let n = 1; usedSlugs.has(slug); n++) slug = `${base}-${n}`
    usedSlugs.add(slug)
    authorOrgIdMap.set(e.author, slug)
  }
  const orgRows = [
    {
      id: ORG_ID,
      slug: "default",
      name: "Default Organization",
      nameZh: "默认组织",
    },
    ...Array.from(authorOrgIdMap.entries()).map(([author, id]) => ({
      id,
      slug: id,
      name: author,
      nameZh: null,
    })),
  ]
  console.log(`seed: inserting ${orgRows.length} organizations`)
  await db.insert(organizations).values(orgRows)

  console.log(`seed: upserting ${CREATORS.length} creator users`)
  await db.insert(users).values(CREATORS).onConflictDoNothing()

  const flatDepts = flattenDepts(DEPARTMENTS)
  console.log(`seed: inserting ${flatDepts.length} departments`)
  await db.insert(departments).values(flatDepts)

  const tagRows = Object.entries(TAG_LABELS).map(([id, label]) => ({
    id,
    labelEn: label.en,
    labelZh: label.zh,
  }))
  console.log(`seed: inserting ${tagRows.length} tags`)
  await db.insert(tags).values(tagRows)

  const extRows = EXTENSIONS.map((e, i) => {
    const creator = CREATORS[i % CREATORS.length]!
    const ownerOrgId = authorOrgIdMap.get(e.author)
    if (!ownerOrgId) throw new Error(`no org for author ${e.author}`)
    return {
      id: `ext-${e.id}`,
      slug: slugify(e.name),
      category: e.category,
      badge: e.badge ?? null,
      scope: e.scope,
      funcCat: e.funcCat,
      subCat: e.subCat,
      publisherUserId: creator.id,
      ownerOrgId,
      deptId: e.dept,
      iconEmoji: e.icon,
      iconColor: e.color,
      visibility: "published" as const,
      name: e.name,
      nameZh: e.nameZh,
      description: e.desc,
      descriptionZh: e.descZh,
      readmeMd: generateReadme(e),
      downloadsCount: e.downloads,
      starsAvg: String(e.stars),
      ratingsCount: 0,
      publishedAt: new Date(),
    }
  })
  console.log(`seed: inserting ${extRows.length} extensions`)
  await db.insert(extensions).values(extRows)

  const seen = new Set<string>()
  const membershipRows: {
    id: string
    userId: string
    orgId: string
    role: "publisher"
  }[] = []
  for (const row of extRows) {
    const key = `${row.publisherUserId}|${row.ownerOrgId}`
    if (seen.has(key)) continue
    seen.add(key)
    membershipRows.push({
      id: `mem-${row.publisherUserId}-${row.ownerOrgId}`,
      userId: row.publisherUserId,
      orgId: row.ownerOrgId,
      role: "publisher",
    })
  }
  console.log(`seed: inserting ${membershipRows.length} memberships`)
  await db.insert(memberships).values(membershipRows)

  const extTagRows = EXTENSIONS.flatMap((e) =>
    e.tags.map((tagKey) => ({
      extensionId: `ext-${e.id}`,
      tagId: tagKey,
    })),
  )
  console.log(`seed: inserting ${extTagRows.length} extension-tag links`)
  await db.insert(extensionTags).values(extTagRows)

  console.log(
    `seed: skipping ${COLLECTIONS.length} mock collections (user-owned, seeded post-signup in P9)`,
  )

  // ─── MCP Panorama landscape ────────────────────────────────────────────────
  // Sectors (industry layer).
  const sectorRows = INDUSTRY_SECTORS.map((s, i) => ({
    key: s.key,
    label: s.label,
    labelZh: s.labelZh,
    short: s.short,
    sortOrder: i,
  }))
  console.log(`seed: inserting ${sectorRows.length} mcp sectors`)
  await db.insert(mcpSectors).values(sectorRows)

  // Domains + PDTs (public layer).
  const domainRows = PUBLIC_DOMAINS.map((d, i) => ({
    key: d.key,
    label: d.label,
    labelZh: d.labelZh,
    short: d.short,
    sortOrder: i,
  }))
  console.log(`seed: inserting ${domainRows.length} mcp domains`)
  await db.insert(mcpDomains).values(domainRows)

  const pdtRows = PUBLIC_DOMAINS.flatMap((d) =>
    d.pdts.map((p, i) => ({
      key: `${d.key}.${p.key}`,
      domainKey: d.key,
      label: p.label,
      labelZh: p.labelZh,
      sortOrder: i,
    })),
  )
  console.log(`seed: inserting ${pdtRows.length} mcp pdts`)
  await db.insert(mcpPdts).values(pdtRows)

  // Marketplace MCP extension stubs for every "released" landscape tool —
  // the green tile in the panorama links here.
  const orgIdForStubs = ORG_ID
  const releasedTools = MCP_TOOLS.filter((t) => t.released)
  const mcpExtRows = releasedTools.map((t, i) => {
    const creator = CREATORS[i % CREATORS.length]!
    return {
      id: `mcp-${t.slug}`,
      slug: t.slug,
      category: "mcp" as const,
      badge: null,
      scope: "enterprise" as const,
      funcCat: null,
      subCat: null,
      publisherUserId: creator.id,
      ownerOrgId: orgIdForStubs,
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
      downloadsCount: 0,
      starsAvg: "0.0",
      ratingsCount: 0,
      publishedAt: new Date(),
    }
  })
  console.log(`seed: inserting ${mcpExtRows.length} mcp extension stubs`)
  await db.insert(extensions).values(mcpExtRows)

  // Landscape tool rows — extensionId points at the stub above for released
  // ones; inDev=true for the rest of the dev-status tools.
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
  console.log(`seed: inserting ${toolRows.length} mcp landscape tools`)
  await db.insert(mcpLandscapeTools).values(toolRows)

  console.log("seed: done")
  await client.end()
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("seed: failed")
    console.error(err)
    process.exit(1)
  })
