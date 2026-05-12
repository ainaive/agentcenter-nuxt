import type {
  ExtensionBadge,
  ExtensionCategory,
  ExtensionScope,
  FuncCatKey,
} from "~~/shared/types"

export interface ExtensionListItem {
  id: string
  slug: string
  category: ExtensionCategory
  badge: ExtensionBadge | null
  scope: ExtensionScope
  funcCat: FuncCatKey | null
  subCat: string | null
  l2: string | null
  deptId: string | null
  iconEmoji: string | null
  iconColor: string | null
  name: string
  nameZh: string | null
  description: string | null
  descriptionZh: string | null
  downloadsCount: number
  starsAvg: string
  tagIds: string[]
}
