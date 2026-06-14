<script setup lang="ts">
import type { CreatorFacet } from "~~/shared/types"

const props = defineProps<{
  creators: CreatorFacet[]
}>()

const { t } = useI18n()
const { filters, update } = useFilters()

function creatorLabel(c: CreatorFacet): string {
  return c.name && c.name.trim() ? c.name : c.email
}

const options = computed(() =>
  props.creators.map((c) => ({ id: c.id, label: creatorLabel(c), count: c.count })),
)
</script>

<template>
  <FilterPicker
    :options="options"
    :active-id="filters.creator"
    :label="t('filters.creator.label')"
    :any-label="t('filters.creator.any')"
    :empty-label="t('filters.creator.empty')"
    @select="(id) => update({ creator: id })"
  />
</template>
