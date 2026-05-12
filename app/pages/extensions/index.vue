<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const { filters } = useFilters()
const localePath = useLocalePath()

const { data, refresh } = await useFetch("/api/internal/extensions", {
  query: computed(() => route.query),
  default: () => ({ items: [], total: 0, filters: {} }),
})

watch(() => route.fullPath, () => refresh())

const items = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)
const query = computed(() => filters.value.q)
const filtersActive = computed(() => {
  const f = filters.value
  return Object.keys(f).some((k) => k !== "page" && f[k as keyof typeof f] !== undefined)
})
</script>

<template>
  <div class="px-6 py-8 max-w-7xl mx-auto">
    <header class="mb-6">
      <h1 class="font-serif text-3xl tracking-tight text-(--color-ink)">
        {{ t("extensions.browseTitle") }}
      </h1>
      <p class="mt-1 text-sm text-(--color-ink-muted)">
        {{ t("extensions.count", { count: total }) }}
      </p>
    </header>

    <FilterBar />

    <ExtGrid
      :items="items"
      :query="query"
      :clear-filters-href="filtersActive ? localePath('/extensions') : undefined"
    />
  </div>
</template>
