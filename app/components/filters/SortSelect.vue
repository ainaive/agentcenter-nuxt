<script setup lang="ts">
import { ArrowDownUp } from "lucide-vue-next"
import type { Filters } from "~~/shared/validators/filters"

const { t } = useI18n()
const { filters, update } = useFilters()

const SORT_KEYS = ["downloads", "stars", "recent"] as const

const active = computed<NonNullable<Filters["sort"]>>(() => filters.value.sort ?? "downloads")

function onChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value as Filters["sort"]
  update({ sort: value })
}
</script>

<template>
  <label
    :aria-label="t('filters.sortLabel')"
    class="inline-flex items-center gap-1.5 rounded-md border border-(--color-border) bg-(--color-card) px-2 py-1 text-(--color-ink-muted) transition-colors focus-within:border-(--color-ink)/40 hover:text-(--color-ink)"
  >
    <ArrowDownUp :size="12" aria-hidden="true" />
    <select
      :value="active"
      class="cursor-pointer bg-transparent text-(--color-ink) text-[12px] outline-none"
      @change="onChange"
    >
      <option v-for="key in SORT_KEYS" :key="key" :value="key">
        {{ t(`filters.sort.${key}`) }}
      </option>
    </select>
  </label>
</template>
