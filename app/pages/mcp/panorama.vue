<script setup lang="ts">
import type { McpStatus } from "~~/shared/data/mcp-landscape"
import type {
  Group,
  LayerPayload,
  McpDto,
  ToolDto,
} from "~~/shared/mcp-panorama"

definePageMeta({ layout: "browse" })

const { t } = useI18n()
const head = useLocaleHead()
useHead(() => ({
  title: t("mcpPanorama.page.title"),
  htmlAttrs: head.value.htmlAttrs ?? {},
}))

const {
  layer,
  primary: activePrimary,
  secondary: activeSecondary,
  status: statusFilter,
  viewMode,
  hideEmpty,
  setLayer,
  setDrill,
  clearDrill,
  setStatus,
  toggleStatus,
  setView,
  setHideEmpty,
} = usePanoramaState()

const active = ref<{ tool: ToolDto; mcp: McpDto } | null>(null)

// Re-fetch when layer changes; everything else filters client-side.
const { data, pending, error, refresh } = await useFetch<LayerPayload>(
  "/api/internal/mcp-landscape",
  {
    query: computed(() => ({ layer: layer.value })),
    key: "mcp-landscape",
  },
)

// Clear the detail panel when the layer changes; drill state is already
// reset inside the composable's setLayer.
watch(layer, () => {
  active.value = null
})

// All MCPs for the current layer (used for derived counts).
const allMcps = computed<{ tool: ToolDto; mcp: McpDto }[]>(() => {
  if (!data.value) return []
  const out: { tool: ToolDto; mcp: McpDto }[] = []
  for (const g of data.value.groups) {
    for (const t of g.items) for (const m of t.mcps) out.push({ tool: t, mcp: m })
  }
  return out
})

function inDrill(tool: ToolDto): boolean {
  if (activePrimary.value && tool.ownerPrimary !== activePrimary.value) return false
  if (activeSecondary.value && tool.ownerSecondary !== activeSecondary.value) return false
  return true
}

function passesStatus(mcp: McpDto): boolean {
  return statusFilter.value === "all" || mcp.status === statusFilter.value
}

// Re-shape groups with filtered MCPs, dropping tools that lose all their MCPs
// after the status filter, and dropping empty groups/PDTs.
const filteredGroups = computed<Group[]>(() => {
  if (!data.value) return []
  function filterTools(tools: ToolDto[]): ToolDto[] {
    return tools
      .filter(inDrill)
      .filter((tool) => !hideEmpty.value || tool.mcps.some((m) => !m.isPlaceholder))
      .map((tool) => ({
        ...tool,
        mcps: tool.mcps.filter(passesStatus),
      }))
      .filter((tool) => tool.mcps.length > 0)
  }
  return data.value.groups
    .map((g): Group => {
      const items = filterTools(g.items)
      if (g.kind === "sector") {
        return { ...g, items, stats: computeStats(items) }
      }
      const pdts = g.pdts
        .map((p) => ({ ...p, items: filterTools(p.items) }))
        .filter((p) => p.items.length > 0)
      return { ...g, items, pdts, stats: computeStats(items) }
    })
    .filter((g) => g.items.length > 0)
})

function computeStats(items: ToolDto[]) {
  const counts = { released: 0, dev: 0, none: 0 }
  let total = 0
  for (const t of items) {
    for (const m of t.mcps) {
      counts[m.status]++
      total++
    }
  }
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
// reflect drill-down but ignore the status filter — chips show how many
// MCPs each status would surface if selected.
const visibleCounts = computed(() => {
  const counts = { released: 0, dev: 0, none: 0, total: 0 }
  for (const { tool, mcp } of allMcps.value) {
    if (!inDrill(tool)) continue
    counts[mcp.status]++
    counts.total++
  }
  return counts
})

const totals = computed(() => ({ total: data.value?.layerStats.total ?? 0 }))

function pickMcp(payload: { tool: ToolDto; mcp: McpDto }) {
  active.value = payload
}

function drillTo(primary: string) {
  setDrill(primary, null)
  active.value = null
}

function filterTo(status: McpStatus) {
  // Same toggle behavior as the StatusChip buttons in SectionHeader —
  // clicking the active status flips back to "all".
  toggleStatus(status)
}
</script>

<template>
  <div class="px-6 py-8">
    <SectionHeader
      v-if="data"
      :layer="layer"
      :active-primary="activePrimary"
      :active-secondary="activeSecondary"
      :visible-counts="visibleCounts"
      :totals="totals"
      :status-filter="statusFilter"
      :view-mode="viewMode"
      :hide-empty="hideEmpty"
      :groups="data.groups"
      @update:status-filter="setStatus"
      @update:view-mode="setView"
      @update:hide-empty="setHideEmpty"
      @update:layer="setLayer"
      @clear-drill="clearDrill"
    />

    <div v-if="pending && !data" class="pt-2 text-(--color-ink-muted)">
      <div class="h-6 w-40 rounded bg-(--color-border) animate-pulse" />
    </div>

    <div v-if="error" class="pt-2">
      <div class="text-(--color-ink-muted) text-[13px] mb-2">{{ t("mcpPanorama.page.errorLoad") }}</div>
      <button
        type="button"
        class="px-3 py-1.5 rounded-md bg-(--color-accent) text-(--color-accent-fg) text-[12px] font-medium cursor-pointer"
        @click="refresh()"
      >
        {{ t("mcpPanorama.page.retry") }}
      </button>
    </div>

    <OverviewView
      v-if="data && viewMode === 'overview'"
      :layer="layer"
      :groups="filteredGroups"
      :active-mcp-id="active?.mcp.id ?? null"
      @pick="pickMcp"
      @drill="drillTo"
    />
    <PanoramaView
      v-else-if="data && viewMode === 'panorama'"
      :layer="layer"
      :stats="!activePrimary && !activeSecondary && statusFilter === 'all'
        ? data.layerStats
        : computeStats(filteredGroups.flatMap((g) => g.items))"
      :groups="filteredGroups"
      :active-mcp-id="active?.mcp.id ?? null"
      @pick="pickMcp"
      @drill="drillTo"
      @filter="filterTo"
    />
    <GroupedListView
      v-else-if="data && viewMode === 'list'"
      :layer="layer"
      :groups="filteredGroups"
      :active-mcp-id="active?.mcp.id ?? null"
      @pick="pickMcp"
    />

    <ToolDetailPanel
      :active="active"
      :groups="data?.groups ?? []"
      @close="active = null"
      @switch-mcp="pickMcp"
    />
  </div>
</template>
