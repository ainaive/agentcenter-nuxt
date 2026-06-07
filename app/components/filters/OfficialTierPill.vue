<script setup lang="ts">
import type { Filters } from "~~/shared/validators/filters"

const { t } = useI18n()
const { filters, update } = useFilters()

const TIER_KEYS = ["all", "unofficial", "productLine", "company"] as const

const active = computed(() => filters.value.tier ?? "all")

function onClick(key: (typeof TIER_KEYS)[number]) {
  update({ tier: key === "all" ? undefined : (key as Filters["tier"]) })
}
</script>

<template>
  <div
    role="group"
    :aria-label="t('filters.tierLabel')"
    class="flex flex-wrap gap-1"
  >
    <button
      v-for="key in TIER_KEYS"
      :key="key"
      type="button"
      :aria-pressed="active === key"
      class="rounded-full border px-2.5 py-0.5 text-[12px] font-semibold transition"
      :class="
        active === key
          ? 'bg-(--color-ink)/8 text-(--color-ink) border-(--color-ink)/25'
          : 'border-(--color-border) text-(--color-ink-muted) hover:text-(--color-ink)'
      "
      @click="onClick(key)"
    >
      {{ t(`filters.tier.${key}`) }}
    </button>
  </div>
</template>
