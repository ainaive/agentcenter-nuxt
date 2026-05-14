// Types and helpers shared between the MCP Panorama API and its UI.

import type { McpStatus } from "~~/shared/data/mcp-landscape"

export type Layer = "industry" | "public"

export interface ToolDto {
  id: number
  slug: string
  name: string
  nameZh: string | null
  status: McpStatus
  depsCount: number
  blurb: string
  blurbZh: string
  tags: string[]
  /** When status === "released", the marketplace listing slug. */
  extensionSlug: string | null
  ownerPrimary: string
  ownerSecondary: string | null
}

export interface StatusCounts {
  released: number
  dev: number
  none: number
}

export interface GroupStats {
  total: number
  counts: StatusCounts
  releasedPct: number
  activePct: number
  lagPct: number
}

export interface PdtBlock {
  key: string
  label: string
  labelZh: string
  items: ToolDto[]
}

export interface SectorGroup {
  kind: "sector"
  key: string
  label: string
  labelZh: string
  short: string
  items: ToolDto[]
  stats: GroupStats
}

export interface DomainGroup {
  kind: "domain"
  key: string
  label: string
  labelZh: string
  short: string
  items: ToolDto[]
  pdts: PdtBlock[]
  stats: GroupStats
}

export type Group = SectorGroup | DomainGroup

export interface LayerPayload {
  layer: Layer
  layerStats: GroupStats
  groups: Group[]
}

export type RankKey = "leading" | "onTrack" | "lagging" | "early"

/** Returns the rank label for a group's stats — null if too small or middling. */
export function rankFor(stats: GroupStats): RankKey | null {
  if (stats.total < 3) return null
  if (stats.releasedPct >= 75) return "leading"
  if (stats.releasedPct >= 50) return "onTrack"
  if (stats.lagPct >= 50) return "lagging"
  if (stats.releasedPct < 25) return "early"
  return null
}

export const STATUS_ORDER: McpStatus[] = ["none", "dev", "released"]

/** Localised display name for a tool (Chinese fallback to English when null). */
export function toolDisplayName(tool: ToolDto, locale: string): string {
  if (locale === "zh" && tool.nameZh) return tool.nameZh
  return tool.name
}

/** Localised display blurb. */
export function toolDisplayBlurb(tool: ToolDto, locale: string): string {
  return locale === "zh" ? tool.blurbZh : tool.blurb
}

/** Localised group title. */
export function groupDisplayTitle(g: Group, locale: string): string {
  return locale === "zh" ? g.labelZh : g.label
}

export function pdtDisplayTitle(p: PdtBlock, locale: string): string {
  return locale === "zh" ? p.labelZh : p.label
}
