<script setup lang="ts">
import { ChevronDown, ChevronRight } from "lucide-vue-next"
import {
  groupDisplayTitle,
  pdtDisplayTitle,
  type Group,
  type LayerPayload,
} from "~~/shared/mcp-panorama"

const { locale, t } = useI18n()

const { data: industryData } = await useFetch<LayerPayload>(
  "/api/internal/mcp-landscape",
  { query: { layer: "industry" }, key: "mcp-landscape-industry" },
)
const { data: publicData } = await useFetch<LayerPayload>(
  "/api/internal/mcp-landscape",
  { query: { layer: "public" }, key: "mcp-landscape-public" },
)

const industryGroups = computed<Group[]>(() => industryData.value?.groups ?? [])
const publicGroups = computed<Group[]>(() => publicData.value?.groups ?? [])
const industryTotal = computed(() => industryData.value?.layerStats.total ?? 0)
const publicTotal = computed(() => publicData.value?.layerStats.total ?? 0)

const expanded = ref<Record<string, boolean>>({})

function toggle(k: string) {
  expanded.value = { ...expanded.value, [k]: !expanded.value[k] }
}

function rowTitle(g: Group): string {
  return groupDisplayTitle(g, locale.value)
}

function pdtMcpCount(items: { mcps: { id: number }[] }[]): number {
  return items.reduce((acc, t) => acc + t.mcps.length, 0)
}

function scrollToAnchor(anchorId: string) {
  if (typeof document === "undefined") return
  const el = document.getElementById(anchorId)
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
}
</script>

<template>
  <section>
    <!-- Industry -->
    <h2 class="px-2 pb-1.5 font-serif text-[12px] italic tracking-wide text-(--color-ink-muted)">
      {{ t("mcpPanorama.layer.industry") }}
    </h2>
    <div class="mb-4 flex flex-col gap-px">
      <button
        type="button"
        class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13.5px] font-medium text-(--color-ink-muted) transition hover:bg-(--color-card) hover:text-(--color-ink)"
        @click="scrollToAnchor('layer-industry')"
      >
        <span class="bg-(--color-ink-muted) size-[3px] shrink-0 rounded-full" />
        <span class="flex-1 truncate">{{ t("mcpPanorama.sidebar.allMcps") }}</span>
        <span class="font-mono text-[10px] text-(--color-ink-muted)">{{ industryTotal }}</span>
      </button>
      <button
        v-for="g in industryGroups"
        :key="g.key"
        type="button"
        class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13.5px] font-medium text-(--color-ink-muted) transition hover:bg-(--color-card) hover:text-(--color-ink)"
        @click="scrollToAnchor(`group-${g.key}`)"
      >
        <span class="bg-(--color-ink-muted) size-[3px] shrink-0 rounded-full" />
        <span class="flex-1 truncate">{{ rowTitle(g) }}</span>
        <span class="font-mono text-[10px] text-(--color-ink-muted)">{{ g.stats.total }}</span>
      </button>
    </div>

    <!-- Public -->
    <h2 class="px-2 pb-1.5 font-serif text-[12px] italic tracking-wide text-(--color-ink-muted)">
      {{ t("mcpPanorama.layer.public") }}
    </h2>
    <div class="flex flex-col gap-px">
      <button
        type="button"
        class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13.5px] font-medium text-(--color-ink-muted) transition hover:bg-(--color-card) hover:text-(--color-ink)"
        @click="scrollToAnchor('layer-public')"
      >
        <span class="bg-(--color-ink-muted) size-[3px] shrink-0 rounded-full" />
        <span class="flex-1 truncate">{{ t("mcpPanorama.sidebar.allMcps") }}</span>
        <span class="font-mono text-[10px] text-(--color-ink-muted)">{{ publicTotal }}</span>
      </button>
      <template v-for="g in publicGroups" :key="g.key">
        <template v-if="g.kind === 'domain'">
          <div class="flex items-center">
            <button
              type="button"
              class="flex size-6 shrink-0 items-center justify-center rounded text-(--color-ink-muted) transition-colors hover:text-(--color-ink)"
              :aria-expanded="expanded[g.key] ?? false"
              @click="toggle(g.key)"
            >
              <ChevronDown v-if="expanded[g.key]" :size="12" aria-hidden="true" />
              <ChevronRight v-else :size="12" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="flex flex-1 items-center gap-1.5 rounded-md px-1 py-1.5 text-left text-[13.5px] font-medium text-(--color-ink-muted) transition hover:bg-(--color-card) hover:text-(--color-ink)"
              @click="scrollToAnchor(`group-${g.key}`)"
            >
              <span class="flex-1 truncate">{{ rowTitle(g) }}</span>
              <span class="font-mono text-[10px] text-(--color-ink-muted)">{{ g.stats.total }}</span>
            </button>
          </div>
          <button
            v-for="p in g.pdts"
            v-show="expanded[g.key]"
            :key="p.key"
            type="button"
            class="flex w-full items-center gap-1.5 rounded-md py-1 pr-2 pl-7 text-left text-[12.5px] font-medium text-(--color-ink-muted) transition hover:bg-(--color-card) hover:text-(--color-ink)"
            @click="scrollToAnchor(`pdt-${g.key}-${p.key}`)"
          >
            <span class="flex-1 truncate">{{ pdtDisplayTitle(p, locale) }}</span>
            <span class="font-mono text-[10px] text-(--color-ink-muted)">{{ pdtMcpCount(p.items) }}</span>
          </button>
        </template>
      </template>
    </div>
  </section>
</template>
