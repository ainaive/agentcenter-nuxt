<script setup lang="ts">
import { ArrowUpRight, Search } from "lucide-vue-next"

definePageMeta({ layout: "browse" })

const { t } = useI18n()
const route = useRoute()
const { filters, update } = useFilters()
const localePath = useLocalePath()

const { data, pending, refresh } = await useFetch("/api/internal/extensions", {
  query: computed(() => route.query),
  default: () => ({ items: [], total: 0, filters: {} }),
})

// Facets don't depend on filters — fetch once and reuse across navigations.
const { data: facets } = await useFetch("/api/internal/facets", {
  default: () => ({ creators: [], publishers: [], tags: [] }),
})

watch(() => route.fullPath, () => refresh())

const items = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)
const query = computed(() => filters.value.q)
const filtersActive = computed(() => {
  const f = filters.value
  return Object.keys(f).some((k) => k !== "page" && f[k as keyof typeof f] !== undefined)
})
const isMcpCategory = computed(() => route.query.category === "mcp")

const q = ref<string>(typeof route.query.q === "string" ? route.query.q : "")
let pushTimer: ReturnType<typeof setTimeout> | null = null

function pushQuery() {
  if (pushTimer) {
    clearTimeout(pushTimer)
    pushTimer = null
  }
  const trimmed = q.value.trim()
  update({ q: trimmed || undefined })
}

function flushSearch() {
  pushQuery()
}

watch(q, () => {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(pushQuery, 250)
})

// Keep the local input in sync when the URL changes from outside the input
// (back button, chip dismissal, "Clear all").
watch(
  () => route.query.q,
  (next) => {
    const incoming = typeof next === "string" ? next : ""
    if (incoming !== q.value) q.value = incoming
  },
)

onBeforeUnmount(() => {
  if (pushTimer) clearTimeout(pushTimer)
})
</script>

<template>
  <div class="px-6 py-8 max-w-7xl mx-auto">
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <form
        role="search"
        class="relative flex-1 min-w-[240px]"
        @submit.prevent="flushSearch"
      >
        <label class="sr-only" for="extensions-search">{{ t("nav.searchLabel") }}</label>
        <Search
          :size="16"
          class="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-ink-muted) pointer-events-none"
          aria-hidden="true"
        />
        <input
          id="extensions-search"
          v-model="q"
          type="search"
          :placeholder="t('search.placeholder')"
          class="w-full h-9 pl-9 pr-3 rounded-md border border-(--color-border) bg-(--color-bg) text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-(--color-accent)"
        >
      </form>
      <NuxtLink
        v-if="isMcpCategory"
        :to="localePath('/mcp-panorama')"
        class="inline-flex items-center gap-1.5 text-[13px] font-medium text-(--color-accent) hover:gap-2 transition-[gap]"
      >
        {{ t("extensions.mcpPanoramaLink") }}
        <ArrowUpRight :size="14" aria-hidden="true" />
      </NuxtLink>
      <SortSelect />
    </div>

    <FilterBar
      :creators="facets.creators"
      :publishers="facets.publishers"
      :tags="facets.tags"
    />

    <ResultsSummary
      :count="total"
      :creators="facets.creators"
      :publishers="facets.publishers"
      :tags="facets.tags"
    />

    <ExtGridSkeleton v-if="pending && items.length === 0" />
    <ExtGrid
      v-else
      :items="items"
      :query="query"
      :clear-filters-href="filtersActive ? localePath('/extensions') : undefined"
    />
  </div>
</template>
