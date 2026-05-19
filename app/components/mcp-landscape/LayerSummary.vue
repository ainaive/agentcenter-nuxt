<script setup lang="ts">
import type { McpStatus } from "~~/shared/data/mcp-landscape"
import {
  groupDisplayTitle,
  STATUS_ORDER,
  type Group,
  type GroupStats,
  type Layer,
} from "~~/shared/mcp-panorama"

const props = defineProps<{
  layer: Layer
  stats: GroupStats
  groups: Group[]
}>()

const emit = defineEmits<{
  drill: [string]
  filter: [McpStatus]
}>()

const { locale, t } = useI18n()

const top3 = computed(() =>
  [...props.groups]
    .filter((g) => g.stats.total > 0)
    .sort((a, b) => b.stats.releasedPct - a.stats.releasedPct)
    .slice(0, 3),
)

const layerLabel = computed(() => t(`mcpPanorama.layer.${props.layer}Short`))

function title(g: Group): string {
  return groupDisplayTitle(g, locale.value)
}
</script>

<template>
  <section
    class="grid bg-(--color-card) border border-(--color-border) rounded-xl overflow-hidden"
    style="grid-template-columns: minmax(260px, 1.3fr) repeat(3, minmax(120px, 1fr)) minmax(220px, 1.4fr)"
  >
    <!-- big stacked bar / activePct -->
    <div class="px-5 py-4 flex flex-col gap-2.5">
      <div class="flex items-center gap-2">
        <span
          class="px-2 py-[2px] rounded font-mono text-[10px] font-semibold tracking-wider uppercase"
          :class="layer === 'industry'
            ? 'bg-(--color-layer-industry-bg) text-(--color-layer-industry)'
            : 'bg-(--color-layer-public-bg) text-(--color-layer-public)'"
        >
          {{ layerLabel }}
        </span>
        <span class="text-[11px] text-(--color-ink-muted)">
          {{ t("mcpPanorama.summary.groupsCount", { groups: groups.length, mcps: stats.total }) }}
        </span>
      </div>
      <div class="font-serif text-[36px] font-medium text-(--color-ink) leading-none tracking-tight">
        {{ stats.activePct }}%
        <span class="ml-2 text-[13px] font-sans font-normal text-(--color-ink-muted)">
          {{ t("mcpPanorama.summary.mcpActive") }}
        </span>
      </div>
      <div class="mt-1">
        <div class="flex h-2.5 rounded-md overflow-hidden bg-(--color-bg)">
          <template v-for="s in STATUS_ORDER" :key="s">
            <div
              v-if="stats.counts[s] > 0"
              :title="`${t(`mcpPanorama.status.${s}.label`)}: ${stats.counts[s]}`"
              :class="[
                'h-full',
                s === 'released' && 'bg-(--color-status-released)',
                s === 'dev' && 'bg-(--color-status-dev)',
                s === 'none' && 'bg-(--color-status-none) opacity-50',
              ]"
              :style="{ flex: stats.counts[s] }"
            />
          </template>
        </div>
        <div class="flex gap-3.5 mt-1.5 font-mono text-[11px] text-(--color-ink-muted)">
          <span class="inline-flex items-center gap-1">
            <span class="size-[5px] rounded-full bg-(--color-status-released)" />
            {{ stats.counts.released }} {{ t("mcpPanorama.status.released.short") }}
          </span>
          <span class="inline-flex items-center gap-1">
            <span class="size-[5px] rounded-full bg-(--color-status-dev)" />
            {{ stats.counts.dev }} {{ t("mcpPanorama.status.dev.short") }}
          </span>
          <span class="inline-flex items-center gap-1">
            <span class="size-[5px] rounded-full bg-(--color-status-none)" />
            {{ stats.counts.none }} {{ t("mcpPanorama.status.none.short") }}
          </span>
        </div>
      </div>
    </div>

    <!-- Released -->
    <button
      type="button"
      class="px-4 py-4 border-l border-(--color-border) flex flex-col gap-1.5 justify-center bg-transparent cursor-pointer text-left text-(--color-ink) hover:bg-(--color-bg) transition-colors"
      :title="t('mcpPanorama.summary.filterBy', { status: t('mcpPanorama.status.released.label') })"
      @click="emit('filter', 'released')"
    >
      <span class="font-mono text-[10px] tracking-wider uppercase text-(--color-ink-muted) inline-flex items-center gap-1.5">
        <span class="size-[5px] rounded-full bg-(--color-status-released)" />
        {{ t("mcpPanorama.summary.released") }}
      </span>
      <span class="font-serif text-[28px] font-medium leading-none tracking-tight">
        {{ stats.counts.released }}
      </span>
    </button>
    <!-- In Dev -->
    <button
      type="button"
      class="px-4 py-4 border-l border-(--color-border) flex flex-col gap-1.5 justify-center bg-transparent cursor-pointer text-left text-(--color-ink) hover:bg-(--color-bg) transition-colors"
      :title="t('mcpPanorama.summary.filterBy', { status: t('mcpPanorama.status.dev.label') })"
      @click="emit('filter', 'dev')"
    >
      <span class="font-mono text-[10px] tracking-wider uppercase text-(--color-ink-muted) inline-flex items-center gap-1.5">
        <span class="size-[5px] rounded-full bg-(--color-status-dev)" />
        {{ t("mcpPanorama.summary.inDev") }}
      </span>
      <span class="font-serif text-[28px] font-medium leading-none tracking-tight">
        {{ stats.counts.dev }}
      </span>
    </button>
    <!-- No MCP -->
    <button
      type="button"
      class="px-4 py-4 border-l border-(--color-border) flex flex-col gap-1.5 justify-center bg-transparent cursor-pointer text-left text-(--color-ink) hover:bg-(--color-bg) transition-colors"
      :title="t('mcpPanorama.summary.filterBy', { status: t('mcpPanorama.status.none.label') })"
      @click="emit('filter', 'none')"
    >
      <span class="font-mono text-[10px] tracking-wider uppercase text-(--color-ink-muted) inline-flex items-center gap-1.5">
        <span class="size-[5px] rounded-full bg-(--color-status-none)" />
        {{ t("mcpPanorama.summary.noMcp") }}
      </span>
      <span class="font-serif text-[28px] font-medium leading-none tracking-tight">
        {{ stats.counts.none }}
      </span>
    </button>

    <!-- Top by release % -->
    <div class="px-5 py-4 border-l border-(--color-border) bg-(--color-bg) flex flex-col gap-1.5">
      <span class="font-mono text-[10px] tracking-wider uppercase text-(--color-ink-muted)">
        {{ t("mcpPanorama.summary.topReleased") }}
      </span>
      <div v-if="top3.length === 0" class="text-[12px] text-(--color-ink-muted) italic">—</div>
      <div v-else class="flex flex-col gap-1">
        <button
          v-for="(g, i) in top3"
          :key="g.key"
          type="button"
          class="flex items-baseline justify-between gap-2 bg-transparent border-0 p-0 cursor-pointer text-left text-(--color-ink) hover:underline underline-offset-4 decoration-(--color-ink-muted) transition-colors"
          :title="t('mcpPanorama.card.drillIn', { name: title(g) })"
          @click="emit('drill', g.key)"
        >
          <span class="text-[13px] truncate">
            <span class="font-mono text-[10px] text-(--color-ink-muted) mr-1.5">#{{ i + 1 }}</span>
            {{ title(g) }}
          </span>
          <span class="font-mono text-[12px] text-(--color-status-released) tabular-nums shrink-0">
            {{ g.stats.releasedPct }}%
          </span>
        </button>
      </div>
    </div>
  </section>
</template>
