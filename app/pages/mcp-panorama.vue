<script setup lang="ts">
import type { McpStatus } from "~~/shared/data/mcp-landscape"
import type { Group, Layer, LayerPayload, ToolDto } from "~~/shared/mcp-panorama"

definePageMeta({ layout: "mcp-panorama" })

const { t } = useI18n()
const head = useLocaleHead()
useHead(() => ({
  title: t("mcpPanorama.page.title"),
  htmlAttrs: head.value.htmlAttrs ?? {},
}))

const layer = ref<Layer>("public")
const activePrimary = ref<string | null>(null)
const activeSecondary = ref<string | null>(null)
const statusFilter = ref<"all" | McpStatus>("all")
const search = ref("")
const viewMode = ref<"panorama" | "list">("panorama")
const activeTool = ref<ToolDto | null>(null)

// Re-fetch when layer changes; everything else filters client-side.
const { data, pending, error, refresh } = await useFetch<LayerPayload>(
  "/api/internal/mcp-landscape",
  {
    query: { layer },
    key: "mcp-landscape",
  },
)

watch(layer, () => {
  activePrimary.value = null
  activeSecondary.value = null
  activeTool.value = null
})

// All tools for the current layer (used for derived counts).
const allTools = computed<ToolDto[]>(() =>
  data.value ? data.value.groups.flatMap((g) => g.items) : [],
)

// Search match — single source of truth, used by both filterTool (which
// drives what's rendered) and visibleCounts (which drives the chip badges).
function matchesSearch(tool: ToolDto): boolean {
  const q = search.value.trim().toLowerCase()
  if (!q) return true
  return (
    tool.name.toLowerCase().includes(q)
    || (tool.nameZh ?? "").toLowerCase().includes(q)
    || tool.blurb.toLowerCase().includes(q)
    || tool.blurbZh.toLowerCase().includes(q)
    || tool.tags.some((tg) => tg.toLowerCase().includes(q))
  )
}

// Filter individual tools (drill-down + status + search).
function filterTool(tool: ToolDto): boolean {
  if (activePrimary.value && tool.ownerPrimary !== activePrimary.value) return false
  if (activeSecondary.value && tool.ownerSecondary !== activeSecondary.value) return false
  if (statusFilter.value !== "all" && tool.status !== statusFilter.value) return false
  return matchesSearch(tool)
}

// Re-shape groups with filtered items, dropping empty groups/PDTs.
const filteredGroups = computed<Group[]>(() => {
  if (!data.value) return []
  return data.value.groups
    .map((g): Group => {
      const items = g.items.filter(filterTool)
      if (g.kind === "sector") {
        return { ...g, items, stats: computeStats(items) }
      }
      const pdts = g.pdts
        .map((p) => ({ ...p, items: p.items.filter(filterTool) }))
        .filter((p) => p.items.length > 0)
      return { ...g, items, pdts, stats: computeStats(items) }
    })
    .filter((g) => g.items.length > 0)
})

function computeStats(items: ToolDto[]) {
  const counts = { released: 0, dev: 0, none: 0 }
  for (const it of items) counts[it.status]++
  const total = items.length
  if (total === 0) {
    return { total, counts, releasedPct: 0, activePct: 0, lagPct: 0 }
  }
  return {
    total,
    counts,
    releasedPct: Math.round((counts.released / total) * 100),
    activePct: Math.round(((counts.released + counts.dev) / total) * 100),
    lagPct: Math.round((counts.none / total) * 100),
  }
}

// Visible counts for the section header subtitle and filter chips. These
// reflect search + drill-down but ignore the status filter — chips show how
// many tools each status would surface if selected.
const visibleCounts = computed(() => {
  const counts = { released: 0, dev: 0, none: 0, total: 0 }
  if (!data.value) return counts
  for (const tool of allTools.value) {
    if (activePrimary.value && tool.ownerPrimary !== activePrimary.value) continue
    if (activeSecondary.value && tool.ownerSecondary !== activeSecondary.value) continue
    if (!matchesSearch(tool)) continue
    counts[tool.status]++
    counts.total++
  }
  return counts
})

const totals = computed(() => ({ total: data.value?.layerStats.total ?? 0 }))

function setActive(primary: string | null, secondary: string | null) {
  activePrimary.value = primary
  activeSecondary.value = secondary
  activeTool.value = null
}

function clearDrill() {
  activePrimary.value = null
  activeSecondary.value = null
}

function pickTool(tool: ToolDto) {
  activeTool.value = tool
}
</script>

<template>
  <div class="contents">
    <!-- Sidebar -->
    <ClientOnly>
    <LayerSidebar
      v-if="data"
      :layer="layer"
      :groups="data.groups"
      :total-count="totals.total"
      :active-primary="activePrimary"
      :active-secondary="activeSecondary"
      @update:layer="(l: Layer) => (layer = l)"
      @set-active="setActive"
    />
    <template #fallback>
      <div class="w-[268px] shrink-0 border-r border-(--color-border) bg-(--color-sidebar)" />
    </template>
  </ClientOnly>

  <!-- Main + side panel -->
  <div class="flex-1 overflow-auto bg-(--color-bg) relative">
    <SectionHeader
      v-if="data"
      :layer="layer"
      :active-primary="activePrimary"
      :active-secondary="activeSecondary"
      :visible-counts="visibleCounts"
      :totals="totals"
      :status-filter="statusFilter"
      :view-mode="viewMode"
      :search="search"
      :groups="data.groups"
      @update:status-filter="(v: 'all' | McpStatus) => (statusFilter = v)"
      @update:view-mode="(v: 'panorama' | 'list') => (viewMode = v)"
      @update:search="(v: string) => (search = v)"
      @clear-drill="clearDrill"
    />

    <div v-if="pending && !data" class="px-7 pb-7 pt-2 text-(--color-ink-muted)">
      <div class="h-6 w-40 rounded bg-(--color-border) animate-pulse" />
    </div>

    <div v-if="error" class="px-7 pb-7 pt-2">
      <div class="text-(--color-ink-muted) text-[13px] mb-2">{{ t("mcpPanorama.page.errorLoad") }}</div>
      <button
        type="button"
        class="px-3 py-1.5 rounded-md bg-(--color-accent) text-(--color-accent-fg) text-[12px] font-medium cursor-pointer"
        @click="refresh()"
      >
        {{ t("mcpPanorama.page.retry") }}
      </button>
    </div>

    <PanoramaView
      v-if="data && viewMode === 'panorama'"
      :layer="layer"
      :stats="!activePrimary && !activeSecondary && statusFilter === 'all' && !search.trim()
        ? data.layerStats
        : computeStats(filteredGroups.flatMap((g) => g.items))"
      :groups="filteredGroups"
      :active-id="activeTool?.id ?? null"
      @pick="pickTool"
    />
    <GroupedListView
      v-else-if="data && viewMode === 'list'"
      :layer="layer"
      :groups="filteredGroups"
      :active-id="activeTool?.id ?? null"
      @pick="pickTool"
    />
  </div>

    <ToolDetailPanel
      :tool="activeTool"
      :groups="data?.groups ?? []"
      @close="activeTool = null"
    />
  </div>
</template>
