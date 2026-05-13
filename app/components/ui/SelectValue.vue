<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { SelectValue, type SelectValueProps, useForwardProps } from "reka-ui"

const props = defineProps<SelectValueProps & { class?: HTMLAttributes["class"]; placeholder?: string }>()

const forwarded = useForwardProps(
  computed(() => {
    const { class: _, ...rest } = props
    return rest
  }),
)
</script>

<template>
  <SelectValue v-bind="forwarded" :class="props.class">
    <slot />
  </SelectValue>
</template>
