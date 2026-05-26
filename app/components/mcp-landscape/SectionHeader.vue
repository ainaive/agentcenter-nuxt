<script setup lang="ts">
import { LayoutGrid, List } from "lucide-vue-next"
import type { McpStatus } from "~~/shared/data/mcp-landscape"
import { STATUS_ORDER } from "~~/shared/mcp-panorama"
import StatusChip from "./StatusChip.vue"

defineProps<{
  visibleCounts: { total: number; released: number; dev: number; none: number }
  totals: { total: number }
  statusFilter: "all" | McpStatus
  viewMode: "panorama" | "list"
}>()

const emit = defineEmits<{
  "update:statusFilter": ["all" | McpStatus]
  "update:viewMode": ["panorama" | "list"]
}>()

const { t } = useI18n()

function statusLabel(s: McpStatus): string {
  return t(`mcpPanorama.status.${s}.label`)
}
</script>

<template>
  <div class="pt-2 pb-4 flex flex-col">
    <!-- Tier 1: title -->
    <div class="min-w-0">
      <h1 class="font-serif text-[36px] font-medium tracking-tight m-0 text-(--color-ink) leading-[1.05]">
        {{ t("mcpPanorama.page.title") }}
      </h1>
      <p class="mt-1.5 text-[13px] text-(--color-ink-muted)">
        {{ t("mcpPanorama.page.subtitleAll", { visible: visibleCounts.total, total: totals.total }) }}
      </p>
    </div>

    <!-- Tier 2: controls -->
    <div class="mt-5 pt-4 border-t border-(--color-border) flex items-center gap-3 flex-wrap">
      <div class="flex items-center gap-2 flex-wrap">
        <StatusChip
          value="all"
          :label="t('mcpPanorama.filter.all')"
          :count="visibleCounts.total"
          :active="statusFilter === 'all'"
          @click="emit('update:statusFilter', 'all')"
        />
        <StatusChip
          v-for="s in STATUS_ORDER"
          :key="s"
          :value="s"
          :label="statusLabel(s)"
          :count="visibleCounts[s]"
          :active="statusFilter === s"
          @click="emit('update:statusFilter', statusFilter === s ? 'all' : s)"
        />
      </div>

      <div class="ml-auto flex items-center gap-3 flex-wrap">
        <div class="flex p-[3px] rounded-lg bg-(--color-bg) border border-(--color-border) shrink-0">
          <button
            type="button"
            class="inline-flex items-center justify-center size-7 rounded-md cursor-pointer transition"
            :class="viewMode === 'panorama'
              ? 'bg-(--color-card) text-(--color-ink) shadow-[0_1px_2px_rgba(60,40,20,0.06)]'
              : 'text-(--color-ink-muted) hover:text-(--color-ink)'"
            :aria-label="t('mcpPanorama.view.panorama')"
            :aria-pressed="viewMode === 'panorama'"
            @click="emit('update:viewMode', 'panorama')"
          >
            <LayoutGrid :size="14" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="inline-flex items-center justify-center size-7 rounded-md cursor-pointer transition"
            :class="viewMode === 'list'
              ? 'bg-(--color-card) text-(--color-ink) shadow-[0_1px_2px_rgba(60,40,20,0.06)]'
              : 'text-(--color-ink-muted) hover:text-(--color-ink)'"
            :aria-label="t('mcpPanorama.view.list')"
            :aria-pressed="viewMode === 'list'"
            @click="emit('update:viewMode', 'list')"
          >
            <List :size="14" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
