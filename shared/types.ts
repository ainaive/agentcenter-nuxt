export type Locale = "en" | "zh"

export type Theme = "ivory" | "dark"

export type ExtensionCategory = "skills" | "mcp" | "slash" | "plugins"
export type ExtensionScope = "personal" | "org" | "enterprise"
export type ExtensionBadge = "official" | "popular" | "new"
export type FuncCatKey = "workTask" | "business" | "tools"

export interface FuncTaxonomyL1 {
  key: string
  l2: string[]
}

export interface FuncTaxonomyNode {
  key: FuncCatKey
  l1: FuncTaxonomyL1[]
}

export interface TagLabel {
  en: string
  zh: string
}

export interface Department {
  id: string
  name: string
  nameZh: string
  children?: Department[]
}

export interface Extension {
  id: number
  dept: string
  tags: string[]
  name: string
  nameZh: string
  author: string
  category: ExtensionCategory
  badge: ExtensionBadge | null
  downloads: number
  stars: number
  color: string
  icon: string
  funcCat: FuncCatKey
  subCat: string
  scope: ExtensionScope
  desc: string
  descZh: string
}

export interface Collection {
  id: string
  name: string
  nameZh: string
  count: number
}

export interface CreatorFacet {
  id: string
  name: string | null
  email: string
  count: number
}

export interface PublisherFacet {
  id: string
  name: string
  nameZh: string | null
  slug: string
  count: number
}

export interface TagFacet {
  id: string
  labelEn: string
  labelZh: string
  count: number
}

export interface ProfileStats {
  installedCount: number
  publishedCount: number
  totalInstallsOfMine: number
  avgRatingOfMine: number | null
}

export interface ProfileInstalledRow {
  extensionId: string
  slug: string
  name: string
  category: string
  iconColor: string | null
  installedVersion: string
  installedAt: string
}

export interface ProfileSavedRow {
  extensionId: string
  slug: string
  name: string
  category: string
  iconColor: string | null
  savedAt: string
}

export interface ProfileDraftRow {
  extensionId: string
  slug: string
  name: string
  category: string
  iconColor: string | null
  updatedAt: string
  latestStatus: string | null
}

export interface ProfilePublishedRow {
  extensionId: string
  slug: string
  name: string
  category: string
  iconColor: string | null
  latestVersion: string | null
  downloadsCount: number
  starsAvg: string
  ratingsCount: number
}

export type ProfileActivityEvent =
  | { kind: "installed"; at: string; extensionId: string; slug: string; name: string; version: string }
  | { kind: "published"; at: string; extensionId: string; slug: string; name: string; version: string }
  | { kind: "rated"; at: string; extensionId: string; slug: string; name: string; stars: number }
