<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { PopoverTrigger, type PopoverTriggerProps, useForwardProps } from "reka-ui"

const props = defineProps<PopoverTriggerProps & { class?: HTMLAttributes["class"] }>()

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
