<script setup lang="ts">
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

const { locale, t } = useI18n()

const ranked = computed(() =>
  [...props.groups].sort((a, b) => b.stats.releasedPct - a.stats.releasedPct),
)
const top = computed(() => ranked.value[0] ?? null)
const bot = computed(() => {
  const last = ranked.value[ranked.value.length - 1]
  return last && last.key !== top.value?.key ? last : null
})

const layerLabel = computed(() => t(`mcpPanorama.layer.${props.layer}Short`))

function title(g: Group | null): string {
  return g ? groupDisplayTitle(g, locale.value) : ""
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
          {{ t("mcpPanorama.summary.groupsCount", { groups: groups.length, tools: stats.total }) }}
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
    <div class="px-4 py-4 border-l border-(--color-border) flex flex-col gap-1.5 justify-center">
      <span class="font-mono text-[10px] tracking-wider uppercase text-(--color-ink-muted) inline-flex items-center gap-1.5">
        <span class="size-[5px] rounded-full bg-(--color-status-released)" />
        {{ t("mcpPanorama.summary.released") }}
      </span>
      <span class="font-serif text-[28px] font-medium text-(--color-ink) leading-none tracking-tight">
        {{ stats.counts.released }}
      </span>
    </div>
    <!-- In Dev -->
    <div class="px-4 py-4 border-l border-(--color-border) flex flex-col gap-1.5 justify-center">
      <span class="font-mono text-[10px] tracking-wider uppercase text-(--color-ink-muted) inline-flex items-center gap-1.5">
        <span class="size-[5px] rounded-full bg-(--color-status-dev)" />
        {{ t("mcpPanorama.summary.inDev") }}
      </span>
      <span class="font-serif text-[28px] font-medium text-(--color-ink) leading-none tracking-tight">
        {{ stats.counts.dev }}
      </span>
    </div>
    <!-- No MCP -->
    <div class="px-4 py-4 border-l border-(--color-border) flex flex-col gap-1.5 justify-center">
      <span class="font-mono text-[10px] tracking-wider uppercase text-(--color-ink-muted) inline-flex items-center gap-1.5">
        <span class="size-[5px] rounded-full bg-(--color-status-none)" />
        {{ t("mcpPanorama.summary.noMcp") }}
      </span>
      <span class="font-serif text-[28px] font-medium text-(--color-ink) leading-none tracking-tight">
        {{ stats.counts.none }}
      </span>
    </div>

    <!-- Leading / Lagging -->
    <div class="px-5 py-4 border-l border-(--color-border) bg-(--color-bg) flex flex-col gap-2.5">
      <div v-if="top" class="flex flex-col gap-0.5">
        <span class="font-mono text-[10px] tracking-wider uppercase text-(--color-ink-muted)">
          {{ t("mcpPanorama.summary.leading") }}
        </span>
        <span class="text-[14px] text-(--color-ink) font-medium">
          {{ title(top) }}
          <span class="font-mono text-[12px] text-(--color-status-released)">{{ top.stats.releasedPct }}%</span>
        </span>
      </div>
      <div v-if="bot" class="flex flex-col gap-0.5">
        <span class="font-mono text-[10px] tracking-wider uppercase text-(--color-ink-muted)">
          {{ t("mcpPanorama.summary.lagging") }}
        </span>
        <span class="text-[14px] text-(--color-ink) font-medium">
          {{ title(bot) }}
          <span class="font-mono text-[12px] text-(--color-status-none)">{{ bot.stats.releasedPct }}%</span>
        </span>
      </div>
    </div>
  </section>
</template>
