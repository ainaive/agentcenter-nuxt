<script setup lang="ts">
import { SearchX } from "lucide-vue-next"
import type { ExtensionListItem } from "~~/shared/db/queries-types"

const props = defineProps<{
  items: ExtensionListItem[]
  query?: string | undefined
  clearFiltersHref?: string | undefined
}>()

const { t } = useI18n()

const filtersActive = computed(() => Boolean(props.query) || Boolean(props.clearFiltersHref))
</script>

<template>
  <div
    v-if="items.length === 0"
    class="mx-auto my-2 flex max-w-md flex-col items-center gap-3 rounded-lg border border-dashed border-(--color-border) bg-(--color-card)/40 p-10 text-center"
  >
    <SearchX :size="32" class="text-(--color-ink-muted)/50" aria-hidden="true" />
    <h2 class="text-base font-semibold">
      <template v-if="query">{{ t("extensions.empty.noResultsFor", { query }) }}</template>
      <template v-else-if="filtersActive">{{ t("extensions.empty.noResultsFiltered") }}</template>
      <template v-else>{{ t("extensions.empty.noExtensionsYet") }}</template>
    </h2>
    <p class="text-(--color-ink-muted) max-w-xs text-[13px] leading-relaxed">
      {{ filtersActive ? t("extensions.empty.hintAdjust") : t("extensions.empty.hintCheckBack") }}
    </p>
    <NuxtLink
      v-if="clearFiltersHref"
      :to="clearFiltersHref"
      class="mt-1 inline-flex items-center rounded-md border border-(--color-border) px-3.5 py-1.5 text-[13px] font-semibold transition-colors hover:border-(--color-accent)/50 hover:text-(--color-accent)"
    >
      {{ t("extensions.empty.clearFilters") }}
    </NuxtLink>
  </div>
  <div
    v-else
    class="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4"
  >
    <ExtCard v-for="ext in items" :key="ext.id" :ext="ext" />
  </div>
</template>
