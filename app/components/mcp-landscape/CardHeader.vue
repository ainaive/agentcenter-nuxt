<script setup lang="ts">
import { groupDisplayTitle, type Group } from "~~/shared/mcp-panorama"

const props = defineProps<{ group: Group }>()

const { locale, t } = useI18n()
const displayTitle = computed(() => groupDisplayTitle(props.group, locale.value))
</script>

<template>
  <header class="flex items-baseline justify-between gap-3 min-w-0">
    <h3 class="m-0 min-w-0 flex items-baseline gap-2 text-left text-(--color-ink)">
      <span class="font-serif text-[18px] font-medium tracking-tight truncate">
        {{ displayTitle }}
      </span>
      <span class="font-mono text-[11px] text-(--color-ink-muted) shrink-0">
        {{ group.stats.total }}
      </span>
    </h3>
    <span class="font-mono text-[11px] text-(--color-ink-muted) shrink-0 tabular-nums">
      <span class="text-(--color-ink)">{{ group.stats.counts.released }}</span>/{{ group.stats.total }}
      <span class="opacity-70">{{ t("mcpPanorama.card.releasedShort") }}</span>
    </span>
  </header>
</template>
