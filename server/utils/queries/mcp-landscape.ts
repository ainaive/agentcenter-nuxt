import { asc, eq, isNotNull } from "drizzle-orm"

import { useDb } from "~~/server/utils/db"
import { deriveStatus, type McpStatus } from "~~/shared/data/mcp-landscape"
import {
  extensions,
  mcpDomains,
  mcpLandscapeTools,
  mcpPdts,
  mcpSectors,
} from "~~/shared/db/schema"
import type {
  DomainGroup,
  Group,
  GroupStats,
  Layer,
  LayerPayload,
  PdtBlock,
  SectorGroup,
  StatusCounts,
  ToolDto,
} from "~~/shared/mcp-panorama"

export type {
  DomainGroup,
  Group,
  GroupStats,
  Layer,
  LayerPayload,
  PdtBlock,
  SectorGroup,
  StatusCounts,
  ToolDto,
}

function blankCounts(): StatusCounts {
  return { released: 0, dev: 0, none: 0 }
}

function computeStats(items: { status: McpStatus }[]): GroupStats {
  const counts = blankCounts()
  for (const item of items) counts[item.status]++
  const total = items.length
  if (total === 0) {
    return { total, counts, releasedPct: 0, activePct: 0, lagPct: 0 }
  }
  return {
    total,
    counts,
    releasedPct: Math.round((counts.released / total) * 100),
    activePct: Math.round(((counts.released + counts.dev) / total) * 100),
    lagPct: Math.round((counts.none / total) * 100),
  }
}

export async function getLandscape(layer: Layer): Promise<LayerPayload> {
  const db = useDb()
  // One join across the four tables; pgsql returns ordered rows.
  const rows = await db
    .select({
      id: mcpLandscapeTools.id,
      slug: mcpLandscapeTools.slug,
      name: mcpLandscapeTools.name,
      nameZh: mcpLandscapeTools.nameZh,
      blurb: mcpLandscapeTools.blurb,
      blurbZh: mcpLandscapeTools.blurbZh,
      tags: mcpLandscapeTools.tags,
      depsCount: mcpLandscapeTools.depsCount,
      extensionId: mcpLandscapeTools.extensionId,
      inDev: mcpLandscapeTools.inDev,
      ownerSector: mcpLandscapeTools.ownerSector,
      ownerDomain: mcpLandscapeTools.ownerDomain,
      ownerPdt: mcpLandscapeTools.ownerPdt,
      extensionSlug: extensions.slug,
    })
    .from(mcpLandscapeTools)
    .leftJoin(extensions, eq(mcpLandscapeTools.extensionId, extensions.id))
    .where(eq(mcpLandscapeTools.layer, layer))
    .orderBy(asc(mcpLandscapeTools.id))

  const tools: ToolDto[] = rows.map((r) => {
    const status = deriveStatus({
      extensionId: r.extensionId,
      inDev: r.inDev,
    })
    const ownerPrimary = layer === "industry" ? r.ownerSector! : r.ownerDomain!
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      nameZh: r.nameZh,
      status,
      depsCount: r.depsCount,
      blurb: r.blurb,
      blurbZh: r.blurbZh,
      tags: r.tags,
      extensionSlug: status === "released" ? r.extensionSlug : null,
      ownerPrimary,
      ownerSecondary: r.ownerPdt,
    }
  })

  const layerStats = computeStats(tools)

  let groups: Group[]
  if (layer === "industry") {
    const sectors = await db
      .select()
      .from(mcpSectors)
      .orderBy(asc(mcpSectors.sortOrder))

    groups = sectors
      .map((s): SectorGroup => {
        const items = tools.filter((t) => t.ownerPrimary === s.key)
        return {
          kind: "sector" as const,
          key: s.key,
          label: s.label,
          labelZh: s.labelZh,
          short: s.short,
          items,
          stats: computeStats(items),
        }
      })
      .filter((g) => g.items.length > 0)
  } else {
    const [domains, pdts] = await Promise.all([
      db.select().from(mcpDomains).orderBy(asc(mcpDomains.sortOrder)),
      db
        .select()
        .from(mcpPdts)
        .where(isNotNull(mcpPdts.domainKey))
        .orderBy(asc(mcpPdts.sortOrder)),
    ])

    groups = domains
      .map((d): DomainGroup => {
        const items = tools.filter((t) => t.ownerPrimary === d.key)
        const domainPdts = pdts
          .filter((p) => p.domainKey === d.key)
          .map((p): PdtBlock => ({
            key: p.key,
            label: p.label,
            labelZh: p.labelZh,
            items: items.filter((t) => t.ownerSecondary === p.key),
          }))
          .filter((p) => p.items.length > 0)
        return {
          kind: "domain" as const,
          key: d.key,
          label: d.label,
          labelZh: d.labelZh,
          short: d.short,
          items,
          pdts: domainPdts,
          stats: computeStats(items),
        }
      })
      .filter((g) => g.items.length > 0)
  }

  return { layer, layerStats, groups }
}
