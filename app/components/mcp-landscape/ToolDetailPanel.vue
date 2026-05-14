<script setup lang="ts">
import { ArrowRight, Factory, Globe2, Link2, X } from "lucide-vue-next"
import {
  toolDisplayBlurb,
  toolDisplayName,
  type Group,
  type ToolDto,
} from "~~/shared/mcp-panorama"
import StatusPill from "./StatusPill.vue"

const props = defineProps<{
  tool: ToolDto | null
  groups: Group[]
}>()

const emit = defineEmits<{ close: [] }>()

const { locale, t } = useI18n()
const localePath = useLocalePath()

const open = computed(() => props.tool !== null)

const displayName = computed(() => (props.tool ? toolDisplayName(props.tool, locale.value) : ""))
const displayBlurb = computed(() => (props.tool ? toolDisplayBlurb(props.tool, locale.value) : ""))

const ownerSummary = computed(() => {
  if (!props.tool) return ""
  const g = props.groups.find((x) => x.key === props.tool!.ownerPrimary)
  if (!g) return props.tool.ownerPrimary
  const primaryLabel = locale.value === "zh" ? g.labelZh : g.label
  if (props.tool.ownerSecondary && g.kind === "domain") {
    const pdt = g.pdts.find((p) => p.key === props.tool!.ownerSecondary)
    if (pdt) {
      const pdtLabel = locale.value === "zh" ? pdt.labelZh : pdt.label
      return `${primaryLabel} · ${pdtLabel}`
    }
  }
  return primaryLabel
})

const ownerLayer = computed<"industry" | "public">(() => {
  if (!props.tool) return "public"
  return props.tool.ownerSecondary ? "public" : props.groups.find((g) => g.key === props.tool?.ownerPrimary)?.kind === "domain" ? "public" : "industry"
})

const endpoint = computed(() =>
  props.tool && props.tool.status === "released"
    ? `mcp://${props.tool.slug}`
    : t("mcpPanorama.detail.notAvailable"),
)

const downstreams = computed<ToolDto[]>(() => {
  if (!props.tool) return []
  // Deterministic pick from across the groups, capped at min(deps, 5) — purely
  // illustrative dependency list for the side panel.
  const all = props.groups.flatMap((g) => g.items).filter((x) => x.id !== props.tool!.id)
  if (all.length === 0) return []
  const seed = props.tool.id * 7
  const n = Math.min(props.tool.depsCount, 5)
  const out: ToolDto[] = []
  for (let i = 0; i < n; i++) {
    out.push(all[(seed + i * 13) % all.length]!)
  }
  return out
})
</script>

