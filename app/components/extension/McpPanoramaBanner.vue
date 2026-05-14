<script setup lang="ts">
import { ChevronRight, LayoutGrid } from "lucide-vue-next"

const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <NuxtLink
    :to="localePath('/mcp-panorama')"
    class="mb-5 flex items-center gap-3.5 rounded-lg border border-(--color-accent)/25 bg-(--color-accent)/8 px-4 py-3 text-(--color-ink) transition hover:bg-(--color-accent)/12"
  >
    <span class="flex size-9 shrink-0 items-center justify-center rounded-md bg-(--color-accent) text-(--color-accent-fg)">
      <LayoutGrid :size="18" aria-hidden="true" />
    </span>
    <span class="flex flex-1 flex-col leading-snug min-w-0">
      <span class="text-[14px] font-semibold text-(--color-ink)">
        {{ t("extensions.mcpPanoramaBanner.title") }}
      </span>
      <span class="text-[12.5px] text-(--color-ink-muted) truncate">
        {{ t("extensions.mcpPanoramaBanner.subtitle") }}
      </span>
    </span>
    <span class="inline-flex items-center gap-1 text-[12.5px] font-medium text-(--color-accent) shrink-0">
      {{ t("extensions.mcpPanoramaBanner.cta") }}
      <ChevronRight :size="14" aria-hidden="true" />
    </span>
  </NuxtLink>
</template>
