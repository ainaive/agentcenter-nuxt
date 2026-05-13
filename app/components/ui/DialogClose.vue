<script setup lang="ts">
import { DialogClose, type DialogCloseProps, useForwardProps } from "reka-ui"

const props = defineProps<DialogCloseProps & { class?: string }>()

const forwarded = useForwardProps(
  computed(() => {
    const { class: _, ...rest } = props
    return rest
  }),
)
</script>

<template>
  <DialogClose v-bind="forwarded" :class="props.class">
    <slot />
  </DialogClose>
</template>
