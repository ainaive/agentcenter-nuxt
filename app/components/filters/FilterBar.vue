<script setup lang="ts">
import type { CreatorFacet, PublisherFacet, TagFacet } from "~~/shared/types"

defineProps<{
  creators?: CreatorFacet[]
  publishers?: PublisherFacet[]
  tags?: TagFacet[]
}>()
</script>

<template>
  <div class="mb-5 flex flex-col gap-3 border-b border-(--color-border) pb-4">
    <div class="flex flex-wrap items-center gap-3">
      <ScopePills />
      <DeptPicker />
      <CreatorPicker v-if="creators" :creators="creators" />
      <PublisherPicker v-if="publishers" :publishers="publishers" />
    </div>
    <TagDrawer v-if="tags && tags.length" :tags="tags" />
    <div class="flex flex-wrap items-center justify-between gap-3">
      <FilterChips />
      <SortSelect />
    </div>
  </div>
</template>
