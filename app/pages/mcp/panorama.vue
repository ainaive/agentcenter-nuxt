<script setup lang="ts">
import type { McpStatus } from "~~/shared/data/mcp-landscape"
import type {
  Group,
  Layer,
  LayerPayload,
  McpDto,
  ToolDto,
} from "~~/shared/mcp-panorama"

definePageMeta({ layout: "browse" })

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const head = useLocaleHead()
useHead(() => ({
  title: t("mcpPanorama.page.title"),
  htmlAttrs: head.value.htmlAttrs ?? {},
}))

const { status: statusFilter, viewMode, setStatus, toggleStatus, setView } =
  usePanoramaState()

const active = ref<{ tool: ToolDto; mcp: McpDto } | null>(null)

const [industryRes, publicRes] = await Promise.all([
  useFetch<LayerPayload>("/api/internal/mcp-landscape", {
    query: { layer: "industry" },
    key: "mcp-landscape-industry",
  }),
  useFetch<LayerPayload>("/api/internal/mcp-landscape", {
    query: { layer: "public" },
    key: "mcp-landscape-public",
  }),
])
const industryData = industryRes.data
const publicData = publicRes.data
const pending = computed(() => industryRes.pending.value || publicRes.pending.value)
const error = computed(() => industryRes.error.value ?? publicRes.error.value)
function refresh() {
  industryRes.refresh()
  publicRes.refresh()
}

function passesStatus(mcp: McpDto): boolean {
  return statusFilter.value === "all" || mcp.status === statusFilter.value
}

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

// Re-shape one layer's groups with the status filter applied. Drop tools that
// lose all their MCPs, and drop empty groups/PDTs.
function filterLayer(payload: LayerPayload | null | undefined): Group[] {
  if (!payload) return []
  function filterTools(tools: ToolDto[]): ToolDto[] {
    return tools
      .map((tool) => ({ ...tool, mcps: tool.mcps.filter(passesStatus) }))
      .filter((tool) => tool.mcps.length > 0)
  }
  return payload.groups
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
}

const industryGroups = computed<Group[]>(() => filterLayer(industryData.value))
const publicGroups = computed<Group[]>(() => filterLayer(publicData.value))

function rolledStats(groups: Group[]) {
  return computeStats(groups.flatMap((g) => g.items))
}

const industryStats = computed(() =>
  statusFilter.value === "all"
    ? industryData.value?.layerStats ?? { total: 0, counts: { released: 0, dev: 0, none: 0 }, releasedPct: 0, activePct: 0, lagPct: 0 }
    : rolledStats(industryGroups.value),
)
const publicStats = computed(() =>
  statusFilter.value === "all"
    ? publicData.value?.layerStats ?? { total: 0, counts: { released: 0, dev: 0, none: 0 }, releasedPct: 0, activePct: 0, lagPct: 0 }
    : rolledStats(publicGroups.value),
)

const visibleCounts = computed(() => ({
  released: industryStats.value.counts.released + publicStats.value.counts.released,
  dev: industryStats.value.counts.dev + publicStats.value.counts.dev,
  none: industryStats.value.counts.none + publicStats.value.counts.none,
  total: industryStats.value.total + publicStats.value.total,
}))
const totals = computed(() => ({
  total:
    (industryData.value?.layerStats.total ?? 0) +
    (publicData.value?.layerStats.total ?? 0),
}))

function pickMcp(payload: { tool: ToolDto; mcp: McpDto }) {
  active.value = payload
}

function filterTo(status: McpStatus) {
  toggleStatus(status)
}

// Backwards-compat: ?layer=industry|public is treated as a scroll-on-load hint,
// then stripped from the URL so the page canonicalizes to /mcp/panorama.
onMounted(() => {
  const layerHint = route.query.layer
  if (layerHint === "industry" || layerHint === "public") {
    const targetId = `layer-${layerHint}`
    requestAnimationFrame(() => {
      const el = document.getElementById(targetId)
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
    })
    const { layer: _layer, ...rest } = route.query
    router.replace({ path: route.path, query: rest })
  }
})

const allLayers: { key: Layer; groups: ComputedRef<Group[]>; stats: ComputedRef<ReturnType<typeof computeStats>>; titleKey: string }[] = [
  { key: "industry", groups: industryGroups, stats: industryStats, titleKey: "mcpPanorama.layer.industry" },
  { key: "public", groups: publicGroups, stats: publicStats, titleKey: "mcpPanorama.layer.public" },
]
</script>

<template>
  <div class="px-6 py-8">
    <SectionHeader
      v-if="industryData || publicData"
      :visible-counts="visibleCounts"
      :totals="totals"
      :status-filter="statusFilter"
      :view-mode="viewMode"
      @update:status-filter="setStatus"
      @update:view-mode="setView"
    />

    <div v-if="pending && !industryData && !publicData" class="pt-2 text-(--color-ink-muted)">
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

    <section
      v-for="layerDef in allLayers"
      :id="`layer-${layerDef.key}`"
      :key="layerDef.key"
      class="scroll-mt-20"
    >
      <PanoramaView
        v-if="viewMode === 'panorama' && layerDef.groups.value.length > 0"
        :layer="layerDef.key"
        :stats="layerDef.stats.value"
        :groups="layerDef.groups.value"
        :active-mcp-id="active?.mcp.id ?? null"
        @pick="pickMcp"
        @filter="filterTo"
      />
      <GroupedListView
        v-else-if="viewMode === 'list' && layerDef.groups.value.length > 0"
        :layer="layerDef.key"
        :groups="layerDef.groups.value"
        :active-mcp-id="active?.mcp.id ?? null"
        @pick="pickMcp"
      />
    </section>

    <ToolDetailPanel
      :active="active"
      :groups="[...(industryData?.groups ?? []), ...(publicData?.groups ?? [])]"
      @close="active = null"
      @switch-mcp="pickMcp"
    />
  </div>
</template>
