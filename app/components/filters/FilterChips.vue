<script setup lang="ts">
import type { Filters } from "~~/shared/validators/filters"

const { t } = useI18n()
const { filters, update } = useFilters()

const CHIP_KEYS = ["all", "trending", "new", "official", "free"] as const

const active = computed(() => filters.value.filter ?? "all")

function onClick(key: (typeof CHIP_KEYS)[number]) {
  update({ filter: key === "all" ? undefined : (key as Filters["filter"]) })
}
</script>

<template>
  <div role="group" :aria-label="t('filters.filtersLabel')" class="flex flex-wrap gap-1.5">
    <button
      v-for="key in CHIP_KEYS"
      :key="key"
      type="button"
      :aria-pressed="active === key"
      class="rounded-full border px-3 py-1 text-[12px] font-semibold transition"
      :class="
        active === key
          ? 'bg-(--color-ink) text-(--color-bg) border-(--color-ink)'
          : 'border-(--color-border) text-(--color-ink-muted) hover:border-(--color-accent) hover:text-(--color-accent)'
      "
      @click="onClick(key)"
    >
      {{ t(`filters.chips.${key}`) }}
    </button>
  </div>
</template>
