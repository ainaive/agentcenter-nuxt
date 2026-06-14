<script setup lang="ts">
import { ArrowRight, Check, Copy, Factory, Globe2, Link2, X } from "lucide-vue-next"
import {
  mcpDisplayBlurb,
  mcpDisplayName,
  toolDisplayName,
  type Group,
  type McpDto,
  type ToolDto,
} from "~~/shared/mcp-panorama"
import StatusBadge from "./StatusBadge.vue"

const props = defineProps<{
  active: { tool: ToolDto; mcp: McpDto } | null
  groups: Group[]
}>()

const emit = defineEmits<{
  close: []
  "switch-mcp": [{ tool: ToolDto; mcp: McpDto }]
}>()

const { locale, t } = useI18n()
const localePath = useLocalePath()

const open = computed(() => props.active !== null)
const tool = computed(() => props.active?.tool ?? null)
const mcp = computed(() => props.active?.mcp ?? null)

const toolName = computed(() =>
  tool.value ? toolDisplayName(tool.value, locale.value) : "",
)
const mcpName = computed(() =>
  mcp.value
    ? mcp.value.isPlaceholder
      ? toolName.value
      : mcpDisplayName(mcp.value, locale.value)
    : "",
)
const mcpBlurb = computed(() =>
  mcp.value ? mcpDisplayBlurb(mcp.value, locale.value) : "",
)

const ownerSummary = computed(() => {
  if (!tool.value) return ""
  const g = props.groups.find((x) => x.key === tool.value!.ownerPrimary)
  if (!g) return tool.value.ownerPrimary
  const primaryLabel = locale.value === "zh" ? g.labelZh : g.label
  if (tool.value.ownerSecondary && g.kind === "domain") {
    const pdt = g.pdts.find((p) => p.key === tool.value!.ownerSecondary)
    if (pdt) {
      const pdtLabel = locale.value === "zh" ? pdt.labelZh : pdt.label
      return `${primaryLabel} · ${pdtLabel}`
    }
  }
  return primaryLabel
})

const ownerLayer = computed<"industry" | "public">(() => {
  if (!tool.value) return "public"
  if (tool.value.ownerSecondary) return "public"
  return props.groups.find((g) => g.key === tool.value?.ownerPrimary)?.kind === "domain"
    ? "public"
    : "industry"
})

const endpoint = computed(() =>
  mcp.value && mcp.value.status === "released"
    ? `mcp://${mcp.value.slug}`
    : t("mcpPanorama.detail.notAvailable"),
)

const siblingMcps = computed<McpDto[]>(() => {
  if (!tool.value || !mcp.value) return []
  return tool.value.mcps.filter(
    (m) => m.id !== mcp.value!.id && !m.isPlaceholder,
  )
})

const downstreams = computed<{ tool: ToolDto; mcp: McpDto }[]>(() => {
  if (!tool.value || !mcp.value) return []
  // Deterministic pick from across the groups, capped at min(deps, 5) — purely
  // illustrative dependency list for the side panel. Walks the pool linearly
  // until n distinct MCPs are collected, so adjacent picks never collide.
  const all: { tool: ToolDto; mcp: McpDto }[] = []
  for (const g of props.groups) {
    for (const t of g.items) {
      for (const m of t.mcps) {
        if (m.id !== mcp.value.id && !m.isPlaceholder) all.push({ tool: t, mcp: m })
      }
    }
  }
  if (all.length === 0) return []
  const target = Math.min(mcp.value.depsCount, 5, all.length)
  const out: { tool: ToolDto; mcp: McpDto }[] = []
  const seen = new Set<number>()
  // Walk linearly from a deterministic offset, bounded by all.length so the
  // loop always terminates — `i += 13` only converges when gcd(13, all.length)
  // is 1, which isn't guaranteed for future seed sizes.
  const start = (((mcp.value.id * 7) % all.length) + all.length) % all.length
  for (let step = 0; step < all.length && out.length < target; step++) {
    const candidate = all[(start + step) % all.length]!
    if (seen.has(candidate.mcp.id)) continue
    seen.add(candidate.mcp.id)
    out.push(candidate)
  }
  return out
})

function pickMcp(t: ToolDto, m: McpDto) {
  emit("switch-mcp", { tool: t, mcp: m })
}

const copied = ref(false)
let copyResetTimer: ReturnType<typeof setTimeout> | null = null

async function copyEndpoint() {
  if (!mcp.value || mcp.value.status !== "released") return
  const uri = `mcp://${mcp.value.slug}`
  try {
    await navigator.clipboard.writeText(uri)
    copied.value = true
    if (copyResetTimer) clearTimeout(copyResetTimer)
    copyResetTimer = setTimeout(() => {
      copied.value = false
      copyResetTimer = null
    }, 1500)
  } catch {
    // Clipboard API unavailable (non-HTTPS dev, denied permission). Stay quiet.
  }
}

