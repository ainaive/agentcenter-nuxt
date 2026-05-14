<script setup lang="ts">
import { groupDisplayTitle, rankFor, STATUS_ORDER, type Group } from "~~/shared/mcp-panorama"

const props = defineProps<{ group: Group }>()

const { locale, t } = useI18n()
const displayTitle = computed(() => groupDisplayTitle(props.group, locale.value))
const rank = computed(() => rankFor(props.group.stats))

const rankClass = computed(() => {
  switch (rank.value) {
    case "leading": return "bg-(--color-status-released-bg) text-(--color-status-released)"
    case "onTrack": return "bg-[oklch(95%_0.03_110)] text-[oklch(38%_0.07_110)] dark:bg-[oklch(22%_0.04_110)] dark:text-[oklch(72%_0.12_110)]"
    case "lagging": return "bg-[oklch(95%_0.04_50)] text-[oklch(40%_0.10_30)] dark:bg-[oklch(22%_0.04_30)] dark:text-[oklch(75%_0.14_30)]"
    case "early":   return "bg-(--color-status-none-bg) text-(--color-status-none)"
    default: return ""
  }
})
</script>

<template>
  <header class="flex flex-col gap-2">
    <div class="flex items-baseline justify-between gap-2.5">
      <div class="flex items-baseline gap-2 min-w-0">
        <h3 class="font-serif text-[18px] font-medium tracking-tight m-0 truncate text-(--color-ink)">
          {{ displayTitle }}
        </h3>
        <span class="font-mono text-[11px] text-(--color-ink-muted)">{{ group.items.length }}</span>
      </div>
      <span
        v-if="rank"
        class="px-2 py-[2px] rounded font-mono text-[10px] font-semibold tracking-wider uppercase shrink-0"
        :class="rankClass"
      >
        {{ t(`mcpPanorama.rank.${rank}`) }}
      </span>
    </div>

    <div>
      <div class="flex h-[5px] rounded overflow-hidden bg-(--color-bg)">
        <template v-for="s in STATUS_ORDER" :key="s">
          <div
            v-if="group.stats.counts[s] > 0"
            :title="`${t(`mcpPanorama.status.${s}.label`)}: ${group.stats.counts[s]}`"
            :class="[
              'h-full',
              s === 'released' && 'bg-(--color-status-released)',
              s === 'dev' && 'bg-(--color-status-dev)',
              s === 'none' && 'bg-(--color-status-none) opacity-50',
            ]"
            :style="{ flex: group.stats.counts[s] }"
          />
        </template>
      </div>
      <div class="mt-1.5 flex justify-between font-mono text-[10px] text-(--color-ink-muted)">
        <span class="inline-flex gap-2.5">
          <span class="inline-flex items-center gap-1">
            <span class="size-[5px] rounded-full bg-(--color-status-released)" />
            <span class="text-(--color-ink) font-semibold">{{ group.stats.counts.released }}</span>
            <span class="opacity-70">{{ t("mcpPanorama.card.live") }}</span>
          </span>
          <span class="inline-flex items-center gap-1">
            <span class="size-[5px] rounded-full bg-(--color-status-dev)" />
            <span class="text-(--color-ink) font-semibold">{{ group.stats.counts.dev }}</span>
            <span class="opacity-70">{{ t("mcpPanorama.card.dev") }}</span>
          </span>
          <span class="inline-flex items-center gap-1">
            <span class="size-[5px] rounded-full bg-(--color-status-none) opacity-60" />
            <span class="text-(--color-ink) font-semibold">{{ group.stats.counts.none }}</span>
          </span>
        </span>
        <span class="text-(--color-ink) font-semibold">
          {{ t("mcpPanorama.card.liveSuffix", { pct: group.stats.releasedPct }) }}
        </span>
      </div>
    </div>
  </header>
</template>
