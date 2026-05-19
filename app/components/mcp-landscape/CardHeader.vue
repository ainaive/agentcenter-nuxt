<script setup lang="ts">
import type { McpStatus } from "~~/shared/data/mcp-landscape"
import { groupDisplayTitle, type Group } from "~~/shared/mcp-panorama"

const props = defineProps<{ group: Group }>()

const emit = defineEmits<{ drill: [] }>()

const { locale, t } = useI18n()
const displayTitle = computed(() => groupDisplayTitle(props.group, locale.value))

function pct(status: McpStatus): number {
  const total = props.group.stats.total
  if (total === 0) return 0
  return (props.group.stats.counts[status] / total) * 100
}

const legendTooltip = computed(() => {
  const c = props.group.stats.counts
  return [
    `${c.released} ${t("mcpPanorama.status.released.label")}`,
    `${c.dev} ${t("mcpPanorama.status.dev.label")}`,
    `${c.none} ${t("mcpPanorama.status.none.label")}`,
  ].join(" · ")
})
</script>

<template>
  <header class="flex flex-col gap-1.5">
    <div class="flex items-baseline justify-between gap-3 min-w-0">
      <h3 class="m-0 min-w-0">
        <button
          type="button"
          class="flex items-baseline gap-2 min-w-0 bg-transparent border-0 p-0 cursor-pointer text-left text-(--color-ink) hover:underline underline-offset-4 decoration-(--color-ink-muted) transition-colors"
          :title="t('mcpPanorama.card.drillIn', { name: displayTitle })"
          @click="emit('drill')"
        >
          <span class="font-serif text-[18px] font-medium tracking-tight truncate">
            {{ displayTitle }}
          </span>
          <span class="font-mono text-[11px] text-(--color-ink-muted) shrink-0">
            {{ group.stats.total }}
          </span>
        </button>
      </h3>
      <span class="font-mono text-[11px] text-(--color-ink-muted) shrink-0 tabular-nums">
        <span class="text-(--color-ink)">{{ group.stats.counts.released }}</span>/{{ group.stats.total }}
        <span class="opacity-70">{{ t("mcpPanorama.card.releasedShort") }}</span>
      </span>
    </div>
    <div
      class="flex h-1.5 rounded overflow-hidden bg-(--color-border)"
      :title="legendTooltip"
      role="img"
      :aria-label="legendTooltip"
    >
      <div
        v-if="group.stats.counts.released"
        class="bg-(--color-status-released)"
        :style="{ width: pct('released') + '%' }"
      />
      <div
        v-if="group.stats.counts.dev"
        class="bg-(--color-status-dev)"
        :style="{ width: pct('dev') + '%' }"
      />
      <div
        v-if="group.stats.counts.none"
        class="bg-(--color-status-none) opacity-50"
        :style="{ width: pct('none') + '%' }"
      />
    </div>
  </header>
</template>
