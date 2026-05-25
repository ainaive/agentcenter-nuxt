<script setup lang="ts">
import type { TagFacet } from "~~/shared/types"

const props = defineProps<{ tags: TagFacet[] }>()

const { t, locale } = useI18n()
const localePath = useLocalePath()

const topTags = computed(() =>
  [...props.tags].sort((a, b) => b.count - a.count).slice(0, 8),
)

function labelOf(tag: TagFacet) {
  return locale.value === "zh" && tag.labelZh ? tag.labelZh : tag.labelEn
}
</script>

<template>
  <nav :aria-label="t('home.tagRailLabel')" class="flex gap-2 overflow-x-auto whitespace-nowrap pb-1">
    <NuxtLink
      :to="localePath({ path: '/extensions', query: { category: 'skills' } })"
      class="shrink-0 rounded-full border border-(--color-border) px-3 py-1 text-[12px] font-semibold text-(--color-ink) transition hover:border-(--color-ink)/30"
    >
      {{ t("home.tagRailAll") }}
    </NuxtLink>
    <NuxtLink
      v-for="tag in topTags"
      :key="tag.id"
      :to="localePath({ path: '/extensions', query: { category: 'skills', tags: tag.id } })"
      class="shrink-0 rounded-full border border-(--color-border) px-3 py-1 text-[12px] font-medium text-(--color-ink-muted) transition hover:border-(--color-ink)/25 hover:text-(--color-ink)"
    >
      {{ labelOf(tag) }}
    </NuxtLink>
  </nav>
</template>
