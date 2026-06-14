<script setup lang="ts">
import type { PublisherFacet } from "~~/shared/types"

const props = defineProps<{
  publishers: PublisherFacet[]
}>()

const { t, locale } = useI18n()
const { filters, update } = useFilters()

function publisherLabel(p: PublisherFacet): string {
  if (locale.value === "zh" && p.nameZh) return p.nameZh
  return p.name
}

const options = computed(() =>
  props.publishers.map((p) => ({ id: p.id, label: publisherLabel(p), count: p.count })),
)
</script>

<template>
  <FilterPicker
    :options="options"
    :active-id="filters.publisher"
    :label="t('filters.publisher.label')"
    :any-label="t('filters.publisher.any')"
    :empty-label="t('filters.publisher.empty')"
    @select="(id) => update({ publisher: id })"
  />
</template>