onBeforeUnmount(() => {
  if (copyResetTimer) clearTimeout(copyResetTimer)
})

// Reset the copied state when the active MCP changes so the icon doesn't
// stay on the green checkmark from a previous selection.
watch(mcp, () => {
  copied.value = false
  if (copyResetTimer) {
    clearTimeout(copyResetTimer)
    copyResetTimer = null
  }
})
</script>

<template>
  <aside
    class="fixed top-0 right-0 bottom-0 bg-(--color-card) overflow-hidden z-30 flex flex-col transition-[width] duration-300 ease-out"
    :class="open ? 'border-l-2 border-(--color-accent) shadow-[-20px_0_40px_-20px_rgba(40,28,15,0.18)]' : ''"
    :style="{ width: open ? '440px' : '0' }"
  >
    <template v-if="tool && mcp">
      <!-- Header -->
      <div class="px-6 pt-5 pb-4 border-b border-(--color-border) flex flex-col gap-3">
        <div class="flex justify-between items-start gap-3">
          <div class="flex flex-col gap-2 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span
                class="inline-flex items-center gap-1.5 px-2 py-[2px] rounded font-mono text-[10px] font-semibold tracking-wider uppercase"
                :class="ownerLayer === 'industry'
                  ? 'bg-(--color-layer-industry-bg) text-(--color-layer-industry)'
                  : 'bg-(--color-layer-public-bg) text-(--color-layer-public)'"
              >
                <Factory v-if="ownerLayer === 'industry'" :size="10" aria-hidden="true" />
                <Globe2 v-else :size="10" aria-hidden="true" />
                {{ t(`mcpPanorama.layer.${ownerLayer}Short`) }}
              </span>
              <StatusBadge :status="mcp.status" size="sm" />
            </div>
            <div class="font-mono text-[11px] tracking-wide uppercase text-(--color-ink-muted)">
              {{ t("mcpPanorama.detail.toolContext") }}
            </div>
            <h2 class="font-serif text-[24px] font-medium text-(--color-ink) tracking-tight leading-[1.15] m-0">
              {{ toolName }}
            </h2>
            <div v-if="!mcp.isPlaceholder" class="flex flex-col gap-0.5 mt-1">
              <span class="font-mono text-[11px] tracking-wide uppercase text-(--color-ink-muted)">
                {{ t("mcpPanorama.detail.mcp") }}
              </span>
              <span class="font-mono text-[15px] font-semibold text-(--color-ink) tracking-tight break-all">
                {{ mcpName }}
              </span>
            </div>
            <div class="text-[12px] text-(--color-ink-muted) font-mono">{{ ownerSummary }}</div>
          </div>
          <button
            type="button"
            class="bg-transparent border-0 p-2 rounded-md cursor-pointer text-(--color-ink-muted) shrink-0 hover:bg-(--color-sidebar) hover:text-(--color-ink) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent) transition"
            :aria-label="t('mcpPanorama.detail.close')"
            @click="emit('close')"
          >
            <X :size="16" />
          </button>
        </div>
        <p class="text-[14px] text-(--color-ink-muted) leading-snug m-0">{{ mcpBlurb }}</p>
      </div>

      <!-- Status description -->
      <div class="px-6 py-4 border-b border-(--color-border)">
        <div class="font-mono text-[11px] tracking-wide uppercase text-(--color-ink-muted) mb-1.5">
          {{ t("mcpPanorama.detail.mcpStatus") }}
        </div>
        <div class="text-[13px] text-(--color-ink) leading-snug">
          {{ t(`mcpPanorama.status.${mcp.status}.desc`) }}
        </div>
      </div>

      <!-- Tags row -->
      <div
        v-if="mcp.tags.length > 0"
        class="px-6 py-3 border-b border-(--color-border) flex flex-wrap gap-1"
      >
        <span
          v-for="tag in mcp.tags"
          :key="tag"
          class="font-mono text-[10px] px-1.5 py-[1px] bg-(--color-border)/40 text-(--color-ink-muted) rounded"
        >{{ tag }}</span>
      </div>

      <!-- Meta grid -->
      <div class="px-6 py-4 border-b border-(--color-border) grid grid-cols-2 gap-y-4 gap-x-4">
        <div class="flex flex-col gap-1 min-w-0">
          <span class="font-mono text-[11px] tracking-wide uppercase text-(--color-ink-muted)">
            {{ t("mcpPanorama.detail.dependents") }}
          </span>
          <span class="text-[13px] text-(--color-ink) truncate">
            {{ t("mcpPanorama.detail.depsCount", { count: mcp.depsCount }) }}
          </span>
        </div>
        <div class="flex flex-col gap-1 min-w-0">
          <span class="font-mono text-[11px] tracking-wide uppercase text-(--color-ink-muted)">
            {{ t("mcpPanorama.detail.owner") }}
          </span>
          <span class="text-[13px] text-(--color-ink) truncate">{{ ownerSummary }}</span>
        </div>
        <div class="flex flex-col gap-1 min-w-0 col-span-2">
          <span class="font-mono text-[11px] tracking-wide uppercase text-(--color-ink-muted)">
            {{ t("mcpPanorama.detail.endpoint") }}
          </span>
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="text-[13px] text-(--color-ink) font-mono truncate flex-1">{{ endpoint }}</span>
            <button
              v-if="mcp.status === 'released'"
              type="button"
              class="shrink-0 p-1 rounded text-(--color-ink-muted) hover:bg-(--color-border)/40 hover:text-(--color-ink) transition cursor-pointer"
              :aria-label="t('mcpPanorama.detail.copyEndpoint')"
              :title="copied ? t('mcpPanorama.detail.copied') : t('mcpPanorama.detail.copyEndpoint')"
              @click="copyEndpoint"
            >
              <Check v-if="copied" :size="12" class="text-(--color-status-released)" />
              <Copy v-else :size="12" />
            </button>
          </div>
        </div>
      </div>

      <!-- Other MCPs in this tool -->
      <div
        v-if="siblingMcps.length > 0"
        class="px-6 py-4 border-b border-(--color-border)"
      >
        <div class="font-mono text-[11px] tracking-wide uppercase text-(--color-ink-muted) mb-2.5">
          {{ t("mcpPanorama.detail.otherMcps") }}
        </div>
        <div class="flex flex-col gap-1.5">
          <button
            v-for="s in siblingMcps"
            :key="s.id"
            type="button"
            class="flex items-center justify-between p-2 border border-(--color-border) rounded-md gap-2 bg-transparent text-left cursor-pointer hover:border-(--color-ink-muted) transition"
            @click="pickMcp(tool, s)"
          >
            <div class="min-w-0 flex items-center gap-2">
              <span class="font-mono text-(--color-ink-muted) text-[14px] leading-none shrink-0" aria-hidden="true">·</span>
              <span class="font-mono text-[13px] font-medium text-(--color-ink) truncate break-all">
                {{ mcpDisplayName(s, locale) }}
              </span>
            </div>
            <StatusBadge :status="s.status" size="sm" />
          </button>
        </div>
      </div>

      <!-- Downstream tools -->
      <div class="px-6 py-4 flex-1 overflow-auto">
        <div class="font-mono text-[11px] tracking-wide uppercase text-(--color-ink-muted) mb-2.5">
          {{ t("mcpPanorama.detail.downstream", { count: mcp.depsCount }) }}
        </div>
        <div v-if="downstreams.length === 0" class="text-[13px] text-(--color-ink-muted) italic">
          {{ t("mcpPanorama.detail.empty") }}
        </div>
        <div v-else class="flex flex-col gap-1.5">
          <div
            v-for="d in downstreams"
            :key="d.mcp.id"
            class="flex items-center justify-between p-2 border border-(--color-border) rounded-md gap-2"
          >
            <div class="min-w-0 flex items-center gap-2">
              <span class="font-mono text-(--color-ink-muted) text-[14px] leading-none shrink-0" aria-hidden="true">·</span>
              <div class="min-w-0 flex flex-col gap-0.5">
                <span class="text-[13px] font-medium text-(--color-ink) truncate">
                  {{ mcpDisplayName(d.mcp, locale) }}
                </span>
                <span class="text-[10px] text-(--color-ink-muted) font-mono truncate">
                  {{ toolDisplayName(d.tool, locale) }} · {{ d.tool.ownerPrimary }}<span v-if="d.tool.ownerSecondary"> · {{ d.tool.ownerSecondary }}</span>
                </span>
              </div>
            </div>
            <StatusBadge :status="d.mcp.status" size="sm" />
          </div>
        </div>
      </div>

      <!-- Footer actions -->
      <div class="px-6 py-3.5 border-t border-(--color-border) flex gap-2 bg-(--color-bg)">
        <NuxtLink
          v-if="mcp.status === 'released' && mcp.extensionSlug"
          :to="localePath(`/extensions/${mcp.extensionSlug}`)"
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
          {{ mcp.status === "dev" ? t("mcpPanorama.detail.trackProgress") : t("mcpPanorama.detail.requestBuild") }}
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
