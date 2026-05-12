<script setup lang="ts">
import type { Filters } from "~~/shared/validators/filters"

const { t } = useI18n()
const { filters, update } = useFilters()

const SCOPE_KEYS = ["all", "personal", "org", "enterprise"] as const

const active = computed(() => filters.value.scope ?? "all")

function onClick(key: (typeof SCOPE_KEYS)[number]) {
  update({ scope: key === "all" ? undefined : (key as Filters["scope"]) })
}
</script>

<template>
  <div class="flex items-center gap-2">
    <span class="shrink-0 text-[12px] font-semibold text-(--color-ink-muted)">
      {{ t("filters.scopeLabel") }}:
    </span>
    <div role="group" class="flex flex-wrap gap-1">
      <button
        v-for="key in SCOPE_KEYS"
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
        {{ t(`filters.scope.${key}`) }}
      </button>
    </div>
  </div>
</template>
