<script setup lang="ts">
import { ChevronDown, ChevronRight, Factory, Globe2, Sparkles } from "lucide-vue-next"
import {
  groupDisplayTitle,
  pdtDisplayTitle,
  type Group,
  type Layer,
} from "~~/shared/mcp-panorama"

const props = defineProps<{
  layer: Layer
  groups: Group[]
  totalCount: number
  activePrimary: string | null
  activeSecondary: string | null
}>()

const emit = defineEmits<{
  "update:layer": [Layer]
  setActive: [primary: string | null, secondary: string | null]
}>()

const { locale, t } = useI18n()

const expanded = ref<Record<string, boolean>>({})

watch(
  () => props.layer,
  () => {
    expanded.value = {}
  },
)

watch(
  () => props.activePrimary,
  (k) => {
    if (k && props.layer === "public") expanded.value = { ...expanded.value, [k]: true }
  },
)

function setActivePrimary(key: string) {
  if (props.activePrimary === key && !props.activeSecondary) {
    emit("setActive", null, null)
  } else {
    emit("setActive", key, null)
    if (props.layer === "public") expanded.value = { ...expanded.value, [key]: true }
  }
}

function setActivePdt(domainKey: string, pdtKey: string) {
  const isActive = props.activePrimary === domainKey && props.activeSecondary === pdtKey
  // Always keep the domain selected; clicking the active PDT only clears the secondary.
  emit("setActive", domainKey, isActive ? null : pdtKey)
}

function toggle(k: string) {
  expanded.value = { ...expanded.value, [k]: !expanded.value[k] }
}

function rowTitle(g: Group): string {
  return groupDisplayTitle(g, locale.value)
}
</script>

