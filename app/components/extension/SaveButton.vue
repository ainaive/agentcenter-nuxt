<script setup lang="ts">
import SaveToCollectionPopover from "./SaveToCollectionPopover.vue"

defineProps<{
  extensionId: string
  variant?: "pill" | "icon"
}>()
</script>

<template>
  <SaveToCollectionPopover :extension-id="extensionId" :variant="variant" />
</template>
