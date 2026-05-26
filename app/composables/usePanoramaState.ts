import type { McpStatus } from "~~/shared/data/mcp-landscape"

const STATUSES = ["all", "released", "dev", "none"] as const
const VIEWS = ["panorama", "list"] as const

export type StatusFilter = (typeof STATUSES)[number]
export type ViewMode = (typeof VIEWS)[number]

function parseEnum<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  fallback: T[number],
): T[number] {
  if (typeof value !== "string") return fallback
  return (allowed as readonly string[]).includes(value) ? (value as T[number]) : fallback
}

export function usePanoramaState() {
  const route = useRoute()
  const router = useRouter()

  const status = computed<StatusFilter>(() => parseEnum(route.query.status, STATUSES, "all"))
  const viewMode = computed<ViewMode>(() => parseEnum(route.query.view, VIEWS, "panorama"))

  function push(partial: Record<string, string | null>) {
    const merged: Record<string, string | null> = {}
    for (const [k, v] of Object.entries(route.query)) {
      if (typeof v === "string") merged[k] = v
    }
    Object.assign(merged, partial)
    const next: Record<string, string> = {}
    for (const [k, v] of Object.entries(merged)) {
      if (v !== null) next[k] = v
    }
    router.replace({ path: route.path, query: next })
  }

  function setStatus(value: StatusFilter) {
    push({ status: value === "all" ? null : value })
  }

  function toggleStatus(value: McpStatus) {
    push({ status: status.value === value ? null : value })
  }

  function setView(value: ViewMode) {
    push({ view: value === "panorama" ? null : value })
  }

  return {
    status,
    viewMode,
    setStatus,
    toggleStatus,
    setView,
  }
}
