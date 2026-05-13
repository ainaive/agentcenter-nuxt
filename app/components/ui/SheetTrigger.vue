<script setup lang="ts">
import { DialogTrigger, type DialogTriggerProps, useForwardProps } from "reka-ui"

const props = defineProps<DialogTriggerProps & { class?: string }>()

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