<template>
  <aside
    class="fixed top-0 right-0 bottom-0 bg-(--color-card) overflow-hidden z-30 flex flex-col transition-[width] duration-300 ease-out"
    :class="open ? 'border-l border-(--color-border) shadow-[-20px_0_40px_-20px_rgba(40,28,15,0.18)]' : ''"
    :style="{ width: open ? '440px' : '0' }"
  >
    <template v-if="tool">
      <!-- Header -->
      <div class="px-6 pt-5 pb-4 border-b border-(--color-border) flex flex-col gap-3">
        <div class="flex justify-between items-start gap-3">
          <div class="flex flex-col gap-1.5 min-w-0">
            <span
              class="self-start inline-flex items-center gap-1.5 px-2 py-[2px] rounded font-mono text-[10px] font-semibold tracking-wider uppercase"
              :class="ownerLayer === 'industry'
                ? 'bg-(--color-layer-industry-bg) text-(--color-layer-industry)'
                : 'bg-(--color-layer-public-bg) text-(--color-layer-public)'"
            >
              <Factory v-if="ownerLayer === 'industry'" :size="10" aria-hidden="true" />
              <Globe2 v-else :size="10" aria-hidden="true" />
              {{ t(`mcpPanorama.layer.${ownerLayer}Short`) }}
            </span>
            <h2 class="font-serif text-[28px] font-medium text-(--color-ink) tracking-tight leading-[1.1] m-0">
              {{ displayName }}
            </h2>
            <div class="text-[12px] text-(--color-ink-muted) font-mono">{{ ownerSummary }}</div>
          </div>
          <button
            type="button"
            class="bg-transparent border-0 p-1.5 rounded-md cursor-pointer text-(--color-ink-muted) shrink-0"
            :aria-label="t('mcpPanorama.detail.close')"
            @click="emit('close')"
          >
            <X :size="16" />
          </button>
        </div>
        <p class="text-[14px] text-(--color-ink-muted) leading-snug m-0">{{ displayBlurb }}</p>
      </div>

      <!-- Status block -->
      <div class="px-6 py-4 border-b border-(--color-border)">
        <div class="flex items-center justify-between mb-2.5">
          <span class="font-mono text-[11px] tracking-wide uppercase text-(--color-ink-muted)">
            {{ t("mcpPanorama.detail.mcpStatus") }}
          </span>
          <StatusPill :status="tool.status" size="md" />
        </div>
        <div class="text-[13px] text-(--color-ink) leading-snug">
          {{ t(`mcpPanorama.status.${tool.status}.desc`) }}
        </div>
      </div>

      <!-- Meta grid -->
      <div class="px-6 py-4 border-b border-(--color-border) grid grid-cols-2 gap-y-3.5 gap-x-4">
        <div class="flex flex-col gap-1 min-w-0">
          <span class="font-mono text-[10px] tracking-wide uppercase text-(--color-ink-muted)">
            {{ t("mcpPanorama.detail.dependents") }}
          </span>
          <span class="text-[13px] text-(--color-ink) truncate">
            {{ t("mcpPanorama.detail.depsCount", { count: tool.depsCount }) }}
          </span>
        </div>
        <div class="flex flex-col gap-1 min-w-0">
          <span class="font-mono text-[10px] tracking-wide uppercase text-(--color-ink-muted)">
            {{ t("mcpPanorama.detail.owner") }}
          </span>
          <span class="text-[13px] text-(--color-ink) truncate">{{ ownerSummary }}</span>
        </div>
        <div class="flex flex-col gap-1 min-w-0 col-span-2">
          <span class="font-mono text-[10px] tracking-wide uppercase text-(--color-ink-muted)">
            {{ t("mcpPanorama.detail.endpoint") }}
          </span>
          <span class="text-[13px] text-(--color-ink) font-mono truncate">{{ endpoint }}</span>
        </div>
      </div>

      <!-- Downstream tools -->
      <div class="px-6 py-4 flex-1 overflow-auto">
        <div class="font-mono text-[11px] tracking-wide uppercase text-(--color-ink-muted) mb-2.5">
          {{ t("mcpPanorama.detail.downstream", { count: tool.depsCount }) }}
        </div>
        <div v-if="downstreams.length === 0" class="text-[13px] text-(--color-ink-muted) italic">
          {{ t("mcpPanorama.detail.empty") }}
        </div>
        <div v-else class="flex flex-col gap-1.5">
          <div
            v-for="d in downstreams"
            :key="d.id"
            class="flex items-center justify-between p-2 border border-(--color-border) rounded-md gap-2"
          >
            <div class="min-w-0 flex flex-col gap-0.5">
              <span class="text-[13px] font-medium text-(--color-ink)">
                {{ toolDisplayName(d, locale) }}
              </span>
              <span class="text-[10px] text-(--color-ink-muted) font-mono">
                {{ d.ownerPrimary }}<span v-if="d.ownerSecondary"> · {{ d.ownerSecondary }}</span>
              </span>
            </div>
            <StatusPill :status="d.status" size="sm" />
          </div>
        </div>
      </div>

      <!-- Footer actions -->
      <div class="px-6 py-3.5 border-t border-(--color-border) flex gap-2 bg-(--color-bg)">
        <NuxtLink
          v-if="tool.status === 'released' && tool.extensionSlug"
          :to="localePath(`/extensions/${tool.extensionSlug}`)"
          class="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-md text-[13px] font-medium bg-(--color-accent) text-(--color-accent-fg) cursor-pointer no-underline"
        >
          <ArrowRight :size="12" aria-hidden="true" />
          {{ t("mcpPanorama.detail.openInMarketplace") }}
        </NuxtLink>
        <button
          v-else
          type="button"
          class="flex-1 px-3.5 py-2 rounded-md text-[13px] font-medium bg-(--color-card) text-(--color-ink) border border-(--color-ink-muted) cursor-pointer"
        >
          {{ tool.status === "dev" ? t("mcpPanorama.detail.trackProgress") : t("mcpPanorama.detail.requestBuild") }}
        </button>
        <button
          type="button"
          class="px-3.5 py-2 rounded-md text-[13px] bg-(--color-card) text-(--color-ink-muted) border border-(--color-border) cursor-pointer inline-flex items-center gap-1.5"
        >
          <Link2 :size="12" aria-hidden="true" />
          {{ t("mcpPanorama.detail.docs") }}
        </button>
      </div>
    </template>
  </aside>
</template>
