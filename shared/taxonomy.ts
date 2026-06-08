import type { FuncCatKey, FuncTaxonomyNode } from "~~/shared/types"

export const FUNC_TAXONOMY: FuncTaxonomyNode[] = [
  {
    key: "workTask",
    l1: [
      { key: "systemDesign", l2: ["reqAnalysis", "funcDesign", "archDesign"] },
      { key: "softDev", l2: ["frontend", "backend", "devops"] },
      { key: "testing", l2: ["unitTest", "intTest", "perfTest"] },
    ],
  },
  {
    key: "business",
    l1: [
      { key: "network", l2: ["http", "grpc", "mqtt"] },
      { key: "embedded", l2: ["rtos", "firmware", "drivers"] },
      { key: "cloud", l2: ["aws", "azure", "k8s"] },
    ],
  },
  {
    key: "tools",
    l1: [
      { key: "docs", l2: ["markdown", "pdf", "wiki"] },
      { key: "data", l2: ["csv", "sql", "viz"] },
      { key: "vcs", l2: ["git", "pr", "cicd"] },
    ],
  },
]

export const FUNC_CAT_COLORS: Record<FuncCatKey, string> = {
  workTask: "oklch(62% 0.18 255)",
  business: "oklch(62% 0.18 145)",
  tools: "oklch(62% 0.18 55)",
}

// Vertical-axis level for the approval admin matrix. Lines up 1-1 with
// the `admin_category_level` DB enum on `approval_admins`.
//   all   → wildcard (`categoryKey='*'`); covers every macro and micro.
//   macro → an l1 leaf in FUNC_TAXONOMY (e.g. "systemDesign"); covers
//           itself + its three l2 children.
//   micro → an l2 leaf (e.g. "reqAnalysis"); covers only itself.
export type CategoryLevel = "all" | "macro" | "micro"

// Built once at module load by walking FUNC_TAXONOMY. Same pattern as
// `SUB_CAT_KEYS` in shared/validators/approvals.ts — derive from the
// constant so a taxonomy edit can't drift the keysets out of sync.
const L1_TO_L2: ReadonlyMap<string, readonly string[]> = (() => {
  const map = new Map<string, readonly string[]>()
  for (const node of FUNC_TAXONOMY) {
    for (const l1 of node.l1) {
      map.set(l1.key, Object.freeze([...l1.l2]))
    }
  }
  return map
})()

const L2_TO_L1: ReadonlyMap<string, string> = (() => {
  const map = new Map<string, string>()
  for (const node of FUNC_TAXONOMY) {
    for (const l1 of node.l1) {
      for (const l2 of l1.l2) map.set(l2, l1.key)
    }
  }
  return map
})()

export const ALL_L1_KEYS: readonly string[] = Object.freeze([
  ...L1_TO_L2.keys(),
])
export const ALL_L2_KEYS: readonly string[] = Object.freeze([
  ...L2_TO_L1.keys(),
])

export function l2KeysFor(l1: string): readonly string[] {
  return L1_TO_L2.get(l1) ?? []
}

export function l1KeyFor(l2: string): string | null {
  return L2_TO_L1.get(l2) ?? null
}

export function isL1Key(k: string): boolean {
  return L1_TO_L2.has(k)
}

export function isL2Key(k: string): boolean {
  return L2_TO_L1.has(k)
}

// Self + ancestors up to (all, '*'). Drives both `requireCellAdmin`
// (covering-row probe) and the routing fan-out in
// `server/repositories/admins.ts:findAdminsFor`.
//   ('micro', l2)  → [(micro, l2), (macro, l1Parent), (all, '*')]
//   ('macro', l1)  → [(macro, l1), (all, '*')]
//   ('all',   '*') → [(all, '*')]
// Unknown keys collapse to just (all, '*') so an unrecognised input
// can still be authorised by the wildcard cell rather than throwing —
// the validator layer is responsible for rejecting bad inputs before
// they reach here.
export function categoryAncestors(
  level: CategoryLevel,
  key: string,
): Array<{ level: CategoryLevel; key: string }> {
  const out: Array<{ level: CategoryLevel; key: string }> = []
  if (level === "micro") {
    const parent = l1KeyFor(key)
    out.push({ level: "micro", key })
    if (parent) out.push({ level: "macro", key: parent })
  } else if (level === "macro") {
    out.push({ level: "macro", key })
  }
  out.push({ level: "all", key: "*" })
  return out
}
