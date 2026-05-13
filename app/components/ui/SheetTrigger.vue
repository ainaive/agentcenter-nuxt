<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { DialogTrigger, type DialogTriggerProps, useForwardProps } from "reka-ui"

const props = defineProps<DialogTriggerProps & { class?: HTMLAttributes["class"] }>()

const forwarded = useForwardProps(
  computed(() => {
    const { class: _, ...rest } = props
    return rest
  }),
)
</script>

<template>
  <DialogTrigger v-bind="forwarded" :class="props.class">
    <slot />
  </DialogTrigger>
</template>
