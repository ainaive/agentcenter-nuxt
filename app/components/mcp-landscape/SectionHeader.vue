<script setup lang="ts">
import { LayoutGrid, List, X } from "lucide-vue-next"
import type { McpStatus } from "~~/shared/data/mcp-landscape"
import {
  groupDisplayTitle,
  pdtDisplayTitle,
  STATUS_ORDER,
  type Group,
  type Layer,
  type PdtBlock,
} from "~~/shared/mcp-panorama"
import StatusChip from "./StatusChip.vue"

const props = defineProps<{
  layer: Layer
  activePrimary: string | null
  activeSecondary: string | null
  visibleCounts: { total: number; released: number; dev: number; none: number }
  totals: { total: number }
  statusFilter: "all" | McpStatus
  viewMode: "panorama" | "list"
  groups: Group[]
}>()

const emit = defineEmits<{
  "update:statusFilter": ["all" | McpStatus]
  "update:viewMode": ["panorama" | "list"]
  clearDrill: []
}>()

const { locale, t } = useI18n()

const layerLabel = computed(() => t(`mcpPanorama.layer.${props.layer}`))

const titleAndCrumb = computed<{ title: string; crumb: string | null }>(() => {
  if (!props.activePrimary) {
    return { title: t("mcpPanorama.layer." + props.layer), crumb: null }
  }
  const primary = props.groups.find((g) => g.key === props.activePrimary)
  if (!primary) return { title: props.activePrimary, crumb: layerLabel.value }
  if (props.layer === "industry") {
    return {
      title: groupDisplayTitle(primary, locale.value),
      crumb: layerLabel.value,
    }
  }
  if (primary.kind !== "domain") {
    return { title: groupDisplayTitle(primary, locale.value), crumb: layerLabel.value }
  }
  if (props.activeSecondary) {
    const pdt = primary.pdts.find((p) => p.key === props.activeSecondary) as PdtBlock | undefined
    if (pdt) {
      return {
        title: pdtDisplayTitle(pdt, locale.value),
        crumb: `${layerLabel.value} / ${groupDisplayTitle(primary, locale.value)}`,
      }
    }
  }
  return {
    title: groupDisplayTitle(primary, locale.value),
    crumb: layerLabel.value,
  }
})

const subtitle = computed(() => {
  if (!props.activePrimary) {
    return t("mcpPanorama.page.subtitleAll", {
      visible: props.visibleCounts.total,
      total: props.totals.total,
    })
  }
  return t("mcpPanorama.page.subtitleScoped", {
    visible: props.visibleCounts.total,
    released: props.visibleCounts.released,
    dev: props.visibleCounts.dev,
    none: props.visibleCounts.none,
  })
})

function statusLabel(s: McpStatus): string {
  return t(`mcpPanorama.status.${s}.label`)
}
</script>

<template>
  <div class="px-7 pt-6 pb-4 flex flex-col">
    <!-- Tier 1: title -->
    <div class="min-w-0">
      <div
        v-if="titleAndCrumb.crumb"
        class="flex items-center gap-1.5 mb-1.5 font-mono text-[11px] tracking-wide uppercase text-(--color-ink-muted)"
      >
        <span>{{ titleAndCrumb.crumb }}</span>
        <button
          type="button"
          class="inline-flex items-center justify-center size-[18px] rounded-full text-(--color-ink-muted) hover:text-(--color-ink) hover:bg-(--color-border)/60 cursor-pointer transition"
          :aria-label="t('mcpPanorama.filter.clear')"
          @click="emit('clearDrill')"
        >
          <X :size="11" aria-hidden="true" />
        </button>
      </div>
      <h1 class="font-serif text-[36px] font-medium tracking-tight m-0 text-(--color-ink) leading-[1.05]">
        {{ titleAndCrumb.title }}
      </h1>
      <p class="mt-1.5 text-[13px] text-(--color-ink-muted)">{{ subtitle }}</p>
    </div>

    <!-- Tier 2: controls -->
    <div class="mt-5 pt-4 border-t border-(--color-border) flex items-center gap-3 flex-wrap">
      <div class="flex items-center gap-2 flex-wrap">
        <StatusChip
          value="all"
          :label="t('mcpPanorama.filter.all')"
          :count="visibleCounts.total"
          :active="statusFilter === 'all'"
          @click="emit('update:statusFilter', 'all')"
        />
        <StatusChip
          v-for="s in STATUS_ORDER"
          :key="s"
          :value="s"
          :label="statusLabel(s)"
          :count="visibleCounts[s]"
          :active="statusFilter === s"
          @click="emit('update:statusFilter', statusFilter === s ? 'all' : s)"
        />
      </div>

      <div class="ml-auto flex items-center gap-3 flex-wrap">
        <div class="flex p-[3px] rounded-lg bg-(--color-bg) border border-(--color-border) shrink-0">
          <button
            type="button"
            class="inline-flex items-center justify-center size-7 rounded-md cursor-pointer transition"
            :class="viewMode === 'panorama'
              ? 'bg-(--color-card) text-(--color-ink) shadow-[0_1px_2px_rgba(60,40,20,0.06)]'
              : 'text-(--color-ink-muted) hover:text-(--color-ink)'"
            :aria-label="t('mcpPanorama.view.panorama')"
            :aria-pressed="viewMode === 'panorama'"
            @click="emit('update:viewMode', 'panorama')"
          >
            <LayoutGrid :size="14" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="inline-flex items-center justify-center size-7 rounded-md cursor-pointer transition"
            :class="viewMode === 'list'
              ? 'bg-(--color-card) text-(--color-ink) shadow-[0_1px_2px_rgba(60,40,20,0.06)]'
              : 'text-(--color-ink-muted) hover:text-(--color-ink)'"
            :aria-label="t('mcpPanorama.view.list')"
            :aria-pressed="viewMode === 'list'"
            @click="emit('update:viewMode', 'list')"
          >
            <List :size="14" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
