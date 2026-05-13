<script setup lang="ts">
import { PopoverTrigger, type PopoverTriggerProps, useForwardProps } from "reka-ui"

const props = defineProps<PopoverTriggerProps & { class?: string }>()

const forwarded = useForwardProps(
  computed(() => {
    const { class: _, ...rest } = props
    return rest
  }),
)
</script>

<template>
  <PopoverTrigger v-bind="forwarded" :class="props.class">
    <slot />
  </PopoverTrigger>
</template>
