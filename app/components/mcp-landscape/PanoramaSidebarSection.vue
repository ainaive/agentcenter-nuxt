<script setup lang="ts">
import { ChevronDown, ChevronRight, Factory, Globe2 } from "lucide-vue-next"
import {
  groupDisplayTitle,
  pdtDisplayTitle,
  type Group,
  type LayerPayload,
} from "~~/shared/mcp-panorama"

const { locale, t } = useI18n()
const { layer, primary, secondary, setLayer, setDrill } = usePanoramaState()

const { data } = await useFetch<LayerPayload>("/api/internal/mcp-landscape", {
  query: computed(() => ({ layer: layer.value })),
  key: "mcp-landscape",
})

const groups = computed<Group[]>(() => data.value?.groups ?? [])
const totalCount = computed<number>(() => data.value?.layerStats.total ?? 0)

const expanded = ref<Record<string, boolean>>({})

watch(layer, () => {
  expanded.value = {}
})

watch(
  primary,
  (k) => {
    if (k && layer.value === "public") expanded.value = { ...expanded.value, [k]: true }
  },
  { immediate: true },
)

function setActivePrimary(key: string) {
  if (primary.value === key && !secondary.value) {
    setDrill(null, null)
  } else {
    setDrill(key, null)
    if (layer.value === "public") expanded.value = { ...expanded.value, [key]: true }
  }
}

function setActivePdt(domainKey: string, pdtKey: string) {
  const isActive = primary.value === domainKey && secondary.value === pdtKey
  setDrill(domainKey, isActive ? null : pdtKey)
}

function toggle(k: string) {
  expanded.value = { ...expanded.value, [k]: !expanded.value[k] }
}

function rowTitle(g: Group): string {
  return groupDisplayTitle(g, locale.value)
}

function pdtMcpCount(items: { mcps: { id: number }[] }[]): number {
  return items.reduce((acc, t) => acc + t.mcps.length, 0)
}
</script>

<template>
  <section>
    <h2 class="px-2 pb-1.5 font-serif text-[12px] italic tracking-wide text-(--color-ink-muted)">
      {{ t("mcpPanorama.sidebar.serviceLayer") }}
    </h2>

    <div class="mb-3 grid grid-cols-2 gap-1.5 rounded-md border border-(--color-border) bg-(--color-bg) p-1">
      <button
        type="button"
        class="flex cursor-pointer items-center justify-center gap-1.5 rounded px-2 py-1.5 text-[12px] transition-colors"
        :class="layer === 'industry'
          ? 'bg-(--color-card) text-(--color-ink) font-semibold shadow-[0_1px_2px_rgba(60,40,20,0.06)]'
          : 'text-(--color-ink-muted) font-medium hover:text-(--color-ink)'"
        @click="setLayer('industry')"
      >
        <Factory
          :size="12"
          :class="layer === 'industry' ? 'text-(--color-layer-industry)' : ''"
          aria-hidden="true"
        />
        {{ t("mcpPanorama.layer.industryShort") }}
      </button>
      <button
        type="button"
        class="flex cursor-pointer items-center justify-center gap-1.5 rounded px-2 py-1.5 text-[12px] transition-colors"
        :class="layer === 'public'
          ? 'bg-(--color-card) text-(--color-ink) font-semibold shadow-[0_1px_2px_rgba(60,40,20,0.06)]'
          : 'text-(--color-ink-muted) font-medium hover:text-(--color-ink)'"
        @click="setLayer('public')"
      >
        <Globe2
          :size="12"
          :class="layer === 'public' ? 'text-(--color-layer-public)' : ''"
          aria-hidden="true"
        />
        {{ t("mcpPanorama.layer.publicShort") }}
      </button>
    </div>

    <h2 class="px-2 pb-1.5 font-serif text-[12px] italic tracking-wide text-(--color-ink-muted)">
      {{ layer === "industry" ? t("mcpPanorama.sidebar.sectors") : t("mcpPanorama.sidebar.domainsPdts") }}
    </h2>

    <div class="flex flex-col gap-px">
      <button
        type="button"
        class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13.5px] transition hover:bg-(--color-card)"
        :class="!primary && !secondary ? 'font-semibold text-(--color-ink)' : 'font-medium text-(--color-ink-muted)'"
        @click="setDrill(null, null)"
      >
        <span class="bg-(--color-ink-muted) size-[3px] shrink-0 rounded-full" />
        <span class="flex-1 truncate">{{ t("mcpPanorama.sidebar.allMcps") }}</span>
        <span class="font-mono text-[10px] text-(--color-ink-muted)">{{ totalCount }}</span>
      </button>

      <template v-for="g in groups" :key="g.key">
        <button
          v-if="layer === 'industry'"
          type="button"
          class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13.5px] transition hover:bg-(--color-card)"
          :class="primary === g.key ? 'font-semibold text-(--color-ink)' : 'font-medium text-(--color-ink-muted)'"
          @click="setActivePrimary(g.key)"
        >
          <span class="bg-(--color-ink-muted) size-[3px] shrink-0 rounded-full" />
          <span class="flex-1 truncate">{{ rowTitle(g) }}</span>
          <span class="font-mono text-[10px] text-(--color-ink-muted)">{{ g.stats.total }}</span>
        </button>

        <template v-else-if="g.kind === 'domain'">
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
              class="flex flex-1 items-center gap-1.5 rounded-md px-1 py-1.5 text-left text-[13.5px] transition hover:bg-(--color-card)"
              :class="primary === g.key && !secondary
                ? 'font-semibold text-(--color-ink)'
                : 'font-medium text-(--color-ink-muted)'"
              @click="setActivePrimary(g.key)"
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
            class="flex w-full items-center gap-1.5 rounded-md py-1 pr-2 pl-7 text-left text-[12.5px] transition hover:bg-(--color-card)"
            :class="primary === g.key && secondary === p.key
              ? 'font-semibold text-(--color-ink)'
              : 'font-medium text-(--color-ink-muted)'"
            @click="setActivePdt(g.key, p.key)"
          >
            <span class="flex-1 truncate">{{ pdtDisplayTitle(p, locale) }}</span>
            <span class="font-mono text-[10px] text-(--color-ink-muted)">{{ pdtMcpCount(p.items) }}</span>
          </button>
        </template>
      </template>
    </div>
  </section>
</template>
