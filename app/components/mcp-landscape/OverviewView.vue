<script setup lang="ts">
import {
  groupDisplayTitle,
  pdtDisplayTitle,
  toolDisplayName,
  type DomainGroup,
  type Group,
  type Layer,
  type McpDto,
  type ToolDto,
} from "~~/shared/mcp-panorama"

const props = defineProps<{
  layer: Layer
  groups: Group[]
  activeMcpId: number | null
}>()
const emit = defineEmits<{
  pick: [{ tool: ToolDto; mcp: McpDto }]
  drill: [string]
}>()

const { locale, t } = useI18n()

type BucketKey = "rnd" | "product" | "other"

// Fixed top-to-bottom order on the public layer.
const BUCKET_ORDER: BucketKey[] = ["rnd", "product", "other"]

// Maps the 5 known public-layer domain keys to their super-bucket.
// Unknown keys fall through to "other" so a new domain added to the seed
// shows up rather than silently disappearing.
const BUCKET_FOR: Record<string, BucketKey> = {
  "ai-rd": "rnd",
  "prod-sw-eng": "product",
  "hw-eng": "other",
  "prod-digi": "other",
  "rnd-facilities": "other",
  "prod-config": "other",
}

interface OverviewBucket {
  key: BucketKey
  title: string
  items: DomainGroup[]
}

// Partition the public-layer domain groups into the three buckets, in fixed
// order. Empty buckets are dropped so a status filter that wipes out an
// entire bucket doesn't leave an orphan section header.
const buckets = computed<OverviewBucket[]>(() => {
  if (props.layer !== "public") return []
  const groupsByBucket: Record<BucketKey, DomainGroup[]> = {
    rnd: [],
    product: [],
    other: [],
  }
  for (const g of props.groups) {
    if (g.kind !== "domain") continue
    const bucket = BUCKET_FOR[g.key] ?? "other"
    groupsByBucket[bucket].push(g)
  }
  return BUCKET_ORDER.filter((k) => groupsByBucket[k].length > 0).map((k) => ({
    key: k,
    title: t(`mcpPanorama.bucket.${k}`),
    items: groupsByBucket[k],
  }))
})

function dotClass(status: McpDto["status"]): string {
  switch (status) {
    case "released":
      return "bg-(--color-status-released)"
    case "dev":
      return "bg-(--color-status-dev)"
    default:
      return "bg-(--color-status-none)"
  }
}

function mcpTitle(tool: ToolDto, mcp: McpDto): string {
  const toolName = toolDisplayName(tool, locale.value)
  const statusLabel = t(`mcpPanorama.status.${mcp.status}.short`)
  if (mcp.isPlaceholder) {
    return `${toolName} · ${statusLabel}`
  }
  const mcpName = locale.value === "zh" && mcp.nameZh ? mcp.nameZh : mcp.name
  return `${toolName} · ${mcpName} · ${statusLabel}`
}

function pdtMcpCount(items: ToolDto[]): number {
  return items.reduce((acc, tool) => acc + tool.mcps.length, 0)
}

// Single-domain buckets (rnd, product) get a single full-width card.
// The "other" bucket fans its domain cards out across the available width.
function bucketGridCols(bucket: OverviewBucket): string {
  return bucket.items.length === 1
    ? "1fr"
    : "repeat(auto-fit, minmax(320px, 1fr))"
}
</script>

