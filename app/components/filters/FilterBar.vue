<script setup lang="ts">
import type { CreatorFacet, PublisherFacet, TagFacet } from "~~/shared/types"

defineProps<{
  creators?: CreatorFacet[]
  publishers?: PublisherFacet[]
  tags?: TagFacet[]
}>()
</script>

<template>
  <div class="mb-6 flex flex-wrap items-center gap-2">
    <ScopePills />
    <DeptPicker />
    <CreatorPicker v-if="creators" :creators="creators" />
    <PublisherPicker v-if="publishers" :publishers="publishers" />
    <TagDrawer v-if="tags && tags.length" :tags="tags" />
  </div>
</template>
