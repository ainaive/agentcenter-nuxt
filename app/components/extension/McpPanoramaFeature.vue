<script setup lang="ts">
import { ArrowUpRight } from "lucide-vue-next"
import type { LayerPayload } from "~~/shared/mcp-panorama"

const { t } = useI18n()
const localePath = useLocalePath()

// Same key as the panorama page uses, so this dedupes when the user
// later navigates over.
const { data } = await useFetch<LayerPayload>("/api/internal/mcp-landscape", {
  query: { layer: "public" },
  key: "mcp-landscape",
})

const stats = computed(() => {
  const payload = data.value
  if (!payload) return null
  return {
    domains: payload.groups.length,
    tools: payload.layerStats.total,
  }
})

// Decorative motif: a fixed 4x6 grid of cells using the three status tokens
// at low opacity. Deterministic pattern, no randomness — purely visual.
const motif = Array.from({ length: 24 }, (_, i) => {
  const r = (i * 7 + 3) % 11
  if (r < 5) return "released"
  if (r < 8) return "dev"
  return "none"
})
</script>

<template>
  <NuxtLink
    :to="localePath('/mcp-panorama')"
    class="group relative block mb-7 overflow-hidden rounded-xl border border-(--color-border) border-l-2 border-l-(--color-accent) bg-(--color-card) transition hover:border-(--color-accent)/50"
  >
    <div class="flex flex-col gap-6 px-6 py-6 md:flex-row md:items-center md:gap-8 md:px-8 md:py-7">
      <div class="flex-1 min-w-0">
        <div class="font-mono text-[11px] tracking-[0.12em] text-(--color-ink-muted)">
          {{ t("extensions.mcpPanoramaFeature.eyebrow") }}
        </div>
        <h2 class="mt-2 font-serif text-[24px] md:text-[26px] font-medium tracking-tight text-(--color-ink) leading-[1.15]">
          {{ t("extensions.mcpPanoramaFeature.title") }}
        </h2>
        <p class="mt-2 max-w-2xl text-[14px] text-(--color-ink-muted) leading-snug">
          {{ t("extensions.mcpPanoramaFeature.description") }}
        </p>
        <div class="mt-4 flex items-center justify-between gap-3 flex-wrap">
          <span class="font-mono text-[12px] text-(--color-ink-muted)">
            {{ stats
              ? t("extensions.mcpPanoramaFeature.stats", stats)
              : t("extensions.mcpPanoramaFeature.statsFallback") }}
          </span>
          <span class="inline-flex items-center gap-1.5 text-[13px] font-medium text-(--color-accent) transition group-hover:gap-2.5">
            {{ t("extensions.mcpPanoramaFeature.cta") }}
            <ArrowUpRight :size="14" aria-hidden="true" />
          </span>
        </div>
      </div>

      <div
        class="hidden md:grid shrink-0 grid-cols-6 gap-1.5 self-stretch items-center"
        aria-hidden="true"
      >
        <span
          v-for="(s, i) in motif"
          :key="i"
          class="size-3 rounded-[3px]"
          :class="[
            s === 'released' && 'bg-(--color-status-released)/55',
            s === 'dev' && 'bg-(--color-status-dev)/45',
            s === 'none' && 'bg-(--color-ink-muted)/20',
          ]"
        />
      </div>
    </div>
  </NuxtLink>
</template>
