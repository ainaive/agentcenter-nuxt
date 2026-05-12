export type Locale = "en" | "zh"

export type Theme = "ivory" | "dark"

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
