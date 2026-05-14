<script setup lang="ts">
import { LayoutGrid, List, Search } from "lucide-vue-next"
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
  search: string
  groups: Group[]
}>()

const emit = defineEmits<{
  "update:statusFilter": ["all" | McpStatus]
  "update:viewMode": ["panorama" | "list"]
  "update:search": [string]
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

const localSearch = computed({
  get: () => props.search,
  set: (v: string) => emit("update:search", v),
})
</script>

<template>
  <div class="px-7 pt-6 pb-4 flex flex-col gap-4">
    <div class="flex items-start justify-between gap-5">
      <div class="min-w-0 flex-1">
        <div
          v-if="titleAndCrumb.crumb"
          class="flex items-center gap-1.5 mb-1.5 font-mono text-[11px] tracking-wide uppercase text-(--color-ink-muted)"
        >
          <span>{{ titleAndCrumb.crumb }}</span>
          <button
            type="button"
            class="text-(--color-accent) cursor-pointer text-[10px] tracking-wide font-mono px-1.5 py-[1px]"
            @click="emit('clearDrill')"
          >
            {{ t("mcpPanorama.filter.clear") }}
          </button>
        </div>
        <h1 class="font-serif text-[36px] font-medium tracking-tight m-0 text-(--color-ink) leading-[1.05]">
          {{ titleAndCrumb.title }}
        </h1>
        <p class="mt-1.5 text-[13px] text-(--color-ink-muted)">{{ subtitle }}</p>
      </div>

      <div class="flex p-[3px] rounded-lg bg-(--color-bg) border border-(--color-border) shrink-0">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] cursor-pointer"
          :class="viewMode === 'panorama'
            ? 'bg-(--color-card) text-(--color-ink) font-semibold shadow-[0_1px_2px_rgba(60,40,20,0.06)]'
            : 'text-(--color-ink-muted) font-medium'"
          @click="emit('update:viewMode', 'panorama')"
        >
          <LayoutGrid :size="13" aria-hidden="true" />
          {{ t("mcpPanorama.view.panorama") }}
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] cursor-pointer"
          :class="viewMode === 'list'
            ? 'bg-(--color-card) text-(--color-ink) font-semibold shadow-[0_1px_2px_rgba(60,40,20,0.06)]'
            : 'text-(--color-ink-muted) font-medium'"
          @click="emit('update:viewMode', 'list')"
        >
          <List :size="13" aria-hidden="true" />
          {{ t("mcpPanorama.view.list") }}
        </button>
      </div>
    </div>

    <div class="flex items-center gap-2.5 flex-wrap">
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

      <div class="relative ml-auto w-full max-w-[320px]">
        <Search
          :size="14"
          class="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-ink-muted) pointer-events-none"
          aria-hidden="true"
        />
        <input
          v-model="localSearch"
          type="search"
          :placeholder="t('mcpPanorama.filter.searchPlaceholder')"
          class="w-full h-9 pl-9 pr-3 rounded-md border border-(--color-border) bg-(--color-card) text-[12.5px] focus:outline-none focus:border-(--color-accent) focus:ring-2 focus:ring-(--color-accent)/15"
        >
      </div>
    </div>
  </div>
</template>
