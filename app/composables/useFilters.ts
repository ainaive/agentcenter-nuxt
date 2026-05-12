import {
  parseFilters,
  searchParamsToInput,
  serializeFilters,
  type Filters,
} from "~~/shared/validators/filters"

export type FilterUpdate = Partial<Filters>

export function useFilters() {
  const route = useRoute()
  const router = useRouter()
  const localePath = useLocalePath()

  const filters = computed<Filters>(() => {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(route.query)) {
      if (Array.isArray(v)) {
        for (const item of v) if (item !== null) params.append(k, String(item))
      } else if (v !== null && v !== undefined) {
        params.append(k, String(v))
      }
    }
    return parseFilters(searchParamsToInput(params))
  })

  function update(partial: FilterUpdate) {
    const next: FilterUpdate = { ...filters.value, ...partial }
    if (!("page" in partial)) next.page = undefined
    const params = serializeFilters(next)
    const qs = params.toString()
    const path = route.path
    router.replace(qs ? `${path}?${qs}` : path)
  }

  function hrefForFilters(partial: FilterUpdate, basePath = "/extensions") {
    const next: FilterUpdate = { ...filters.value, ...partial }
    if (!("page" in partial)) next.page = undefined
    const params = serializeFilters(next)
    const qs = params.toString()
    const path = localePath(basePath)
    return qs ? `${path}?${qs}` : path
  }

  return { filters, update, hrefForFilters }
}
