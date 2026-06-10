export type Locale = "en" | "zh"

export type Theme = "ivory" | "dark" | "mono"

export type ExtensionCategory = "skills" | "mcp" | "slash" | "plugins" | "cli"
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
  // Optional seed-side stamp. Lets the dev seed pre-approve a handful of
  // extensions so the new tier badge / filter rail has visible data on a
  // fresh DB. Production rows pick this up from the approval workflow,
  // never from this field.
  officialTier?: "productLine" | "company" | null
  // Required iff `officialTier === "productLine"` (the DB CHECK enforces
  // the iff-rule). The seed defaults to "wireless" when unset to keep
  // pre-existing rows visible without picking favourites.
  productLineId?: "wireless" | "datacom" | "terminals" | "cloud" | null
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

export interface ProfileRequestRow {
  requestId: string
  extensionId: string
  slug: string
  name: string
  category: string
  iconColor: string | null
  requestedTier: "productLine" | "company"
  subCat: string
  status: "pending" | "approved" | "rejected" | "withdrawn"
  reason: string | null
  reviewerNote: string | null
  createdAt: string
  decidedAt: string | null
}

export interface ProfileCollectionRow {
  id: string
  slug: string
  name: string
  nameZh: string | null
  description: string | null
  descriptionZh: string | null
  systemKind: "installed" | "saved" | null
  visibility: "private" | "public"
  itemCount: number
  updatedAt: string
}
