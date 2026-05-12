<script setup lang="ts">
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
  <label class="flex items-center gap-2 text-[12px] text-(--color-ink-muted)">
    <span class="shrink-0 font-semibold">{{ t("filters.sortLabel") }}:</span>
    <select
      :value="active"
      class="cursor-pointer rounded-md border border-(--color-border) bg-(--color-card) text-(--color-ink) px-2 py-1 text-[12px] outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)/30"
      @change="onChange"
    >
      <option v-for="key in SORT_KEYS" :key="key" :value="key">
        {{ t(`filters.sort.${key}`) }}
      </option>
    </select>
  </label>
</template>