<template>
  <div class="px-7 pb-7">
    <!-- Public layer: three named super-bucket sections, top to bottom. -->
    <div v-if="layer === 'public'" class="flex flex-col gap-5">
      <section v-for="bucket in buckets" :key="bucket.key" class="flex flex-col gap-2">
        <header class="flex items-baseline gap-2 px-0.5">
          <h2 class="font-serif text-[18px] font-medium tracking-tight m-0 text-(--color-ink)">
            {{ bucket.title }}
          </h2>
          <span class="font-mono text-[11px] text-(--color-ink-muted) tabular-nums">
            ({{ bucket.items.length }})
          </span>
        </header>
        <div
          class="grid gap-3 items-stretch"
          :style="{ gridTemplateColumns: bucketGridCols(bucket) }"
        >
          <article
            v-for="g in bucket.items"
            :key="g.key"
            class="bg-(--color-card) border border-(--color-border) rounded-xl p-3 flex flex-col gap-2 min-w-0 min-h-0 overflow-hidden"
          >
            <header class="flex items-baseline justify-between gap-2 min-w-0">
              <button
                type="button"
                class="flex items-baseline gap-1.5 min-w-0 bg-transparent border-0 p-0 cursor-pointer text-left text-(--color-ink) hover:underline underline-offset-4 decoration-(--color-ink-muted) transition-colors"
                :title="t('mcpPanorama.card.drillIn', { name: groupDisplayTitle(g, locale) })"
                @click="emit('drill', g.key)"
              >
                <span class="font-serif text-[14px] font-medium tracking-tight truncate">
                  {{ groupDisplayTitle(g, locale) }}
                </span>
                <span class="font-mono text-[10px] text-(--color-ink-muted) shrink-0 tabular-nums">
                  {{ g.stats.total }}
                </span>
              </button>
              <span class="font-mono text-[10px] text-(--color-ink-muted) shrink-0 tabular-nums">
                <span class="text-(--color-ink)">{{ g.stats.releasedPct }}%</span>
                <span class="opacity-70 ml-0.5">{{ t("mcpPanorama.card.releasedShort") }}</span>
              </span>
            </header>

            <div
              class="grid gap-2 min-h-0 overflow-hidden flex-1"
              style="grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));"
            >
              <section
                v-for="pdt in g.pdts"
                :key="pdt.key"
                class="bg-(--color-bg) rounded-md px-1.5 py-1 flex flex-col gap-1 min-w-0 min-h-0 overflow-hidden"
              >
                <header class="flex items-baseline justify-between gap-1 px-0.5">
                  <span
                    class="font-serif text-[12px] font-medium text-(--color-ink) tracking-tight truncate"
                    :title="pdtDisplayTitle(pdt, locale)"
                  >{{ pdtDisplayTitle(pdt, locale) }}</span>
                  <span class="font-mono text-[10px] text-(--color-ink-muted) shrink-0 tabular-nums">
                    {{ pdtMcpCount(pdt.items) }}
                  </span>
                </header>
                <ul class="flex flex-col gap-0.5 min-h-0 overflow-hidden" role="list">
                  <li
                    v-for="tool in pdt.items"
                    :key="tool.id"
                    class="flex items-center gap-1 min-w-0"
                  >
                    <span
                      class="font-serif text-[11px] text-(--color-ink) truncate shrink"
                      :title="toolDisplayName(tool, locale)"
                    >{{ toolDisplayName(tool, locale) }}</span>
                    <div class="flex items-center gap-[2px] flex-wrap">
                      <button
                        v-for="mcp in tool.mcps"
                        :key="mcp.id"
                        type="button"
                        class="w-[12px] h-[5px] rounded-full cursor-pointer transition-transform hover:scale-[1.7]"
                        :class="[
                          dotClass(mcp.status),
                          mcp.isPlaceholder && 'opacity-40',
                          activeMcpId === mcp.id && 'ring-2 ring-(--color-ink)/40 ring-offset-1 ring-offset-(--color-bg) scale-[1.4]',
                        ]"
                        :title="mcpTitle(tool, mcp)"
                        :aria-label="mcpTitle(tool, mcp)"
                        @click="emit('pick', { tool, mcp })"
                      />
                    </div>
                  </li>
                </ul>
              </section>
            </div>
          </article>
        </div>
      </section>
    </div>

    <!-- Industry layer: flat sector cards, no bucketing. -->
    <div
      v-else
      class="grid gap-3 items-stretch"
      :style="{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gridAutoRows: 'minmax(0, 1fr)' }"
    >
      <article
        v-for="g in groups"
        :key="g.key"
        class="bg-(--color-card) border border-(--color-border) rounded-xl p-3 flex flex-col gap-2 min-w-0 min-h-0 overflow-hidden"
      >
        <header class="flex items-baseline justify-between gap-2 min-w-0">
          <button
            type="button"
            class="flex items-baseline gap-1.5 min-w-0 bg-transparent border-0 p-0 cursor-pointer text-left text-(--color-ink) hover:underline underline-offset-4 decoration-(--color-ink-muted) transition-colors"
            :title="t('mcpPanorama.card.drillIn', { name: groupDisplayTitle(g, locale) })"
            @click="emit('drill', g.key)"
          >
            <span class="font-serif text-[14px] font-medium tracking-tight truncate">
              {{ groupDisplayTitle(g, locale) }}
            </span>
            <span class="font-mono text-[10px] text-(--color-ink-muted) shrink-0 tabular-nums">
              {{ g.stats.total }}
            </span>
          </button>
          <span class="font-mono text-[10px] text-(--color-ink-muted) shrink-0 tabular-nums">
            <span class="text-(--color-ink)">{{ g.stats.releasedPct }}%</span>
            <span class="opacity-70 ml-0.5">{{ t("mcpPanorama.card.releasedShort") }}</span>
          </span>
        </header>

        <ul
          v-if="g.kind === 'sector'"
          class="flex flex-col gap-1 min-h-0 overflow-hidden flex-1"
          role="list"
        >
          <li
            v-for="tool in g.items"
            :key="tool.id"
            class="flex items-center gap-1.5 min-w-0"
          >
            <span
              class="font-serif text-[12px] text-(--color-ink) truncate shrink"
              :title="toolDisplayName(tool, locale)"
            >{{ toolDisplayName(tool, locale) }}</span>
            <div class="flex items-center gap-[3px] flex-wrap">
              <button
                v-for="mcp in tool.mcps"
                :key="mcp.id"
                type="button"
                class="w-[16px] h-[6px] rounded-full cursor-pointer transition-transform hover:scale-[1.6]"
                :class="[
                  dotClass(mcp.status),
                  mcp.isPlaceholder && 'opacity-40',
                  activeMcpId === mcp.id && 'ring-2 ring-(--color-ink)/40 ring-offset-1 ring-offset-(--color-card) scale-[1.4]',
                ]"
                :title="mcpTitle(tool, mcp)"
                :aria-label="mcpTitle(tool, mcp)"
                @click="emit('pick', { tool, mcp })"
              />
            </div>
          </li>
        </ul>
      </article>
    </div>
  </div>
</template>
