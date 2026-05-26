<script setup lang="ts">
import {
  groupDisplayTitle,
  pdtDisplayTitle,
  STATUS_ORDER,
  toolDisplayName,
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

// Outer columns: domain cards need more room because they wrap a nested
// PDT grid; sector cards are flat and pack tighter.
const outerGridCols = computed(() =>
  props.layer === "public"
    ? "repeat(auto-fit, minmax(320px, 1fr))"
    : "repeat(auto-fit, minmax(260px, 1fr))",
)
</script>

<template>
  <div class="px-7 pb-7">
    <div
      class="grid gap-3 items-stretch"
      :style="{ gridTemplateColumns: outerGridCols, gridAutoRows: 'minmax(0, 1fr)' }"
    >
      <article
        v-for="g in groups"
        :key="g.key"
        class="bg-(--color-card) border border-(--color-border) rounded-xl p-3 flex flex-col gap-2 min-w-0 min-h-0 overflow-hidden"
      >
        <!-- Group header (sector or domain) — clickable to drill -->
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

        <!-- Rolled-up status bar for the whole group -->
        <div class="flex h-1 w-full rounded-full overflow-hidden bg-(--color-border) shrink-0">
          <template v-for="s in STATUS_ORDER" :key="s">
            <div
              v-if="g.stats.counts[s] > 0"
              :class="dotClass(s)"
              :style="{ width: `${(g.stats.counts[s] / g.stats.total) * 100}%` }"
            />
          </template>
        </div>

        <!-- Sector layer: flat tool rows -->
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
            <div class="flex items-center gap-[3px] flex-wrap justify-end ml-auto">
              <button
                v-for="mcp in tool.mcps"
                :key="mcp.id"
                type="button"
                class="size-[7px] rounded-full cursor-pointer transition-transform hover:scale-[1.6]"
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

        <!-- Domain layer: nested grid of PDT sub-blocks -->
        <div
          v-else
          class="grid gap-2 min-h-0 overflow-hidden flex-1"
          style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));"
        >
          <section
            v-for="pdt in g.pdts"
            :key="pdt.key"
            class="bg-(--color-bg) rounded-md px-2 py-1.5 flex flex-col gap-1 min-w-0 min-h-0 overflow-hidden"
          >
            <header class="flex items-baseline justify-between gap-1.5 px-0.5">
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
                <div class="flex items-center gap-[2px] flex-wrap justify-end ml-auto">
                  <button
                    v-for="mcp in tool.mcps"
                    :key="mcp.id"
                    type="button"
                    class="size-[6px] rounded-full cursor-pointer transition-transform hover:scale-[1.7]"
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
  </div>
</template>