<template>
  <nav class="w-[268px] shrink-0 bg-(--color-sidebar) border-r border-(--color-border) flex flex-col overflow-hidden h-full">
    <!-- Layer toggle -->
    <div class="px-4 pt-4 pb-3 border-b border-(--color-border)">
      <div class="font-mono text-[10px] tracking-wider uppercase text-(--color-ink-muted) mb-2">
        {{ t("mcpPanorama.sidebar.serviceLayer") }}
      </div>
      <div
        class="grid grid-cols-2 gap-1.5 bg-(--color-bg) p-1 rounded-lg border border-(--color-border)"
      >
        <button
          type="button"
          class="px-2.5 py-2 rounded-md cursor-pointer text-[12px] flex flex-col items-start gap-0.5 transition-all"
          :class="layer === 'industry'
            ? 'bg-(--color-card) text-(--color-ink) font-semibold shadow-[0_1px_3px_rgba(60,40,20,0.08)]'
            : 'bg-transparent text-(--color-ink-muted) font-medium'"
          @click="emit('update:layer', 'industry')"
        >
          <span class="flex items-center gap-1.5">
            <Factory
              :size="12"
              :class="layer === 'industry' ? 'text-(--color-layer-industry)' : 'text-(--color-ink-muted)'"
              aria-hidden="true"
            />
            {{ t("mcpPanorama.layer.industryShort") }}
          </span>
          <span class="text-[10px] text-(--color-ink-muted) font-mono">
            {{ t("mcpPanorama.layer.industryDesc") }}
          </span>
        </button>
        <button
          type="button"
          class="px-2.5 py-2 rounded-md cursor-pointer text-[12px] flex flex-col items-start gap-0.5 transition-all"
          :class="layer === 'public'
            ? 'bg-(--color-card) text-(--color-ink) font-semibold shadow-[0_1px_3px_rgba(60,40,20,0.08)]'
            : 'bg-transparent text-(--color-ink-muted) font-medium'"
          @click="emit('update:layer', 'public')"
        >
          <span class="flex items-center gap-1.5">
            <Globe2
              :size="12"
              :class="layer === 'public' ? 'text-(--color-layer-public)' : 'text-(--color-ink-muted)'"
              aria-hidden="true"
            />
            {{ t("mcpPanorama.layer.publicShort") }}
          </span>
          <span class="text-[10px] text-(--color-ink-muted) font-mono">
            {{ t("mcpPanorama.layer.publicDesc") }}
          </span>
        </button>
      </div>
    </div>

    <!-- Tree -->
    <div class="flex-1 overflow-auto px-2 py-3">
      <div class="font-mono text-[10px] tracking-wider uppercase text-(--color-ink-muted) px-2.5 pb-2">
        {{ layer === "industry" ? t("mcpPanorama.sidebar.sectors") : t("mcpPanorama.sidebar.domainsPdts") }}
      </div>

      <button
        type="button"
        class="w-full flex items-center gap-1.5 px-2.5 py-1.5 my-px rounded-md text-[13px] tracking-tight transition relative"
        :class="!activePrimary && !activeSecondary
          ? 'bg-(--color-accent)/10 text-(--color-accent) font-semibold'
          : 'text-(--color-ink) font-medium hover:bg-(--color-bg)'"
        @click="emit('setActive', null, null)"
      >
        <span class="w-3" />
        <span class="flex-1 text-left truncate">{{ t("mcpPanorama.sidebar.allTools") }}</span>
        <span class="font-mono text-[10px] text-(--color-ink-muted)">{{ totalCount }}</span>
      </button>

      <template v-for="g in groups" :key="g.key">
        <!-- Industry row (no children) -->
        <button
          v-if="layer === 'industry'"
          type="button"
          class="w-full flex items-center gap-1.5 px-2.5 py-1.5 my-px rounded-md text-[13px] tracking-tight transition relative"
          :class="activePrimary === g.key
            ? 'bg-(--color-accent)/10 text-(--color-accent) font-semibold'
            : 'text-(--color-ink) font-medium hover:bg-(--color-bg)'"
          @click="setActivePrimary(g.key)"
        >
          <span class="w-3" />
          <span class="flex-1 text-left truncate">{{ rowTitle(g) }}</span>
          <span class="font-mono text-[10px] text-(--color-ink-muted)">{{ g.items.length }}</span>
        </button>
        <!-- Public domain (expandable) -->
        <template v-else-if="g.kind === 'domain'">
          <div class="flex items-center my-px">
            <button
              type="button"
              class="size-6 rounded p-1 flex items-center justify-center text-(--color-ink-muted) hover:text-(--color-ink)"
              :aria-expanded="expanded[g.key] ?? false"
              @click="toggle(g.key)"
            >
              <ChevronDown v-if="expanded[g.key]" :size="12" aria-hidden="true" />
              <ChevronRight v-else :size="12" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="flex-1 flex items-center gap-1.5 px-1 py-1.5 rounded-md text-[13px] tracking-tight transition relative"
              :class="activePrimary === g.key && !activeSecondary
                ? 'bg-(--color-accent)/10 text-(--color-accent) font-semibold'
                : 'text-(--color-ink) font-medium hover:bg-(--color-bg)'"
              @click="setActivePrimary(g.key)"
            >
              <span class="flex-1 text-left truncate">{{ rowTitle(g) }}</span>
              <span class="font-mono text-[10px] text-(--color-ink-muted)">{{ g.items.length }}</span>
            </button>
          </div>
          <button
            v-for="p in g.pdts"
            v-show="expanded[g.key]"
            :key="p.key"
            type="button"
            class="w-full flex items-center gap-1.5 pl-7 pr-2.5 py-1 my-px rounded-md text-[12.5px] tracking-tight transition relative"
            :class="activePrimary === g.key && activeSecondary === p.key
              ? 'bg-(--color-accent)/10 text-(--color-accent) font-semibold'
              : 'text-(--color-ink) font-medium hover:bg-(--color-bg)'"
            @click="setActivePdt(g.key, p.key)"
          >
            <span class="flex-1 text-left truncate">{{ pdtDisplayTitle(p, locale) }}</span>
            <span class="font-mono text-[10px] text-(--color-ink-muted)">{{ p.items.length }}</span>
          </button>
        </template>
      </template>
    </div>

    <!-- Footer hint -->
    <div class="px-4 py-3.5 border-t border-(--color-border) bg-(--color-bg) text-[11px] text-(--color-ink-muted) leading-snug">
      <div class="flex items-center gap-1.5 mb-1 text-(--color-ink) font-semibold">
        <Sparkles :size="12" aria-hidden="true" />
        <span>{{ t("mcpPanorama.sidebar.pushToMcp") }}</span>
      </div>
      {{ t("mcpPanorama.sidebar.pushToMcpHint") }}
    </div>
  </nav>
</template>
